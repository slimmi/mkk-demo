<script setup lang="ts">
import type { Todo } from "../../domain/notes/model";
const props = defineProps<{ todo: Todo; index: number; error?: string }>();
const emit = defineEmits<{
  text: [value: string];
  toggle: [];
  remove: [];
  blur: [];
}>();
const name = computed(
  () => props.todo.text.trim() || `Задача ${props.index + 1}`,
);
const input = useTemplateRef("input");
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
          :aria-describedby="error ? `error-${todo.id}` : undefined"
          @input="emit('text', ($event.target as HTMLTextAreaElement).value)"
          @blur="emit('blur')"
        />
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
