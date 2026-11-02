import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useEditorStore } from "../../app/stores/editor";
import { useNotesStore } from "../../app/stores/notes";
import { copyNote, type Note } from "../../app/domain/notes/model";
import {
  createHistory,
  record,
  undo,
  redo,
} from "../../app/domain/notes/history";
import {
  COLLECTION_KEY,
  draftKey,
  readDraft,
  writeDraft,
  writeNotes,
  type StoragePort,
} from "../../app/storage/notes";
const note: Note = {
  id: "one",
  title: "Title",
  todos: [
    { id: "a", text: "A", done: false },
    { id: "b", text: "B", done: false },
  ],
};
function memory(): StoragePort {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key) => data.get(key) ?? null),
    setItem: vi.fn((key, value) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key) => {
      data.delete(key);
    }),
  };
}
beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", memory());
  vi.stubGlobal("sessionStorage", memory());
  vi.stubGlobal("navigator", {
    locks: { request: async (_: string, action: () => unknown) => action() },
  });
  writeNotes(localStorage, [copyNote(note)]);
  useNotesStore().refresh();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("operation history", () => {
  it("limits history to 50 operations and ignores no-op text", () => {
    const history = createHistory();
    for (let i = 0; i < 60; i++)
      record(history, {
        kind: "text",
        field: { kind: "title" },
        before: String(i),
        after: String(i + 1),
      });
    record(history, {
      kind: "text",
      field: { kind: "title" },
      before: "x",
      after: "x",
    });
    expect(history.past).toHaveLength(50);
    const draft = { ...copyNote(note), title: "60" };
    for (let i = 0; i < 50; i++) undo(draft, history);
    expect(draft.title).toBe("10");
    redo(draft, history);
    expect(draft.title).toBe("11");
  });
});
describe("editor session", () => {
  function open() {
    const editor = useEditorStore();
    editor.open("one", note);
    return editor;
  }
  it("groups typing and flushes immediately before a toggle", () => {
    const editor = open();
    editor.text({ kind: "title" }, "T");
    editor.text({ kind: "title" }, "Typed");
    editor.toggle("a");
    expect(editor.history.past).toHaveLength(2);
    editor.undo();
    expect(editor.draft!.todos[0]!.done).toBe(false);
    expect(editor.draft!.title).toBe("Typed");
    editor.undo();
    expect(editor.draft!.title).toBe("Title");
  });
  it("commits typing after 500ms and after blur, ignoring reverted input", () => {
    const editor = open();
    editor.text({ kind: "title" }, "First");
    vi.advanceTimersByTime(500);
    editor.text({ kind: "title" }, "Second");
    editor.flushText();
    expect(editor.history.past).toHaveLength(2);
    editor.text({ kind: "title" }, "X");
    editor.text({ kind: "title" }, "Second");
    editor.flushText();
    expect(editor.history.past).toHaveLength(2);
  });
  it("restores removed items in their original order and clears redo on typing", () => {
    const editor = open();
    editor.remove("a");
    editor.undo();
    expect(editor.draft!.todos.map((item) => item.id)).toEqual(["a", "b"]);
    editor.text({ kind: "todo", id: "a" }, "Changed");
    expect(editor.canRedo).toBe(false);
  });
  it("isolates the draft and only writes recovery during typing", () => {
    const editor = open();
    vi.mocked(localStorage.setItem).mockClear();
    editor.text({ kind: "todo", id: "a" }, "Changed");
    editor.toggle("b");
    vi.advanceTimersByTime(600);
    expect(useNotesStore().notes[0]!.todos[0]!.text).toBe("A");
    expect(note.todos[0]!.text).toBe("A");
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(readDraft(sessionStorage, "one")!.todos[0]!.text).toBe("Changed");
  });
  it("saves trimmed content, clears history, recovery and pending writes", async () => {
    const editor = open();
    editor.text({ kind: "title" }, " Saved ");
    editor.flushRecovery();
    expect(await editor.save()).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(useNotesStore().notes[0]!.title).toBe("Saved");
    expect(editor.history.past).toHaveLength(0);
    expect(sessionStorage.getItem(draftKey("one"))).toBeNull();
  });
  it("cancel clears the session without changing saved notes", () => {
    const editor = open();
    editor.text({ kind: "title" }, "Unsaved");
    editor.flushRecovery();
    expect(editor.cancel()).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(editor.draft).toBeNull();
    expect(editor.canUndo).toBe(false);
    expect(sessionStorage.getItem(draftKey("one"))).toBeNull();
    expect(useNotesStore().notes[0]!.title).toBe("Title");
  });
  it("offers reload recovery and restores with fresh history", () => {
    const editor = open();
    editor.text({ kind: "title" }, "Recovered");
    editor.flushRecovery();
    editor.open("one", note);
    expect(editor.draft!.title).toBe("Title");
    expect(editor.recovery!.title).toBe("Recovered");
    editor.restore();
    expect(editor.draft!.title).toBe("Recovered");
    expect(editor.canUndo).toBe(false);
  });
  it("separates recovery drafts by route and supports discard", () => {
    writeDraft(sessionStorage, "new", { ...note, title: "New draft" });
    const editor = open();
    expect(editor.recovery).toBeNull();
    editor.open("new", undefined);
    expect(editor.recovery!.title).toBe("New draft");
    editor.discardRecovery();
    expect(readDraft(sessionStorage, "new")).toBeNull();
  });
  it("keeps the draft when storage writes fail", async () => {
    const editor = open();
    editor.text({ kind: "title" }, "Keep me");
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error("Quota");
    });
    expect(await editor.save()).toBe(false);
    expect(editor.draft!.title).toBe("Keep me");
    expect(editor.error).not.toBe("");
    expect(useNotesStore().notes[0]!.title).toBe("Title");
  });
  it("reports recovery write failures", () => {
    const editor = open();
    editor.text({ kind: "title" }, "Keep");
    vi.mocked(sessionStorage.setItem).mockImplementation(() => {
      throw new Error("Quota");
    });
    editor.flushRecovery();
    expect(editor.error).toContain("черновик");
    expect(editor.draft!.title).toBe("Keep");
  });
  it("does not recreate an existing note deleted by another tab before save", async () => {
    const editor = open();
    editor.text({ kind: "title" }, "Stale");
    writeNotes(localStorage, []);
    expect(await editor.save()).toBe(false);
    expect(editor.deleted).toBe(true);
    expect(JSON.parse(localStorage.getItem(COLLECTION_KEY)!).notes).toEqual([]);
  });
  it("refreshes external deletion and handles missing notes", () => {
    const editor = open();
    writeNotes(localStorage, []);
    useNotesStore().refresh();
    expect(useNotesStore().notes).toEqual([]);
    editor.open("missing", undefined);
    expect(editor.draft).toBeNull();
  });
  it("validates blank fields and allows zero tasks", async () => {
    const editor = open();
    editor.text({ kind: "title" }, " ");
    editor.text({ kind: "todo", id: "a" }, "");
    expect(await editor.save()).toBe(false);
    expect(Object.keys(editor.errors)).toEqual(["title", "a"]);
    editor.text({ kind: "title" }, "Title");
    editor.remove("a");
    editor.remove("b");
    expect(await editor.save()).toBe(true);
  });
  it("does not replace malformed saved data on save or delete", async () => {
    localStorage.setItem(COLLECTION_KEY, "{invalid");
    expect(useNotesStore().refresh()).toBe(false);
    const editor = open();
    expect(await editor.save()).toBe(false);
    await expect(useNotesStore().remove("one")).rejects.toThrow();
    expect(localStorage.getItem(COLLECTION_KEY)).toBe("{invalid");
  });
});
