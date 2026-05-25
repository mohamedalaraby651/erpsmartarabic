/**
 * Persistent font cache (Wave 18).
 *
 * Stores base64-encoded font payloads in IndexedDB so repeat exports
 * skip HTTP fetches across sessions. Fully optional — when IDB is
 * unavailable (SSR, private mode, old browsers) the helpers degrade
 * to pass-through no-ops so the caller can always fall back to the
 * in-memory cache inside `fontRegistry`.
 */
import type { PdfFontKey } from '@/lib/arabicFont';

const DB_NAME = 'pdf-font-cache';
const STORE = 'fonts';
const DB_VERSION = 1;
/** Soft TTL: 30 days. Older entries are evicted on read. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CachedFont {
  key: PdfFontKey;
  base64: string;
  storedAt: number;
}

function hasIdb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T | null> {
  if (!hasIdb()) return null;
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const out = fn(store);
      if (out instanceof IDBRequest) {
        out.onsuccess = () => resolve(out.result as T);
        out.onerror = () => reject(out.error);
      } else {
        Promise.resolve(out).then(resolve, reject);
      }
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return null;
  }
}

export async function getCachedFont(key: PdfFontKey): Promise<string | null> {
  const entry = await withStore<CachedFont>('readonly', (s) => s.get(key) as IDBRequest<CachedFont>);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > TTL_MS) {
    void deleteCachedFont(key);
    return null;
  }
  return entry.base64;
}

export async function putCachedFont(key: PdfFontKey, base64: string): Promise<void> {
  if (!base64) return;
  const entry: CachedFont = { key, base64, storedAt: Date.now() };
  await withStore('readwrite', (s) => s.put(entry));
}

export async function deleteCachedFont(key: PdfFontKey): Promise<void> {
  await withStore('readwrite', (s) => s.delete(key));
}

export async function clearFontDiskCache(): Promise<void> {
  await withStore('readwrite', (s) => s.clear());
}
