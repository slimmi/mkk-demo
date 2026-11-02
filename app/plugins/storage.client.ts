import { COLLECTION_KEY } from "../storage/notes";
import { useNotesStore } from "../stores/notes";

export default defineNuxtPlugin(() => {
  const notes = useNotesStore();
  notes.refresh();
  window.addEventListener("storage", (event) => {
    if (event.key === COLLECTION_KEY || event.key === null) notes.refresh();
  });
});
