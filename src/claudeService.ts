import Anthropic from '@anthropic-ai/sdk';

const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true // Allow usage in browser (for development/demo purposes)
});

export interface FatLossInfo {
  caloricDensity: string;
  notes: string;
}

export interface MuscleBuildingInfo {
  proteinQuality: string;
  notes: string;
}

export interface NutritionInfo {
  vitamins: string[];
  minerals: string[];
  benefits: string[];
  fatLoss: FatLossInfo;
  muscleBuilding: MuscleBuildingInfo;
  dailyIntake: string;
  notes: string;
}

// localStorage-based cache for nutrition info
// Key format: "nutrition_cache_foodName_grams" (e.g., "nutrition_cache_apple_100")
const CACHE_PREFIX = 'nutrition_cache_';

/**
 * Generate cache key from food name and grams
 */
function getCacheKey(foodName: string, grams: number): string {
  return `${CACHE_PREFIX}${foodName.toLowerCase().trim()}_${grams}`;
}

/**
 * Get cached nutrition info if available
 */
function getCachedNutrition(foodName: string, grams: number): NutritionInfo | null {
  try {
    const key = getCacheKey(foodName, grams);
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached) as NutritionInfo;
    }
    return null;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Store nutrition info in cache
 */
function cacheNutrition(foodName: string, grams: number, info: NutritionInfo): void {
  try {
    const key = getCacheKey(foodName, grams);
    localStorage.setItem(key, JSON.stringify(info));
    const stats = getCacheStats();
    console.log(`Cached nutrition info for: ${key} (total cached: ${stats.size})`);
  } catch (error) {
    console.error('Error writing to cache:', error);
    // If localStorage is full, try to clear some space
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old cache entries');
      clearNutritionCache();
    }
  }
}

/**
 * Get detailed nutritional information for a food item using Claude AI
 * Uses localStorage cache to avoid repeated API calls for the same food/amount
 * @param foodName - The name of the food item
 * @returns Promise with nutritional information
 */
export async function getNutritionInfo(foodName: string): Promise<NutritionInfo> {
  // Check cache first
  const cached = getCachedNutrition(foodName, 100);
  if (cached) {
    console.log(`Using cached nutrition info for: ${foodName} (100g)`);
    return cached;
  }

  console.log(`Fetching nutrition info from AI for: ${foodName} (100g)`);
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [
        {
          name: 'submit_nutrition_info',
          description: 'Submit structured nutritional information for a food item.',
          input_schema: {
            type: 'object',
            properties: {
              vitamins: {
                type: 'array',
                items: { type: 'string' },
                description: 'Only vitamins present in significant amounts, formatted as "Vitamina X: descrição"'
              },
              minerals: {
                type: 'array',
                items: { type: 'string' },
                description: 'Only minerals present in significant amounts, formatted as "Mineral: descrição"'
              },
              benefits: {
                type: 'array',
                items: { type: 'string' },
                description: 'Main health benefits'
              },
              fatLoss: {
                type: 'object',
                properties: {
                  caloricDensity: { type: 'string', enum: ['baixa', 'média', 'alta'] },
                  notes: { type: 'string' }
                },
                required: ['caloricDensity', 'notes']
              },
              muscleBuilding: {
                type: 'object',
                properties: {
                  proteinQuality: { type: 'string' },
                  notes: { type: 'string' }
                },
                required: ['proteinQuality', 'notes']
              },
              dailyIntake: {
                type: 'string',
                description: 'Contextualization of how this 100g portion contributes to typical daily needs'
              },
              notes: {
                type: 'string',
                description: 'Additional important information'
              }
            },
            required: ['vitamins', 'minerals', 'benefits', 'fatLoss', 'muscleBuilding', 'dailyIntake', 'notes']
          }
        }
      ],
      tool_choice: { type: 'tool', name: 'submit_nutrition_info' },
      messages: [
        {
          role: 'user',
          content: `Provide detailed nutritional information for 100g of ${foodName}.

IMPORTANT: Respond in Brazilian Portuguese (pt-BR) — all string values in the tool call must be in pt-BR.

Focus on:
1. Key vitamins (e.g., A, B complex, C, D, E, K) — only significant amounts
2. Important minerals (e.g., iron, calcium, magnesium, zinc, potassium) — only significant amounts
3. Main health benefits
4. Fat loss considerations: satiety level, calorie density, whether it fits well in a caloric deficit, and any tips for portion control
5. Muscle building considerations: protein quality/completeness, leucine content if relevant, best pairing, and how it supports muscle protein synthesis
6. Daily recommended intake context: how much of an adult's typical daily needs a 100g portion covers, based on general adult reference values
7. Any important notes or considerations (allergens, preparation tips, moderation warnings, etc.)

Do not include amount of fats, carbs, or proteins in grams — no need. Be concise but informative.`
        }
      ]
    });

    console.log(`stop_reason=${message.stop_reason}`);
    if (message.stop_reason === 'max_tokens') {
      console.warn(`Response truncated for "${foodName}" — hit max_tokens limit`);
    }

    // With tool_choice forcing a specific tool, the tool_use block is guaranteed
    const toolUseBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUseBlock) {
      throw new Error('No tool_use block in response');
    }

    const nutritionInfo: NutritionInfo = toolUseBlock.input as NutritionInfo;

    // Cache the result for future use
    cacheNutrition(foodName, 100, nutritionInfo);

    return nutritionInfo;

  } catch (error) {
    console.error('Error getting nutrition info from Claude:', error);
    throw new Error('Failed to get nutrition information. Please try again.');
  }
}

/**
 * Clear the nutrition info cache
 * Removes all cached nutrition data from localStorage
 */
export function clearNutritionCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared nutrition cache (${keys.length} entries removed)`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache statistics including size and storage usage
 */
export function getCacheStats(): { size: number; keys: string[]; sizeInBytes: number; sizeInKB: number } {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));

    // Calculate total size in bytes
    let totalBytes = 0;
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        // Each character in localStorage is stored as UTF-16, which is 2 bytes per character
        totalBytes += (key.length + value.length) * 2;
      }
    });

    return {
      size: keys.length,
      keys: keys.map(k => k.replace(CACHE_PREFIX, '')),
      sizeInBytes: totalBytes,
      sizeInKB: Math.round(totalBytes / 1024 * 100) / 100
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { size: 0, keys: [], sizeInBytes: 0, sizeInKB: 0 };
  }
}
