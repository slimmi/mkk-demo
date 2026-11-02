import { defineStore } from "pinia";
import { ref } from "vue";
import type { Note } from "../domain/notes/model";
import { copyNote } from "../domain/notes/model";
import {
  readNotes,
  savedStorage,
  type StoragePort,
  withCollectionLock,
  writeNotes,
} from "../storage/notes";

export const useNotesStore = defineStore("notes", () => {
  const notes = ref<Note[]>([]);
  const error = ref("");

  function refresh(storage: StoragePort = savedStorage) {
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
    storage: StoragePort = savedStorage,
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
    storage: StoragePort = savedStorage,
    lock = withCollectionLock,
  ) {
    await lock(() => {
      const current = readNotes(storage).filter((item) => item.id !== id);
      writeNotes(storage, current);
      notes.value = current;
    });
  }

  async function toggleTodo(
    noteId: string,
    todoId: string,
    storage: StoragePort = savedStorage,
    lock = withCollectionLock,
  ) {
    return lock(() => {
      const current = readNotes(storage);
      const todo = current
        .find((note) => note.id === noteId)
        ?.todos.find((todo) => todo.id === todoId);
      if (!todo) {
        notes.value = current;
        return false;
      }
      todo.done = !todo.done;
      writeNotes(storage, current);
      notes.value = current;
      return true;
    });
  }

  return { notes, error, refresh, save, remove, toggleTodo };
});
