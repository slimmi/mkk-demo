import { useEditorStore } from "../stores/editor";
export function useEditorLifecycle(dialogOpen: () => boolean) {
  const editor = useEditorStore();
  function shortcut(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (
      dialogOpen() ||
      target?.closest('input, textarea, [contenteditable="true"]')
    )
      return;
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      event.code === "KeyZ"
    ) {
      event.preventDefault();
      if (event.shiftKey) editor.redo();
      else editor.undo();
    }
  }
  function hide() {
    editor.flushText();
    editor.flushRecovery();
  }
  onMounted(() => {
    window.addEventListener("keydown", shortcut);
    window.addEventListener("pagehide", hide);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("keydown", shortcut);
    window.removeEventListener("pagehide", hide);
    editor.dispose();
  });
}
