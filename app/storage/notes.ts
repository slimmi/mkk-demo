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
  throw new Error(
    "Для сохранения откройте приложение через localhost или HTTPS в современном браузере.",
  );
}
