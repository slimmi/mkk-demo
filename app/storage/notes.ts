import type { Note } from "../domain/notes/model";

export const COLLECTION_KEY = "notebook:notes:v1";
export const draftKey = (route: string) => `notebook:draft:v1:${route}`;

export interface StoragePort {
  getItem(key: string): string | null;

  setItem(key: string, value: string): void;

  removeItem(key: string): void;
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const note = value as Note;
  return (
    typeof note.id === "string" &&
    typeof note.title === "string" &&
    Array.isArray(note.todos) &&
    note.todos.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        typeof item.done === "boolean",
    ) &&
    new Set(note.todos.map((item) => item.id)).size === note.todos.length
  );
}

export function readNotes(storage: StoragePort): Note[] {
  const raw = storage.getItem(COLLECTION_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.notes) ||
    !data.notes.every(isNote) ||
    new Set(data.notes.map((note: Note) => note.id)).size !== data.notes.length
  )
    throw new Error("Invalid storage");
  return data.notes;
}

export function readDraft(storage: StoragePort, route: string): Note | null {
  const raw = storage.getItem(draftKey(route));
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (data.schemaVersion !== 1 || !isNote(data.note))
    throw new Error("Invalid draft");
  return data.note;
}

export function writeNotes(storage: StoragePort, notes: Note[]) {
  storage.setItem(COLLECTION_KEY, JSON.stringify({ schemaVersion: 1, notes }));
}

export function writeDraft(storage: StoragePort, route: string, note: Note) {
  storage.setItem(draftKey(route), JSON.stringify({ schemaVersion: 1, note }));
}

export async function withCollectionLock<T>(action: () => T): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request("notebook:collection", action);
  return new Promise<T>((resolve, reject) => {
    const request = indexedDB.open("notebook:coordination", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("collection");
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      // Readwrite transactions serialize the localStorage mutation across tabs.
      const transaction = database.transaction("collection", "readwrite");
      let result: T;
      let actionError: unknown;
      transaction.oncomplete = () => {
        database.close();
        resolve(result);
      };
      transaction.onabort = () => {
        database.close();
        reject(actionError ?? transaction.error);
      };
      transaction.objectStore("collection").get("lock").onsuccess = () => {
        try {
          result = action();
        } catch (error) {
          actionError = error;
          transaction.abort();
        }
      };
    };
  });
}

function browserStorage(area: "localStorage" | "sessionStorage"): StoragePort {
  return {
    getItem: (key) => globalThis[area].getItem(key),
    setItem: (key, value) => globalThis[area].setItem(key, value),
    removeItem: (key) => globalThis[area].removeItem(key),
  };
}

export const savedStorage = browserStorage("localStorage");
export const recoveryStorage = savedStorage;

export function migrateRecoveryDraft(route: string) {
  let legacyStorage: StoragePort;
  try {
    legacyStorage = globalThis.sessionStorage;
    if (!legacyStorage.getItem(draftKey(route))) return;
  } catch {
    return;
  }
  if (!recoveryStorage.getItem(draftKey(route))) {
    const legacyDraft = readDraft(legacyStorage, route);
    if (legacyDraft) writeDraft(recoveryStorage, route, legacyDraft);
  }
  legacyStorage.removeItem(draftKey(route));
}
