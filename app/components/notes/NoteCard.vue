<script lang="ts" setup>
import type { Note } from "~/domain/notes/model.ts";

defineProps<{ note: Note }>();
const emit = defineEmits<{ delete: [id: string]; toggle: [id: string] }>();

function toggleTodo(id: string, done: boolean, event: Event) {
  (event.target as HTMLInputElement).checked = done;
  emit("toggle", id);
}
</script>

<template>
  <article class="note-card">
    <h2>{{ note.title }}</h2>
    <ul v-if="note.todos.length" class="preview-list">
      <li
        v-for="(todo, todoIndex) in note.todos.slice(0, 3)"
        :key="todo.id"
        :class="{ completed: todo.done }"
      >
        <label class="preview-task">
          <input
            :aria-label="todo.text.trim() || `Задача ${todoIndex + 1}`"
            :checked="todo.done"
            type="checkbox"
            @change="toggleTodo(todo.id, todo.done, $event)"
          />
          <span class="preview-text"
            ><template
              v-for="(line, index) in todo.text.split(/\r\n|\r|\n/)"
              :key="index"
              ><br v-if="index > 0" />{{ line }}</template
            ></span
          >
        </label>
      </li>
    </ul>
    <p v-else class="muted">Пока без задач</p>
    <p v-if="note.todos.length > 3" class="muted remaining">
      Ещё задач — {{ note.todos.length - 3 }}
    </p>
    <div class="card-actions">
      <NuxtLink
        :data-edit-id="note.id"
        :to="`/notes/${note.id}`"
        class="button button-link"
        >Редактировать<span class="sr-only"> {{ note.title }}</span></NuxtLink
      >
      <button
        class="button button-quiet"
        type="button"
        @click="$emit('delete', note.id)"
      >
        Удалить<span class="sr-only"> {{ note.title }}</span>
      </button>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.note-card {
  background: var(--color-surface);
  border: var(--border-default);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  min-width: 0;
  padding: var(--space-24);

  h2 {
    margin-bottom: var(--space-24);
  }
}

.preview-list {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    margin: var(--space-12) 0;
  }
}

.preview-task {
  align-items: baseline;
  cursor: pointer;
  display: flex;
  gap: var(--space-12);
  width: 100%;

  input {
    accent-color: var(--color-accent);
    flex-shrink: 0;
    height: 18px;
    margin: 0;
    transform: translateY(3px);
    width: 18px;
  }

  .preview-text {
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

.completed {
  color: var(--color-completed);
}

.remaining {
  font-size: var(--font-size-small);
}

.card-actions {
  border-top: var(--border-default);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: space-between;
  margin: var(--space-24) calc(-1 * var(--space-6)) calc(-1 * var(--space-8));
  padding-top: var(--space-12);
}
</style>
