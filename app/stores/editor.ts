import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  createHistory,
  record,
  redo as redoEdit,
  undo as undoEdit,
} from "../domain/notes/history";
import { createId } from "../domain/notes/id";
import {
  applyEdit,
  copyNote,
  type Edit,
  type Field,
  fieldValue,
  normalized,
  type Note,
  setText,
  validate,
} from "../domain/notes/model";
import {
  draftKey,
  migrateRecoveryDraft,
  readDraft,
  recoveryStorage,
  type StoragePort,
  writeDraft,
} from "../storage/notes";
import { useNotesStore } from "./notes";

export const useEditorStore = defineStore("editor", () => {
  const draft = ref<Note | null>(null);
  const baseline = ref("");
  const route = ref("");
  const existing = ref(false);
  const deleted = ref(false);
  const recovery = ref<Note | null>(null);
  const history = ref(createHistory());
  const pending = ref<Extract<Edit, { kind: "text" }> | null>(null);
  const errors = ref<Record<string, string>>({});
  const error = ref("");
  let typingTimer: ReturnType<typeof setTimeout> | undefined;
  let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
  let storage: StoragePort;
  let saving = false;
  const dirty = computed(
    () => !!draft.value && JSON.stringify(draft.value) !== baseline.value,
  );
  const canUndo = computed(
    () => history.value.past.length > 0 || !!pending.value,
  );
  const canRedo = computed(() => history.value.future.length > 0);

  function flushText() {
    clearTimeout(typingTimer);
    if (pending.value) record(history.value, pending.value);
    pending.value = null;
  }

  function flushRecovery() {
    clearTimeout(recoveryTimer);
    if (!draft.value || recovery.value || saving) return;
    try {
      if (dirty.value) writeDraft(storage, route.value, draft.value);
      else storage.removeItem(draftKey(route.value));
    } catch (e) {
      console.error(e);
      error.value =
        "Не удалось записать черновик. Оставьте вкладку открытой до сохранения.";
    }
  }

  function changed() {
    clearTimeout(recoveryTimer);
    recoveryTimer = setTimeout(flushRecovery, 500);
    errors.value = {};
  }

  function open(
    id: string,
    note: Note | undefined,
    draftStorage: StoragePort = recoveryStorage,
  ) {
    clearTimeout(typingTimer);
    clearTimeout(recoveryTimer);
    storage = draftStorage;
    route.value = id;
    existing.value = id !== "new";
    deleted.value = false;
    draft.value = note
      ? copyNote(note)
      : id === "new"
        ? { id: createId(), title: "", todos: [] }
        : null;
    baseline.value = JSON.stringify(draft.value);
    history.value = createHistory();
    pending.value = null;
    errors.value = {};
    error.value = "";
    recovery.value = null;
    try {
      if (draft.value && draftStorage === recoveryStorage)
        migrateRecoveryDraft(id);
      if (draft.value) recovery.value = readDraft(storage, id);
    } catch {
      error.value = "Сохранённый черновик недоступен или повреждён.";
    }
  }

  function restore() {
    if (recovery.value) draft.value = copyNote(recovery.value);
    recovery.value = null;
    history.value = createHistory();
    changed();
  }

  function discardRecovery() {
    try {
      storage.removeItem(draftKey(route.value));
      recovery.value = null;
    } catch {
      error.value =
        "Не удалось удалить черновик. Проверьте доступ к хранилищу.";
    }
  }

  function text(field: Field, value: string) {
    if (!draft.value) return;
    if (
      pending.value &&
      JSON.stringify(pending.value.field) !== JSON.stringify(field)
    )
      flushText();
    const before = fieldValue(draft.value, field);
    if (before === value) return;
    history.value.future = [];
    if (!pending.value)
      pending.value = { kind: "text", field, before, after: value };
    else pending.value.after = value;
    setText(draft.value, field, value);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(flushText, 500);
    changed();
  }

  function edit(operation: Edit) {
    if (!draft.value) return;
    flushText();
    applyEdit(draft.value, operation);
    record(history.value, operation);
    changed();
  }

  function add() {
    const item = { id: createId(), text: "", done: false };
    edit({ kind: "insert", item, index: draft.value!.todos.length });
    return item.id;
  }

  function remove(id: string) {
    const index = draft.value!.todos.findIndex((item) => item.id === id);
    edit({ kind: "remove", item: { ...draft.value!.todos[index]! }, index });
  }

  function toggle(id: string) {
    const before = draft.value!.todos.find((item) => item.id === id)!.done;
    edit({ kind: "toggle", id, before, after: !before });
  }

  function undo() {
    flushText();
    if (draft.value) undoEdit(draft.value, history.value);
    changed();
  }

  function redo() {
    flushText();
    if (draft.value) redoEdit(draft.value, history.value);
    changed();
  }

  function reset(clearRecovery = true) {
    clearTimeout(typingTimer);
    clearTimeout(recoveryTimer);
    if (clearRecovery) storage.removeItem(draftKey(route.value));
    history.value = createHistory();
    pending.value = null;
    recovery.value = null;
    draft.value = null;
    baseline.value = "";
  }

  async function save() {
    flushText();
    if (!draft.value || deleted.value || saving) return false;
    errors.value = validate(draft.value);
    if (Object.keys(errors.value).length) return false;
    saving = true;
    clearTimeout(recoveryTimer);
    try {
      storage.removeItem(draftKey(route.value));
      const saved = await useNotesStore().save(
        normalized(draft.value),
        existing.value,
      );
      if (!saved) {
        deleted.value = true;
        return false;
      }
      reset(false);
      return true;
    } catch {
      error.value =
        "Не удалось сохранить заметку. Проверьте хранилище браузера и попробуйте ещё раз.";
      return false;
    } finally {
      saving = false;
      if (draft.value) flushRecovery();
    }
  }

  function cancel() {
    try {
      reset();
      return true;
    } catch {
      error.value = "Не удалось очистить черновик. Попробуйте ещё раз.";
      return false;
    }
  }

  function dispose() {
    flushText();
    flushRecovery();
    clearTimeout(typingTimer);
    clearTimeout(recoveryTimer);
  }

  return {
    draft,
    existing,
    deleted,
    recovery,
    history,
    errors,
    error,
    dirty,
    canUndo,
    canRedo,
    open,
    restore,
    discardRecovery,
    text,
    flushText,
    flushRecovery,
    add,
    remove,
    toggle,
    undo,
    redo,
    save,
    cancel,
    dispose,
  };
});
