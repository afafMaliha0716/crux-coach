import type { Frame } from "./lib/types";

/**
 * Remembers analyzed clips in this browser (IndexedDB), so a clip that has been
 * analyzed once opens instantly next time. The video and its pose frames stay on
 * this device. Nothing is uploaded.
 */
export interface SavedClip {
  key: string;
  name: string;
  file: Blob;
  frames: Frame[];
  width: number;
  height: number;
  trimmed: boolean;
  savedAt: number;
}

const DB = "crux-clips";
const STORE = "clips";

export const clipKey = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

/** Every function below fails quietly: saving clips is a convenience, never a requirement. */
export async function listSavedClips(): Promise<SavedClip[]> {
  try {
    const all = await run<SavedClip[]>("readonly", (s) => s.getAll());
    return all.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function getSavedClip(key: string): Promise<SavedClip | undefined> {
  try {
    return await run<SavedClip | undefined>("readonly", (s) => s.get(key));
  } catch {
    return undefined;
  }
}

export async function saveClipForLater(clip: SavedClip): Promise<void> {
  try {
    await run("readwrite", (s) => s.put(clip));
  } catch {
    /* storage full or unavailable */
  }
}

export async function removeSavedClip(key: string): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(key));
  } catch {
    /* ignore */
  }
}
