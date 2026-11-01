import { functions, NUTRITION_FUNCTION_ID } from './appwrite';

// Nutrition info comes from the `nutrition-info` Appwrite Function (functions/nutrition-info),
// which holds the Anthropic API key and a cache shared by all users.
// The browser never talks to the Anthropic API directly.

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
    const execution = await functions.createExecution({
      functionId: NUTRITION_FUNCTION_ID,
      body: JSON.stringify({ foodName }),
      async: false,
    });

    const payload = JSON.parse(execution.responseBody || '{}') as
      { ok: true; cached: boolean; data: NutritionInfo } | { ok: false; message: string };

    if (execution.responseStatusCode !== 200 || !payload.ok) {
      const reason = payload.ok ? `status ${execution.responseStatusCode}` : payload.message;
      throw new Error(`nutrition-info function failed: ${reason}`);
    }

    console.debug(`Nutrition info for "${foodName}" (shared cache hit: ${payload.cached})`);
    cacheNutrition(foodName, 100, payload.data);
    return payload.data;
  } catch (error) {
    console.error('Error getting nutrition info:', error);
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
