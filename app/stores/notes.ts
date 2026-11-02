import { defineStore } from "pinia";
import { ref } from "vue";
import type { Note } from "../domain/notes/model";
import { copyNote } from "../domain/notes/model";
import {
  readNotes,
  writeNotes,
  withCollectionLock,
  type StoragePort,
} from "../storage/notes";
export const useNotesStore = defineStore("notes", () => {
  const notes = ref<Note[]>([]);
  const error = ref("");
  function refresh(storage: StoragePort = localStorage) {
    try {
      notes.value = readNotes(storage);
      error.value = "";
      return true;
    } catch {
      error.value =
        "Не удалось прочитать заметки. Проверьте доступ к хранилищу браузера.";
      return false;
    }
  }
  async function save(
    note: Note,
    existing: boolean,
    storage: StoragePort = localStorage,
    lock = withCollectionLock,
  ) {
    return lock(() => {
      const current = readNotes(storage);
      const index = current.findIndex((item) => item.id === note.id);
      if (existing && index < 0) return false;
      if (index < 0) current.push(copyNote(note));
      else current[index] = copyNote(note);
      writeNotes(storage, current);
      notes.value = current;
      return true;
    });
  }
  async function remove(
    id: string,
    storage: StoragePort = localStorage,
    lock = withCollectionLock,
  ) {
    await lock(() => {
      const current = readNotes(storage).filter((item) => item.id !== id);
      writeNotes(storage, current);
      notes.value = current;
    });
  }
  return { notes, error, refresh, save, remove };
});
