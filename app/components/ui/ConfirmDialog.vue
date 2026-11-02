<script setup lang="ts">
const props = defineProps<{
  title: string;
  description: string;
  confirm: string;
  safe?: string;
  preserveOnEscape?: boolean;
}>();
const emit = defineEmits<{ confirm: []; dismiss: []; escape: [] }>();
const dialog = useTemplateRef("dialog");
const safeButton = useTemplateRef("safeButton");
let previous: HTMLElement | null = null;
onMounted(() => {
  previous = document.activeElement as HTMLElement;
  dialog.value?.showModal();
  safeButton.value?.focus({ preventScroll: true });
});
onBeforeUnmount(() => {
  dialog.value?.close();
  if (previous?.isConnected) previous.focus({ preventScroll: true });
});
function trap(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const buttons = dialog.value?.querySelectorAll<HTMLButtonElement>(
    "button:not(:disabled)",
  );
  if (!buttons?.length) return;
  const first = buttons[0]!,
    last = buttons[buttons.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>
<template>
  <dialog
    ref="dialog"
    class="dialog"
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
    @cancel.prevent="preserveOnEscape ? emit('escape') : emit('dismiss')"
    @keydown="trap"
  >
    <h2 id="dialog-title">{{ props.title }}</h2>
    <p id="dialog-description">{{ props.description }}</p>
    <div class="actions">
      <button
        ref="safeButton"
        class="button"
        type="button"
        autofocus
        @click="emit('dismiss')"
      >
        {{ safe || "Остаться" }}</button
      ><button
        class="button button-primary"
        type="button"
        @click="emit('confirm')"
      >
        {{ confirm }}
      </button>
    </div>
  </dialog>
</template>
