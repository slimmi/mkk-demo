export interface Todo { id: string; text: string; done: boolean }
export interface Note { id: string; title: string; todos: Todo[] }
export type Field = { kind: 'title' } | { kind: 'todo'; id: string }
export type Edit =
  | { kind: 'text'; field: Field; before: string; after: string }
  | { kind: 'toggle'; id: string; before: boolean; after: boolean }
  | { kind: 'insert' | 'remove'; item: Todo; index: number }
export const copyNote = (note: Note): Note => ({ ...note, todos: note.todos.map(item => ({ ...item })) })
export function fieldValue(note: Note, field: Field): string {
  return field.kind === 'title' ? note.title : note.todos.find(item => item.id === field.id)!.text
}
export function setText(note: Note, field: Field, value: string) {
  if (field.kind === 'title') note.title = value
  else note.todos.find(item => item.id === field.id)!.text = value
}
export function applyEdit(note: Note, edit: Edit, reverse = false) {
  if (edit.kind === 'text') setText(note, edit.field, reverse ? edit.before : edit.after)
  else if (edit.kind === 'toggle') note.todos.find(item => item.id === edit.id)!.done = reverse ? edit.before : edit.after
  else {
    const insert = (edit.kind === 'insert') !== reverse
    if (insert) note.todos.splice(edit.index, 0, { ...edit.item })
    else note.todos.splice(edit.index, 1)
  }
}
export function validate(note: Note): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!note.title.trim()) errors.title = 'Введите название заметки.'
  for (const item of note.todos) if (!item.text.trim()) errors[item.id] = 'Введите текст задачи или удалите её.'
  return errors
}
export function normalized(note: Note): Note {
  return { ...note, title: note.title.trim(), todos: note.todos.map(item => ({ ...item, text: item.text.trim() })) }
}
