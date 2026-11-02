# Notes SPA

## Engineering priorities

Build a two-page notes SPA with Nuxt 4, the Vue Composition API (`<script setup lang="ts">`), strict TypeScript, Pinia, and SCSS. Use client-side rendering (`ssr: false`) and browser storage. A REST backend and SSR are outside the scope of this exercise.

The role emphasizes usable interfaces, Vue reactivity, and independent architectural judgment. Demonstrate these through predictable editing, accessible controls, and state transitions that can be tested without mounting a component.

**Write all code comments in English**, including comments in Vue templates, stylesheets, and tests.

## Visual design

Use a notebook style with a warm off-white background, white note cards, dark body text, and an ink-blue accent for primary actions and keyboard focus. Define shared colors, spacing, typography, borders, and focus styles in SCSS.

- **Home (`/`).** Place the title and Create Note action above a responsive card grid. Show the note title and the first three todos, or all todos if there are fewer. Show completion in the preview without allowing toggles. Keep completed items legible and provide visible Edit and Delete actions. Use one column on small screens.
- **Editor.** Use a narrow reading column with a prominent editable title, labeled checkboxes aligned with the task text, and Add Todo directly below the list. Make Save the primary action, group Undo and Redo together, and separate Delete from routine editing controls.
- **Components.** Write the markup and dialogs in Vue and style them with SCSS. Component galleries may serve as visual references. UI component libraries are prohibited, including Vuetify, Element Plus, Nuxt UI, PrimeVue in unstyled mode, and headless libraries such as Reka UI. [Nuxt UI](https://nuxt.com/modules/ui) · [PrimeVue Unstyled](https://primevue.dev/theming/unstyled/) · [Reka UI](https://www.reka-ui.com/docs/overview/introduction)

## Architecture and file organization

Keep the saved collection separate from the active editor session. Open each note as an independent draft, including its todo items. Only a successful Save copies draft edits into the saved collection.

```text
app/
  pages/
    index.vue             # Saved notes and read-only previews
    notes/[id].vue        # Shared editor for new and existing notes
  components/
    notes/                # Note cards, todo previews, editable todo rows
    ui/                   # Shared accessible dialog and reusable controls
  domain/notes/           # Note and Todo types, validation, reversible edits
  stores/                 # Saved collection and active editor session
  composables/            # Keyboard shortcuts and browser lifecycle bindings
  storage/                # Manual persistence for saved notes and drafts
  assets/scss/            # Design tokens, base styles, and shared layout
tests/unit/               # History and store tests
Dockerfile
docker-compose.yaml
```

Pages handle routing and composition. Components emit user intent, Pinia stores coordinate state changes, and plain TypeScript functions implement reversible edits. Give notes and todos stable IDs. Extract components for shared interactions and distinct pieces of the notes UI.

## Editing, history, and persistence

- **Editor lifecycle.** Reserve `/notes/new` for creation and use `/notes/:id` for existing notes. Support editing the title and adding, removing, renaming, and checking todos. Confirm deletion from either page and cancellation from the editor. Guard in-app navigation away from a dirty draft. Allow empty fields while typing. On Save, trim text, show an inline error for any blank title or todo label, and focus the first invalid field. A note may have zero todos.
- **History.** Store up to 50 reversible operations. For text edits, keep the field identity and its before/after values. For insertions and removals, keep the item and its original position. Each toggle, insertion, or removal is one atomic step. Group typing in a single field until blur or 500 ms of inactivity. Flush pending text before the next editor action, ignore no-op edits, and clear redo when a new edit follows undo. Implement history manually. Undo/redo libraries and full-note snapshot histories are prohibited.
- **Keyboard and dialogs.** Handle Ctrl+Z and Ctrl+Shift+Z globally on the editor page, with Cmd equivalents on macOS. Preserve native undo and redo inside editable fields. Suspend page shortcuts while a dialog is open. Give each custom dialog an accessible name, initial focus, a focus trap, Escape dismissal, and focus restoration. Initially focus the safe action in destructive confirmations. Use custom dialogs for all confirmations. Browser alerts and confirmation prompts are prohibited.
- **Storage and recovery.** Write schema-versioned saved notes to `localStorage` on Save and confirmed Delete. Keep a separate schema-versioned recovery draft per editor route in `sessionStorage`. Debounce draft writes and flush pending changes on page hide. After reload, offer Restore or Discard before replacing a draft. Restore its content with fresh history. Successful Save, confirmed Cancel, and confirmed Delete clear the draft, history, and pending writes. A failed Save keeps the editor open with the draft intact. Implement synchronization manually. Automatic store persistence plugins are prohibited.
- **Missing and deleted notes.** For an unknown ID, show a missing-note state with a route home. React to deletion in another tab and recheck existence before saving an existing note. If the note was deleted elsewhere, disable Save and explain what happened. A stale editor must never recreate the deleted note.

## Verification and delivery

- Use **Vitest** for history and Pinia store unit tests. Cover grouped typing followed immediately by a toggle, restoration of item order, redo invalidation, the 50-step limit, draft isolation, Save and Cancel resets, reload recovery, storage failures, and deletion from another tab. Assert that typing does not write to the saved collection. Component tests are optional.
- Manually check keyboard-only editing, dialog focus and Escape, native text undo, narrow-screen layout, and direct editor URLs after reload. Verify the core flows in Chromium, Firefox, and Safari.
- Deliver a public GitHub or GitLab repository with meaningful commit history, a `Dockerfile`, and `docker-compose.yaml`. From a clean checkout, `docker-compose up` must start the working application without host-side npm setup.
