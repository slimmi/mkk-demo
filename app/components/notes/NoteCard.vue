<script setup lang="ts">
import type { Note } from "../../domain/notes/model";
defineProps<{ note: Note }>();
defineEmits<{ delete: [id: string] }>();
</script>
<template>
  <article class="note-card">
    <h2>{{ note.title }}</h2>
    <ul v-if="note.todos.length" class="preview-list">
      <li
        v-for="todo in note.todos.slice(0, 3)"
        :key="todo.id"
        :class="{ completed: todo.done }"
      >
        <span class="preview-check" aria-hidden="true">{{
          todo.done ? "✓" : ""
        }}</span
        ><span class="sr-only">{{
          todo.done ? "Выполнено. " : "Не выполнено. "
        }}</span
        ><span>{{ todo.text }}</span>
      </li>
    </ul>
    <p v-else class="muted">Пока без задач</p>
    <p v-if="note.todos.length > 3" class="muted remaining">
      Ещё задач — {{ note.todos.length - 3 }}
    </p>
    <div class="card-actions">
      <NuxtLink
        class="button button-link"
        :to="`/notes/${note.id}`"
        :data-edit-id="note.id"
        >Редактировать<span class="sr-only"> {{ note.title }}</span></NuxtLink
      ><button
        class="button button-quiet"
        type="button"
        @click="$emit('delete', note.id)"
      >
        Удалить<span class="sr-only"> {{ note.title }}</span>
      </button>
    </div>
  </article>
</template>
