import { Models } from 'appwrite';

const DB_NAME = 'food_tracker_db';
const STORE_NAME = 'user_account';
const CACHE_KEY = 'current';
const TTL_MS = 24 * 60 * 60 * 1000;

interface CachedUser {
  user: Models.User<Record<string, unknown>>;
  timestamp: number;
}

let dbPromise: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function getDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = await openDb();
  }
  return dbPromise;
}

export async function getCachedUser(): Promise<Models.User<Record<string, unknown>> | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const result = await new Promise<CachedUser | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);

      request.onsuccess = () => {
        const data = request.result as CachedUser | undefined;
        resolve(data);
      };
      request.onerror = () => reject(request.error);
    });

    if (!result) return null;

    const age = Date.now() - result.timestamp;
    if (age > TTL_MS) {
      await clearCachedUser();
      return null;
    }

    return result.user;
  } catch (error) {
    console.error('Error reading user cache:', error);
    return null;
  }
}

export async function setCachedUser(user: Models.User<Record<string, unknown>>): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const cached: CachedUser = { user, timestamp: Date.now() };
      const request = store.put(cached, CACHE_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error writing user cache:', error);
  }
}

export async function clearCachedUser(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(CACHE_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing user cache:', error);
  }
}
