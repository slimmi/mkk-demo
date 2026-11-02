import type { Edit, Note } from './model'
import { applyEdit } from './model'
export interface History { past: Edit[]; future: Edit[] }
export const createHistory = (): History => ({ past: [], future: [] })
export function record(history: History, edit: Edit) {
  if (edit.kind === 'text' && edit.before === edit.after) return
  history.past.push(edit)
  if (history.past.length > 50) history.past.shift()
  history.future = []
}
export function undo(note: Note, history: History) {
  const edit = history.past.pop()
  if (edit) { applyEdit(note, edit, true); history.future.push(edit) }
}
export function redo(note: Note, history: History) {
  const edit = history.future.pop()
  if (edit) { applyEdit(note, edit); history.past.push(edit) }
}
