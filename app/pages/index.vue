<script setup lang="ts">
import { useNotesStore } from "../stores/notes";
const notes = useNotesStore();
const deleting = ref<string | null>(null);
const error = ref("");
async function remove() {
  const id = deleting.value!;
  const index = notes.notes.findIndex((note) => note.id === id);
  try {
    await notes.remove(id);
    deleting.value = null;
    await nextTick();
    const next = notes.notes[index] || notes.notes[index - 1];
    const target = next
      ? document.querySelector<HTMLElement>(`[data-edit-id="${next.id}"]`)
      : document.getElementById("create-note");
    target?.focus();
  } catch {
    deleting.value = null;
    error.value = "Не удалось удалить заметку. Попробуйте ещё раз.";
  }
}
</script>
<template>
  <section class="home container">
    <div class="page-heading">
      <div>
        <h1>Заметки</h1>
        <p class="muted">Соберите мысли. Освободите голову.</p>
      </div>
      <NuxtLink id="create-note" to="/notes/new" class="button button-primary"
        ><span aria-hidden="true">＋</span> Создать заметку</NuxtLink
      >
    </div>
    <p v-if="notes.error || error" role="alert" class="message error-message">
      {{ notes.error || error }}
    </p>
    <div v-if="notes.notes.length" class="notes-grid">
      <NotesNoteCard
        v-for="note in notes.notes"
        :key="note.id"
        :note="note"
        @delete="deleting = $event"
      />
    </div>
    <div v-else-if="!notes.error" class="empty-state">
      <span class="empty-mark" aria-hidden="true">▤</span>
      <h2>Здесь начинается ваш блокнот</h2>
      <p>
        Планы на день, список покупок или новая идея.<br />Создайте заметку и
        добавьте первые задачи.
      </p>
      <NuxtLink to="/notes/new" class="button">Создать первую заметку</NuxtLink>
    </div>
    <UiConfirmDialog
      v-if="deleting"
      title="Удалить заметку?"
      description="Заметка и все её задачи будут удалены. Вернуть их не получится."
      confirm="Удалить"
      safe="Оставить заметку"
      @dismiss="deleting = null"
      @confirm="remove"
    />
  </section>
</template>
