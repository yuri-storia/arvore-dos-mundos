/**
 * Tiny IndexedDB cache for the raw `.aff` and `.dic` text. Avoids re-downloading
 * the ~5 MB dictionary on every reload. We cache the *raw text* (not the parsed
 * typo-js tables) because typo-js' internal structures are not portable.
 */
const DB = 'adm-spell';
const STORE = 'dict';
const KEY = 'pt-br/v1';

interface CachedDict { aff: string; dic: string; savedAt: number; }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedDict(): Promise<CachedDict | null> {
  try {
    const db = await open();
    return await new Promise<CachedDict | null>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as CachedDict) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function putCachedDict(value: CachedDict): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* ignore */ }
}
