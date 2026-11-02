<script setup lang="ts">
import type { Todo } from "~/domain/notes/model.ts";

const props = defineProps<{ todo: Todo; index: number; error?: string }>();
const emit = defineEmits<{
  text: [value: string];
  toggle: [];
  remove: [];
  blur: [];
  add: [];
  navigate: [offset: -1 | 1];
}>();
const name = computed(
  () => props.todo.text.trim() || `Задача ${props.index + 1}`,
);
const input = useTemplateRef("input");

function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  if (
    (event.key === "ArrowUp" || event.key === "ArrowDown") &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey
  ) {
    event.preventDefault();
    emit("navigate", event.key === "ArrowUp" ? -1 : 1);
    return;
  }
  if (
    event.key !== "Enter" ||
    !event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey ||
    event.repeat
  )
    return;
  event.preventDefault();
  if (!props.todo.text.trim()) return;
  emit("add");
}

function resize() {
  const field = input.value;
  if (field) {
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }
}

onMounted(resize);
watch(
  () => props.todo.text,
  () => nextTick(resize),
);
</script>

<template>
  <li class="todo-row">
    <div class="todo-controls">
      <label class="checkbox-target"
        ><input
          type="checkbox"
          :checked="todo.done"
          :aria-label="`Выполнено: ${name}`"
          @change="emit('toggle')"
      /></label>
      <div class="todo-text">
        <div class="todo-input">
          <label :for="`todo-${todo.id}`" class="sr-only"
            >Текст задачи {{ index + 1 }}</label
          ><textarea
            :id="`todo-${todo.id}`"
            ref="input"
            :value="todo.text"
            rows="1"
            :name="`todo-${todo.id}`"
            autocomplete="off"
            placeholder="Что нужно сделать?"
            :aria-invalid="!!error"
            :aria-describedby="
              error ? `error-${todo.id} hint-${todo.id}` : `hint-${todo.id}`
            "
            aria-keyshortcuts="Control+Enter ArrowUp ArrowDown"
            @keydown="handleKeydown"
            @input="emit('text', ($event.target as HTMLTextAreaElement).value)"
            @blur="emit('blur')"
          />
          <p :id="`hint-${todo.id}`" class="muted add-task-hint">
            Ctrl + Enter — новая задача. ↑ ↓ — переход между задачами.
          </p>
        </div>
        <p v-if="error" :id="`error-${todo.id}`" class="field-error">
          {{ error }}
        </p>
      </div>
      <button
        type="button"
        class="remove-todo"
        :aria-label="`Удалить задачу: ${name}`"
        @click="emit('remove')"
      >
        ×
      </button>
    </div>
  </li>
</template>

<style scoped lang="scss">
@use "~/assets/scss/breakpoints";

textarea {
  background: transparent;
  border: 0;
  border-radius: var(--radius-small);
  color: var(--color-text);
  font-size: var(--font-size-body);
  line-height: 1.5;
  min-width: 0;
  padding: var(--space-8);
  resize: vertical;
  width: 100%;

  &::placeholder {
    color: var(--color-placeholder);
    opacity: 1;
  }
}

.todo-controls {
  align-items: flex-start;
  border-bottom: 1px solid var(--color-todo-border);
  display: flex;
  gap: var(--space-4);
  padding: var(--space-6) 0;
}

.checkbox-target {
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  min-height: var(--control-size);
  width: var(--control-size);

  input {
    accent-color: var(--color-accent);
    cursor: pointer;
    height: var(--checkbox-size);
    width: var(--checkbox-size);
  }
}

.todo-text {
  flex: 1;
  min-width: 0;

  textarea {
    display: block;
    min-height: var(--control-size);
    overflow: hidden;
    resize: none;
  }
}

.remove-todo {
  background: transparent;
  border: 0;
  border-radius: var(--radius-field);
  color: var(--color-muted);
  flex-shrink: 0;
  font-size: 1.5rem;
  min-height: var(--control-size);
  width: var(--control-size);

  &:hover {
    background: var(--color-danger-hover);
    color: var(--color-error);
  }
}

.todo-input {
  position: relative;

  textarea {
    &:focus {
      + .add-task-hint {
        visibility: visible;
      }
    }
  }
}

.add-task-hint {
  background: var(--color-surface);
  bottom: calc(-1 * var(--space-2));
  font-size: var(--font-size-hint);
  left: 0;
  line-height: var(--line-height-control);
  padding: var(--space-4);
  pointer-events: none;
  position: absolute;
  right: 8px;
  transform: translateY(100%);
  visibility: hidden;
}

@media (width <= breakpoints.$mobile), (hover: none) and (pointer: coarse) {
  .add-task-hint {
    display: none;
  }
}
</style>
