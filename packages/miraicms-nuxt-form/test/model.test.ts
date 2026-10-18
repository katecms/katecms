import assert from 'node:assert/strict'
import test from 'node:test'
import { reactive } from 'vue'
import {
  addField,
  cloneField,
  cloneStep,
  deleteStep,
  addStep,
  reorderSteps,
  copyDesktopLayout,
  syncFieldOrderLayouts,
  emptySubmissionError,
  confirmationTarget,
  notificationFieldErrors,
  createEmptyContent,
  hasSubmitButton,
  removeField,
  normalizeFormContent,
  overlaps,
  placeField,
  resolveLayout,
  setLayoutItem,
  setFormBreakpoints,
  submissionErrors,
  textStoredValue,
} from '../src/runtime/form/model.ts'

test('a new step starts its own grid and does not push the first step', () => {
  let content = createEmptyContent()
  content = addStep(content)
  const second = content.steps[1]!
  content = addField(content, 'email', second.id)
  const email = content.layouts.desktop.find(item => item.fieldId === content.fields.at(-1)?.id)
  const button = content.layouts.desktop[0]
  assert.equal(content.fields.at(-1)?.stepId, second.id)
  assert.equal(email?.x, 0)
  assert.equal(email?.y, 0)
  assert.equal(button?.y, 0)
  content = reorderSteps(content, 1, 0)
  assert.deepEqual(content.steps.map(step => step.label), ['Step 1', 'Step 2'])
  assert.equal(content.steps[0]?.id, second.id)
})

test('clone copies the step fields and delete removes them', () => {
  let content = createEmptyContent()
  const first = content.steps[0]!.id
  content = cloneStep(content, first)
  assert.equal(content.steps.length, 2)
  assert.equal(content.fields.length, 2)
  assert.notEqual(content.fields[0]?.id, content.fields[1]?.id)
  assert.notEqual(content.fields[0]?.key, content.fields[1]?.key)
  assert.deepEqual(content.steps.map(step => step.label), ['Step 1', 'Step 2'])
  content = deleteStep(content, content.steps[1]!.id)
  assert.equal(content.steps.length, 1)
  assert.equal(content.fields.length, 1)
  assert.equal(deleteStep(content, content.steps[0]!.id), content)
})

test('new fields sit before the full-width submit button', () => {
  let content = createEmptyContent()
  const submit = content.fields.find(field => field.type === 'button')!
  assert.equal(submit.locked, true)
  assert.equal(submit.text?.buttonType, 'submit')
  assert.equal(content.layouts.desktop.find(item => item.fieldId === submit.id)?.w, 60)
  content = addField(content, 'text')
  content = addField(content, 'email')
  const textId = content.fields.find(field => field.type === 'text')!.id
  const emailId = content.fields.find(field => field.type === 'email')!.id
  const text = content.layouts.desktop.find(item => item.fieldId === textId)
  const email = content.layouts.desktop.find(item => item.fieldId === emailId)
  const button = content.layouts.desktop.find(item => item.fieldId === submit.id)
  assert.equal(text?.x, 0)
  assert.equal(text?.y, 0)
  assert.equal(text?.w, 30)
  assert.equal(email?.x, 0)
  assert.equal(email?.y, 1)
  assert.equal(email?.w, 30)
  assert.equal(button?.y, 2)
  assert.equal(button?.w, 60)
  assert.equal(content.fields.at(-1)?.id, submit.id)
  assert.equal(content.layouts.phone.find(item => item.fieldId === emailId)?.w, 60)
  assert.equal(removeField(content, submit.id), content)
  assert.equal(cloneField(content, submit.id).fields.length, content.fields.length)
  assert.equal(hasSubmitButton(content), true)
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
  assert.equal(content.validateOnBlur, true)
  assert.equal(content.preventEmptySubmit, true)
  assert.equal(content.emptySubmitMessage, 'Empty form cannot be submitted.')
  assert.equal(content.notification.to, '')
  assert.equal(content.confirmation.successMessage, '')
})

test('notification and confirmation settings are stored and scripts are removed', () => {
  const content = normalizeFormContent({
    notification: { to: 'a@b.co', fromName: 'Desk', cc: 'c@b.co' },
    confirmation: {
      successMessage: '<p>Thanks</p><script>alert(1)</script>',
      redirectPage: ' javascript:alert(1)',
    },
  })
  assert.equal(content.notification.to, 'a@b.co')
  assert.equal(content.notification.fromName, 'Desk')
  assert.equal(content.notification.cc, 'c@b.co')
  assert.equal(content.notification.bcc, '')
  assert.equal(content.confirmation.successMessage.includes('script'), false)
  assert.equal(content.confirmation.successMessage.includes('Thanks'), true)
  assert.equal(confirmationTarget(content.confirmation.redirectPage), '')
  assert.equal(confirmationTarget('/thanks'), '/thanks')
  assert.equal(confirmationTarget('https://example.com/done'), 'https://example.com/done')
  assert.equal(confirmationTarget('//evil.example'), '')
})

test('notification mail fields reject plain text and allow address lists', () => {
  const content = normalizeFormContent({
    notification: {
      to: 'a@b.co, hello',
      fromMail: 'not-an-email',
      fromName: 'Desk',
      cc: 'c@d.co, e@f.co',
      replyTo: 'reply@b.co',
    },
  })
  const errors = notificationFieldErrors(content.notification)
  assert.equal(errors['notify-to'], 'Enter valid email addresses, separated by commas.')
  assert.equal(errors['notify-fromMail'], 'Enter a valid email address.')
  assert.equal(errors['notify-cc'], undefined)
  assert.equal(errors['notify-replyTo'], undefined)
  assert.equal(errors['notify-fromName'], undefined)
  assert.equal(Object.keys(notificationFieldErrors(normalizeFormContent({}).notification)).length, 0)
})

test('empty form submission uses the saved message and ignores hidden values', () => {
  const content = normalizeFormContent({
    preventEmptySubmit: true,
    emptySubmitMessage: 'Please fill in the form.',
    validateOnBlur: false,
    fields: [
      { id: 'e', type: 'email', key: 'email', label: 'Email' },
      { id: 'h', type: 'hidden', key: 'src', label: 'Source', value: 'site' },
    ],
  })
  assert.equal(content.validateOnBlur, false)
  assert.equal(emptySubmissionError(content, { email: '  ', src: 'site' }, {}), 'Please fill in the form.')
  assert.equal(emptySubmissionError(content, { email: 'a@b.co' }, {}), null)
  content.preventEmptySubmit = false
  assert.equal(emptySubmissionError(content, { email: '' }, {}), null)
})

test('sync field order keeps each breakpoint width and follows the source order', () => {
  let content = createEmptyContent()
  content = addField(content, 'text')
  content = addField(content, 'email')
  const textId = content.fields.find(field => field.type === 'text')!.id
  const emailId = content.fields.find(field => field.type === 'email')!.id
  content = setLayoutItem(content, 'desktop', { fieldId: emailId, x: 0, y: 0, w: 30 })
  content = setLayoutItem(content, 'desktop', { fieldId: textId, x: 30, y: 0, w: 30 })
  content = syncFieldOrderLayouts(content, 'desktop')
  const phone = [...content.layouts.phone].sort((a, b) => a.y - b.y || a.x - b.x)
  const ordered = phone.filter(item => item.fieldId === emailId || item.fieldId === textId)
  assert.deepEqual(ordered.map(item => item.fieldId), [emailId, textId])
  assert.equal(ordered.every(item => item.w === 60), true)
})

test('tablet layout can be copied from desktop', () => {
  let content = createEmptyContent()
  content = addField(content, 'text')
  const textId = content.fields.find(field => field.type === 'text')!.id
  content = setLayoutItem(content, 'desktop', { fieldId: textId, x: 20, y: 3, w: 10 })
  content = copyDesktopLayout(content, 'tablet')
  const copied = content.layouts.tablet.find(item => item.fieldId === textId)
  assert.equal(copied?.x, 20)
  assert.equal(copied?.y, 3)
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

test('text options keep label settings and use a custom error', () => {
  const content = normalizeFormContent({
    fields: [{
      id: 't',
      type: 'text',
      key: 'name',
      label: 'Name',
      required: true,
      text: {
        label: { enabled: true, text: 'Your name' },
        required: { enabled: true, customError: true, errorText: 'Need a name', showError: true },
        minLength: 3,
      },
    }],
  })
  const field = content.fields[0]
  assert.equal(field?.label, 'Your name')
  assert.equal(field?.text?.required.asteriskPosition, 'after')
  assert.equal(field?.text?.label.enabled, true)
  const errors = submissionErrors(content, { name: 'a' }, {}, 1024)
  assert.equal(errors.name, 'Need a name')
  const missing = submissionErrors(content, { name: '' }, {}, 1024)
  assert.equal(missing.name, 'Need a name')
})

test('email confirm and password rules are stored and checked', () => {
  const email = normalizeFormContent({
    fields: [{
      id: 'e',
      type: 'email',
      key: 'email',
      label: 'Email',
      required: true,
      text: { confirm: { enabled: true } },
    }],
  })
  assert.equal(email.fields[0]?.text?.confirm.enabled, true)
  const mismatch = submissionErrors(email, { email: 'a@b.com', email__confirm: 'c@d.com' }, {}, 1024)
  assert.equal(mismatch.email, 'The values do not match.')

  const password = normalizeFormContent({
    fields: [{
      id: 'p',
      type: 'password',
      key: 'password',
      label: 'Password',
      required: true,
      text: { passwordRules: { digit: true } },
    }],
  })
  const weak = submissionErrors(password, { password: 'abcdef' }, {}, 1024)
  assert.equal(weak.password, 'Password does not meet the requirements.')
  const strong = submissionErrors(password, { password: 'abcdef1' }, {}, 1024)
  assert.equal(strong.password, undefined)
})

test('configured breakpoints replace the default layout keys', () => {
  setFormBreakpoints(['desktop', 'wide'])
  try {
    const content = createEmptyContent()
    assert.deepEqual(Object.keys(content.layouts).sort(), ['desktop', 'wide'])
    assert.equal(content.layouts.desktop[0]?.w, 60)
    assert.equal(content.layouts.wide[0]?.w, 60)
  }
  finally {
    setFormBreakpoints(['phone', 'tablet', 'desktop'])
  }
})

test('a saved form keeps one locked submit button', () => {
  const content = normalizeFormContent({
    fields: [
      { id: 'a', type: 'button', key: 'button', text: { buttonType: 'submit' } },
      { id: 'b', type: 'button', key: 'button_2', text: { buttonType: 'submit' } },
    ],
  })
  const buttons = content.fields.filter(field => field.type === 'button')
  assert.equal(buttons[0]?.locked, true)
  assert.equal(buttons[0]?.text?.buttonType, 'submit')
  assert.equal(buttons[1]?.locked, undefined)
  assert.equal(buttons[1]?.text?.buttonType, 'button')
  assert.equal(hasSubmitButton({ ...content, fields: buttons.map(field => field.text ? { ...field, text: { ...field.text, buttonType: 'button' as const } } : field) }), false)
})

test('the first button is submit and later buttons default to button', () => {
  let content = createEmptyContent()
  const first = content.fields.find(field => field.type === 'button')
  assert.equal(first?.text?.buttonType, 'submit')
  assert.equal(first?.text?.buttonText.text, 'Submit')
  content = addField(content, 'button')
  const added = content.fields.find(field => field.type === 'button' && !field.locked)
  assert.equal(added?.text?.buttonType, 'button')
  assert.equal(content.fields.at(-1)?.text?.buttonType, 'submit')
  assert.equal(added?.text?.buttonText.text, 'Button')
})

test('cloneField copies a reactive field', () => {
  let content = createEmptyContent()
  content = addField(content, 'email')
  const source = content.fields.find(field => field.type === 'email')!
  const live = reactive(content)
  const cloned = cloneField(live, source.id)
  const copy = cloned.fields.find(field => field.type === 'email' && field.id !== source.id)
  assert.ok(copy)
  assert.notEqual(copy.key, source.key)
  assert.equal(copy.stepId, source.stepId)
  assert.equal(cloned.fields.length, content.fields.length + 1)
  const sourceIndex = cloned.fields.findIndex(field => field.id === source.id)
  assert.equal(cloned.fields[sourceIndex + 1]?.id, copy.id)
  const sourceItem = cloned.layouts.desktop.find(item => item.fieldId === source.id)
  const copyItem = cloned.layouts.desktop.find(item => item.fieldId === copy.id)
  assert.ok(sourceItem && copyItem)
  const after = copyItem.y > sourceItem.y || (copyItem.y === sourceItem.y && copyItem.x >= sourceItem.x + sourceItem.w)
  assert.equal(after, true)
})

test('cloneField keeps a gap in front of the source empty', () => {
  let content = createEmptyContent()
  content = addField(content, 'text')
  const source = content.fields.find(field => field.type === 'text')!
  content = setLayoutItem(content, 'desktop', { fieldId: source.id, x: 30, y: 0, w: 30 }, true)
  const cloned = cloneField(content, source.id)
  const copy = cloned.fields.find(field => field.id !== source.id && field.type === 'text')!
  const copyItem = cloned.layouts.desktop.find(item => item.fieldId === copy.id)
  assert.equal(copyItem?.y, 1)
  assert.equal(copyItem?.x, 30)
})

test('file upload keeps a 20 MB size floor and date range rejects late values', () => {
  const content = normalizeFormContent({
    fields: [
      { id: 'file', type: 'file', key: 'upload', text: { maxUpload: { enabled: true, size: 2 } } },
      { id: 'when', type: 'date', key: 'when', text: { rangeMax: '2020-01-01', required: { enabled: true } } },
    ],
  })
  const file = content.fields.find(field => field.type === 'file')
  assert.equal(file?.label, 'File Upload')
  assert.equal(file?.text?.uploadButtonText, 'Attach File')
  assert.equal(file?.text?.maxUpload.size, 20)
  const tooBig = submissionErrors(content, {}, { upload: { name: 'a.pdf', type: 'application/pdf', size: 21 * 1024 * 1024 } }, 50 * 1024 * 1024)
  assert.match(tooBig.upload || '', /20/)
  const date = submissionErrors(content, { when: '2024-05-01' }, {}, 1024)
  assert.equal(date.when, 'Enter a value in the allowed range.')
})

test('choice fields keep their options and enforce a checkbox minimum', () => {
  const content = normalizeFormContent({
    fields: [
      { id: 'c', type: 'checkbox', key: 'topics', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }], text: { choiceMinimum: { value: 2, showError: true, customError: false } } },
      { id: 'i', type: 'image_select', key: 'pics', text: { allowMultiple: true, choiceMin: 2 } },
    ],
  })
  assert.equal(content.fields[0]?.text?.choiceOptions.length, 2)
  assert.equal(content.fields[0]?.options[1]?.value, 'b')
  const few = submissionErrors(content, { topics: ['a'], pics: ['x'] }, {}, 1024)
  assert.match(few.topics || '', /at least 2/)
  assert.equal(few.pics, 'Choose a valid option.')
  const grouped = normalizeFormContent({
    fields: [{
      id: 's',
      type: 'select',
      key: 'city',
      text: {
        selectMultiple: { enabled: true, minimum: { value: 2, showError: true, customError: true, errorText: 'Select at least ${minimum} option(s)' } },
        choiceGroups: [{ id: 'g', label: 'Europe', options: [{ label: 'Paris', value: 'paris' }] }],
        choiceAfter: [{ label: 'Tokyo', value: 'tokyo' }],
      },
    }],
  })
  const select = grouped.fields[0]
  assert.equal(select?.text?.choiceGroups[0]?.label, 'Europe')
  assert.deepEqual(select?.options.map(option => option.value), ['paris', 'tokyo'])
  const ordered = normalizeFormContent({
    fields: [{
      id: 'ordered',
      type: 'select',
      key: 'place',
      text: {
        choiceEntries: [
          { type: 'option', option: { label: 'Before', value: 'before' } },
          { type: 'group', group: { id: 'eu', label: 'Europe', options: [{ label: 'Paris', value: 'paris' }] } },
          { type: 'option', option: { label: 'Middle', value: 'middle' } },
          { type: 'group', group: { id: 'as', label: 'Asia', options: [{ label: 'Tokyo', value: 'tokyo' }] } },
        ],
      },
    }],
  })
  assert.deepEqual(ordered.fields[0]?.options.map(option => option.value), ['before', 'paris', 'middle', 'tokyo'])
  const short = submissionErrors(grouped, { city: ['paris'] }, {}, 1024)
  assert.equal(short.city, 'Select at least 2 option(s)')
})
