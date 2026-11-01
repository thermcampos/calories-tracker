import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { AppwriteException, Client, TablesDB } from 'node-appwrite';

// Generated from src/foodDatabase.ts by scripts/package-function.sh.
// Only foods the app knows about can be looked up, so the function can't be
// used as a general-purpose proxy for the Anthropic API key.
const FOOD_NAMES = new Set(
  JSON.parse(readFileSync(new URL('./foodNames.json', import.meta.url), 'utf8'))
);

const MODEL = 'claude-haiku-5-5';

const NUTRITION_SCHEMA = {
  type: 'object',
  properties: {
    vitamins: {
      type: 'array',
      items: { type: 'string' },
      description: 'Only vitamins present in significant amounts, formatted as "Vitamina X: descrição"',
    },
    minerals: {
      type: 'array',
      items: { type: 'string' },
      description: 'Only minerals present in significant amounts, formatted as "Mineral: descrição"',
    },
    benefits: {
      type: 'array',
      items: { type: 'string' },
      description: 'Main health benefits',
    },
    fatLoss: {
      type: 'object',
      properties: {
        caloricDensity: { type: 'string', enum: ['baixa', 'média', 'alta'] },
        notes: { type: 'string' },
      },
      required: ['caloricDensity', 'notes'],
      additionalProperties: false,
    },
    muscleBuilding: {
      type: 'object',
      properties: {
        proteinQuality: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['proteinQuality', 'notes'],
      additionalProperties: false,
    },
    dailyIntake: {
      type: 'string',
      description: 'Contextualization of how this 100g portion contributes to typical daily needs',
    },
    notes: {
      type: 'string',
      description: 'Additional important information',
    },
  },
  required: ['vitamins', 'minerals', 'benefits', 'fatLoss', 'muscleBuilding', 'dailyIntake', 'notes'],
  additionalProperties: false,
};

const buildPrompt = (foodName) => `Provide detailed nutritional information for 100g of ${foodName}.

IMPORTANT: Respond in Brazilian Portuguese (pt-BR) — all string values must be in pt-BR.

Focus on:
1. Key vitamins (e.g., A, B complex, C, D, E, K) — only significant amounts
2. Important minerals (e.g., iron, calcium, magnesium, zinc, potassium) — only significant amounts
3. Main health benefits
4. Fat loss considerations: satiety level, calorie density, whether it fits well in a caloric deficit, and any tips for portion control
5. Muscle building considerations: protein quality/completeness, leucine content if relevant, best pairing, and how it supports muscle protein synthesis
6. Daily recommended intake context: how much of an adult's typical daily needs a 100g portion covers, based on general adult reference values
7. Any important notes or considerations (allergens, preparation tips, moderation warnings, etc.)

Do not include amount of fats, carbs, or proteins in grams — no need. Be concise but informative.`;

// Appwrite IDs: max 36 chars of [a-zA-Z0-9._-]. A hash gives a stable ID per food,
// so lookups are a single getRow and concurrent writers collide instead of duplicating.
const cacheRowId = (foodName) =>
  crypto.createHash('sha256').update(foodName).digest('hex').slice(0, 36);

function readBody(req) {
  if (req.bodyJson && typeof req.bodyJson === 'object') return req.bodyJson;
  try {
    return JSON.parse(req.bodyText || req.body || '{}');
  } catch {
    return {};
  }
}

async function askClaude(foodName) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: MODEL,
    // Haiku 5.5 thinks by default and thinking counts toward max_tokens
    max_tokens: 8000,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: NUTRITION_SCHEMA },
    },
    messages: [{ role: 'user', content: buildPrompt(foodName) }],
  });

  if (message.stop_reason === 'refusal') {
    const err = new Error(`Model declined (${message.stop_details?.category ?? 'unknown'})`);
    err.refusal = true;
    throw err;
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('Response truncated (max_tokens)');
  }

  const text = message.content.find((block) => block.type === 'text');
  if (!text) throw new Error('No text block in response');
  return JSON.parse(text.text);
}

export default async ({ req, res, log, error }) => {
  // Set by Appwrite only when a logged-in user triggers the execution
  const userId = req.headers['x-appwrite-user-id'];
  if (!userId) {
    return res.json({ ok: false, message: 'Authentication required' }, 401);
  }

  const { foodName } = readBody(req);
  if (typeof foodName !== 'string' || !FOOD_NAMES.has(foodName)) {
    return res.json({ ok: false, message: 'Unknown food' }, 400);
  }

  const missing = ['ANTHROPIC_API_KEY', 'APPWRITE_DB_ID', 'APPWRITE_NUTRITION_CACHE_ID']
    .filter((name) => !process.env[name]);
  if (missing.length > 0) {
    error(`Missing function variables: ${missing.join(', ')}`);
    return res.json({ ok: false, message: 'Function is not configured' }, 500);
  }

  const apiKey = req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY;
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(apiKey);
  const tables = new TablesDB(client);
  const databaseId = process.env.APPWRITE_DB_ID;
  const tableId = process.env.APPWRITE_NUTRITION_CACHE_ID;
  const rowId = cacheRowId(foodName);

  // 1. Shared cache
  try {
    const row = await tables.getRow({ databaseId, tableId, rowId });
    return res.json({ ok: true, cached: true, data: JSON.parse(row.data) });
  } catch (err) {
    if (!(err instanceof AppwriteException && err.code === 404)) {
      // Cache trouble shouldn't block the feature: log and fall through to Claude
      error(`Cache read failed for "${foodName}": ${err.message}`);
    }
  }

  // 2. Claude
  let data;
  try {
    data = await askClaude(foodName);
  } catch (err) {
    error(`Claude call failed for "${foodName}": ${err.message}`);
    // Never forward the Anthropic status (a 401 there is our key, not the user's session)
    return res.json({ ok: false, message: 'Failed to get nutrition information' }, err.refusal ? 422 : 502);
  }

  // 3. Store for every user
  try {
    await tables.createRow({
      databaseId,
      tableId,
      rowId,
      data: { foodName, model: MODEL, data: JSON.stringify(data) },
    });
    log(`Cached nutrition info for "${foodName}"`);
  } catch (err) {
    // 409: another execution cached the same food first — fine
    if (!(err instanceof AppwriteException && err.code === 409)) {
      error(`Cache write failed for "${foodName}": ${err.message}`);
    }
  }

  return res.json({ ok: true, cached: false, data });
};
