<script setup lang="ts">
import { useEditorLifecycle } from "~/composables/useEditorLifecycle.ts";
import { useEditorStore } from "~/stores/editor.ts";
import { useNotesStore } from "~/stores/notes.ts";

const route = useRoute();
const notes = useNotesStore();
const editor = useEditorStore();
const id = String(route.params.id);
editor.open(
  id,
  notes.notes.find((note) => note.id === id),
);
const missingNote = !editor.draft;
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

function requestLeave() {
  editor.flushText();
  if (editor.dirty) {
    dialog.value = "leave";
    return;
  }
  return leave();
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

function focusTodo(index: number) {
  const todo = editor.draft?.todos[index];
  if (!todo) return;
  const field = document.getElementById(`todo-${todo.id}`);
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
            Восстановить
          </button>
          <button class="button" type="button" @click="editor.discardRecovery">
            Отменить
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
            <input
              id="note-title"
              class="title-input"
              name="title"
              type="text"
              autocomplete="off"
              placeholder="О чём эта заметка?"
              autofocus
              :value="editor.draft.title"
              :aria-invalid="!!editor.errors.title"
              :aria-describedby="
                editor.errors.title ? 'title-error' : undefined
              "
              @input="
                editor.text(
                  { kind: 'title' },
                  ($event.target as HTMLInputElement).value,
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
                @add="add"
                @navigate="focusTodo(index + $event)"
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
              ↶ Отменить шаг
            </button>
            <button
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
              {{ busy ? "Сохранение…" : "Сохранить" }}
            </button>
            <button
              class="button button-quiet"
              type="button"
              @click="requestLeave"
            >
              Выйти без сохранения
            </button>
            <button
              v-if="editor.existing"
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
        title="Восстановить черновик?"
        description="Здесь остались несохранённые изменения. Вы можете продолжить редактирование с того же места."
        confirm="Восстановить"
        safe="Отбросить черновик"
        @escape="recoveryPrompt = false"
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
        safe="Продолжить"
        @dismiss="dismiss"
        @confirm="dialog === 'delete' ? remove() : leave()"
      />
    </template>
    <div v-else-if="missingNote" class="empty-state">
      <h1>Заметка не найдена</h1>
      <p>Возможно, её уже удалили или в адресе есть ошибка.</p>
      <NuxtLink to="/" class="button button-primary"
        >Вернуться к заметкам
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "~/assets/scss/breakpoints";

.todo-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.editor {
  max-width: var(--editor-width);
}

.back-link {
  align-items: center;
  display: inline-flex;
  margin-bottom: var(--space-24);
  min-height: var(--control-size);
}

.editor-heading {
  margin-bottom: var(--space-24);

  h1 {
    font-family: inherit;
    font-size: var(--font-size-body);
    font-weight: 600;
    letter-spacing: 0;
    margin-bottom: var(--space-4);
  }
}

.draft-status {
  font-size: var(--font-size-small);
}

.editor-paper {
  background: var(--color-surface);
  border: var(--border-default);
  border-radius: var(--radius-field);
  border-top: 3px solid var(--color-accent);
  padding: var(--space-28);
}

.field-label {
  color: var(--color-muted);
  display: block;
  font-size: var(--font-size-small);
  margin-bottom: var(--space-8);
}

.title-input {
  border: none;
  border-radius: var(--radius-small);
  font-family: var(--font-heading);
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  line-height: 1.3;
  padding: 0 var(--space-4);
  width: 100%;
}

.list-heading {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-12);
  justify-content: space-between;
  margin: var(--space-32) 0 var(--space-16);

  h2 {
    font: inherit;
    font-weight: 600;
  }

  span {
    font-size: var(--font-size-small);
  }
}

.add-todo {
  margin-top: var(--space-12);
}

.history-actions,
.save-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-12);
  justify-content: space-between;
}

.history-actions {
  margin: var(--space-24) 0;
}

.save-actions {
  border-top: var(--border-default);
  padding-top: var(--space-24);

  > .button-danger {
    margin-inline-start: auto;
  }
}

@media (width <= breakpoints.$mobile) {
  .editor-paper {
    padding: var(--space-20) var(--space-12);
  }

  .save-actions {
    > .button {
      width: 100%;
    }

    > .button-danger {
      width: auto;
    }
  }
}

.editor-fieldset {
  border: 0;
  margin: 0;
  min-width: 0;
  padding: 0;
}
</style>
