<script setup lang="ts">
import { useNotesStore } from "../../stores/notes";
import { useEditorLifecycle } from "../../composables/useEditorLifecycle";
import { useEditorStore } from "../../stores/editor";
const route = useRoute();
const notes = useNotesStore();
const editor = useEditorStore();
const id = String(route.params.id);
editor.open(
  id,
  notes.notes.find((note) => note.id === id),
);
const dialog = ref<"leave" | "delete" | null>(null);
const recoveryPrompt = ref(true);
const leaving = ref(false);
const busy = ref(false);
let resolveLeave: ((value: boolean) => void) | undefined;
watch(
  () => notes.notes,
  () => {
    if (
      editor.existing &&
      !notes.error &&
      !notes.notes.some((note) => note.id === id)
    )
      editor.deleted = true;
  },
);
useEditorLifecycle(
  () => !!dialog.value || (!!editor.recovery && recoveryPrompt.value),
);
onBeforeRouteLeave(() => {
  if (leaving.value || !editor.dirty) return true;
  editor.flushText();
  dialog.value = "leave";
  return new Promise<boolean>((resolve) => {
    resolveLeave = resolve;
  });
});
function dismiss() {
  dialog.value = null;
  resolveLeave?.(false);
  resolveLeave = undefined;
}
async function leave() {
  if (!editor.cancel()) {
    dismiss();
    return;
  }
  leaving.value = true;
  dialog.value = null;
  if (resolveLeave) {
    resolveLeave(true);
    resolveLeave = undefined;
  } else await navigateTo("/");
}
async function save() {
  if (busy.value) return;
  busy.value = true;
  const saved = await editor.save();
  busy.value = false;
  if (saved) {
    leaving.value = true;
    await navigateTo("/");
  } else {
    await nextTick();
    const invalid = document.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    invalid?.focus();
    invalid?.scrollIntoView({ block: "center" });
  }
}
async function remove() {
  try {
    await notes.remove(id);
    await leave();
  } catch {
    dialog.value = null;
    editor.error = "Не удалось удалить заметку. Попробуйте ещё раз.";
  }
}
async function add() {
  const itemId = editor.add();
  await nextTick();
  const field = document.getElementById(`todo-${itemId}`);
  field?.focus();
  field?.scrollIntoView({ block: "nearest" });
}
async function removeTodo(itemId: string) {
  const index = editor.draft!.todos.findIndex((item) => item.id === itemId);
  editor.remove(itemId);
  await nextTick();
  const next = editor.draft!.todos[index] || editor.draft!.todos[index - 1];
  document.getElementById(next ? `todo-${next.id}` : "add-todo")?.focus();
}
</script>
<template>
  <section class="editor container">
    <NuxtLink to="/" class="back-link">‹ Все заметки</NuxtLink>
    <template v-if="editor.draft">
      <div class="editor-heading">
        <h1>
          {{ editor.existing ? "Редактирование заметки" : "Новая заметка" }}
        </h1>
        <span class="muted draft-status">{{
          editor.dirty ? "Есть несохранённые изменения" : "Можно редактировать"
        }}</span>
      </div>
      <p v-if="editor.deleted" role="alert" class="message">
        Эта заметка удалена в другой вкладке. Сохранение недоступно. Текст
        остаётся здесь, чтобы вы могли его скопировать.
      </p>
      <p v-if="editor.error" role="alert" class="message error-message">
        {{ editor.error }}
      </p>
      <div v-if="editor.recovery && !recoveryPrompt" class="message">
        <p>Есть несохранённый черновик. Выберите, с какой версии продолжить.</p>
        <div class="actions">
          <button
            class="button button-primary"
            type="button"
            @click="editor.restore"
          >
            Восстановить</button
          ><button class="button" type="button" @click="editor.discardRecovery">
            Отбросить черновик
          </button>
        </div>
      </div>
      <form @submit.prevent="save">
        <p
          v-if="Object.keys(editor.errors).length"
          role="alert"
          class="sr-only"
        >
          Проверьте отмеченные поля.
        </p>
        <fieldset :disabled="busy || !!editor.recovery" class="editor-fieldset">
          <div class="editor-paper">
            <label class="field-label" for="note-title">Название заметки</label>
            <textarea
              id="note-title"
              class="title-input"
              name="title"
              rows="2"
              autocomplete="off"
              placeholder="О чём эта заметка?"
              :value="editor.draft.title"
              :aria-invalid="!!editor.errors.title"
              :aria-describedby="
                editor.errors.title ? 'title-error' : undefined
              "
              @input="
                editor.text(
                  { kind: 'title' },
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
              @blur="editor.flushText"
            />
            <p v-if="editor.errors.title" id="title-error" class="field-error">
              {{ editor.errors.title }}
            </p>
            <div class="list-heading">
              <h2>Задачи</h2>
              <span class="muted"
                >{{ editor.draft.todos.filter((todo) => todo.done).length }} из
                {{ editor.draft.todos.length }} выполнено</span
              >
            </div>
            <p v-if="!editor.draft.todos.length" class="muted">
              Добавьте задачи или сохраните только название.
            </p>
            <ul class="todo-list">
              <NotesTodoRow
                v-for="(todo, index) in editor.draft.todos"
                :key="todo.id"
                :todo="todo"
                :index="index"
                :error="editor.errors[todo.id]"
                @text="editor.text({ kind: 'todo', id: todo.id }, $event)"
                @toggle="editor.toggle(todo.id)"
                @remove="removeTodo(todo.id)"
                @blur="editor.flushText"
              />
            </ul>
            <button
              id="add-todo"
              class="button button-link add-todo"
              type="button"
              @click="add"
            >
              ＋ Добавить задачу
            </button>
          </div>
          <div
            class="history-actions"
            role="group"
            aria-label="История изменений"
          >
            <button
              class="button"
              type="button"
              :disabled="!editor.canUndo"
              @click="editor.undo"
            >
              ↶ Отменить шаг</button
            ><button
              class="button"
              type="button"
              :disabled="!editor.canRedo"
              @click="editor.redo"
            >
              ↷ Повторить шаг
            </button>
          </div>
          <div class="save-actions">
            <button
              class="button button-primary"
              type="submit"
              :disabled="editor.deleted || busy"
            >
              {{ busy ? "Сохранение…" : "Сохранить" }}</button
            ><button
              class="button button-quiet"
              type="button"
              @click="dialog = 'leave'"
            >
              Выйти без сохранения
            </button>
          </div>
          <div v-if="editor.existing" class="danger-zone">
            <button
              class="button button-danger"
              type="button"
              @click="dialog = 'delete'"
            >
              Удалить заметку
            </button>
          </div>
        </fieldset>
      </form>
      <UiConfirmDialog
        v-if="editor.recovery && recoveryPrompt"
        preserve-on-escape
        @escape="recoveryPrompt = false"
        title="Восстановить черновик?"
        description="Здесь остались несохранённые изменения. Вы можете продолжить редактирование с того же места."
        confirm="Восстановить"
        safe="Отбросить черновик"
        @confirm="editor.restore"
        @dismiss="editor.discardRecovery"
      />
      <UiConfirmDialog
        v-else-if="dialog"
        :title="
          dialog === 'delete' ? 'Удалить заметку?' : 'Выйти без сохранения?'
        "
        :description="
          dialog === 'delete'
            ? 'Заметка и все её задачи будут удалены. Вернуть их не получится.'
            : 'Изменения в этой сессии будут потеряны.'
        "
        :confirm="dialog === 'delete' ? 'Удалить' : 'Выйти без сохранения'"
        safe="Продолжить редактирование"
        @dismiss="dismiss"
        @confirm="dialog === 'delete' ? remove() : leave()"
      />
    </template>
    <div v-else class="empty-state">
      <h1>Заметка не найдена</h1>
      <p>Возможно, её уже удалили или в адресе есть ошибка.</p>
      <NuxtLink to="/" class="button button-primary"
        >Вернуться к заметкам</NuxtLink
      >
    </div>
  </section>
</template>
