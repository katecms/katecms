import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addField,
  copyDesktopLayout,
  createEmptyContent,
  normalizeFormContent,
  overlaps,
  placeField,
  resolveLayout,
  setLayoutItem,
  submissionErrors,
  textStoredValue,
} from '../src/runtime/form/model.ts'

test('new fields sit beside each other on the 60-column grid', () => {
  let content = createEmptyContent()
  content = addField(content, 'text')
  content = addField(content, 'email')
  const [button, text, email] = content.layouts.desktop
  assert.equal(button?.w, 15)
  assert.equal(text?.x, 15)
  assert.equal(text?.y, 0)
  assert.equal(text?.w, 30)
  assert.equal(email?.x, 0)
  assert.equal(email?.y, 1)
  assert.equal(content.layouts.phone[1]?.w, 60)
  assert.equal(content.layouts.phone[1]?.y, 1)
})

test('overlapping items are pushed off the active field row', () => {
  const first = { fieldId: 'a', x: 0, y: 0, w: 30 }
  const second = { fieldId: 'b', x: 10, y: 0, w: 30 }
  assert.equal(overlaps(first, second), true)
  const resolved = resolveLayout([first, second], 'a')
  const moved = resolved.find(item => item.fieldId === 'b')
  assert.equal(moved?.y, 1)
  assert.equal(resolved.find(item => item.fieldId === 'a')?.y, 0)
})

test('placeField uses the next row when the row is full', () => {
  const layout = placeField([{ fieldId: 'a', x: 0, y: 0, w: 60 }], 'b', 30)
  assert.deepEqual(layout[1], { fieldId: 'b', x: 0, y: 1, w: 30 })
})

test('normalize repairs missing layout cells and strips scripts', () => {
  const content = normalizeFormContent({
    fields: [
      { id: 'keep', type: 'html', key: 'note', label: 'Note', html: '<p onclick="nope()">Hi</p><script>alert(1)</script>' },
      { type: 'nope' },
    ],
  })
  assert.equal(content.fields.length, 1)
  assert.equal(content.fields[0]?.html.includes('script'), false)
  assert.equal(content.fields[0]?.html.includes('onclick'), false)
  assert.equal(content.layouts.tablet[0]?.fieldId, 'keep')
  assert.equal(content.layouts.tablet[0]?.w, 60)
})

test('tablet layout can be copied from desktop', () => {
  let content = createEmptyContent()
  content = addField(content, 'text')
  content = setLayoutItem(content, 'desktop', { fieldId: content.fields[1]!.id, x: 20, y: 3, w: 10 })
  content = copyDesktopLayout(content, 'tablet')
  assert.equal(content.layouts.tablet[1]?.x, 20)
  assert.equal(content.layouts.tablet[1]?.y, 3)
})

test('submission checks required fields, choices, and hidden values', () => {
  const content = normalizeFormContent({
    fields: [
      { id: 'e', type: 'email', key: 'email', label: 'Email', required: true },
      { id: 'c', type: 'checkbox', key: 'topics', label: 'Topics', required: true, options: [{ label: 'A', value: 'a' }] },
      { id: 'h', type: 'hidden', key: 'src', label: 'Source', value: 'site' },
    ],
  })
  const errors = submissionErrors(content, { email: 'not-an-email', topics: ['nope'] }, {}, 1024)
  assert.equal(errors.email, 'Enter a valid email address.')
  assert.equal(errors.topics, 'Choose a valid option.')
  assert.equal(errors.src, undefined)
  const hidden = content.fields.find(field => field.type === 'hidden')
  assert.equal(hidden && textStoredValue(hidden, 'spoofed'), 'site')
})

test('file size is rejected before the file is stored', () => {
  const content = normalizeFormContent({
    fields: [{ id: 'f', type: 'file', key: 'resume', label: 'Resume', required: true }],
  })
  const errors = submissionErrors(content, {}, { resume: { name: 'a.pdf', type: 'application/pdf', size: 50 } }, 10)
  assert.equal(errors.resume, 'File is too large.')
})
