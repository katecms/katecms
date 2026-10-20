import { createError } from 'h3'
import type { H3Event } from 'h3'
import { getRequestIP, readBody, readMultipartFormData } from 'h3'
import { sql } from 'kysely'
import type {
  FormContent,
  FormListItem,
  FormRecord,
  PublicForm,
  UploadedFile,
} from '../../form/model'
import {
  createEmptyContent,
  fieldConditionStates,
  hasSubmitButton,
  conditionInputValues,
  normalizeFormContent,
  notificationFieldErrors,
  parseContent,
  emptySubmissionError,
  storesValue,
  submissionErrors,
  textStoredValue,
} from '../../form/model'
import { getFormDb, maxFileBytes } from './db'
import { applyServerFormBreakpoints } from './breakpoints'
import { sendSubmissionMail, type SubmissionMail } from './mail'
import { deleteFormUploads, deleteStoredFile, saveFormFile } from './uploads'

interface FormRow {
  id: number
  name: string
  content: string
  created_at: string | Date
  updated_at: string | Date
}

const NAME_MAX = 160

function readStoredContent(value: unknown) {
  applyServerFormBreakpoints()
  return parseContent(value)
}

export async function listForms(): Promise<FormListItem[]> {
  const result = await sql<Pick<FormRow, 'id' | 'name' | 'content' | 'updated_at'> & { submission_count: number | string }>`
    SELECT id, name, content, updated_at,
      (SELECT COUNT(*) FROM miraicms_form_submissions WHERE form_id = miraicms_forms.id) AS submission_count
    FROM miraicms_forms
    ORDER BY updated_at DESC, id DESC
  `.execute(getFormDb())
  return result.rows.map((row) => {
    const content = readStoredContent(row.content)
    return {
      id: Number(row.id),
      name: row.name,
      fieldCount: content.fields.length,
      submissionCount: Number(row.submission_count) || 0,
      updatedAt: asIso(row.updated_at),
    }
  })
}

export async function readForm(id: number): Promise<FormRecord | null> {
  const result = await sql<FormRow>`
    SELECT id, name, content, created_at, updated_at
    FROM miraicms_forms
    WHERE id = ${id}
  `.execute(getFormDb())
  const row = result.rows[0]
  return row ? rowToRecord(row) : null
}

export async function readPublicForm(id: number): Promise<PublicForm | null> {
  const record = await readForm(id)
  if (!record) {
    return null
  }
  const { notification: _notification, ...content } = record.content
  return {
    id: record.id,
    name: record.name,
    maxFileBytes: maxFileBytes(),
    content,
  }
}

export async function createForm(name: string): Promise<FormRecord> {
  const cleanName = name.trim().slice(0, NAME_MAX)
  if (!cleanName) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a form name.' })
  }
  applyServerFormBreakpoints()
  const content = JSON.stringify(createEmptyContent())
  const now = nowIso()
  const result = await sql<{ id: number }>`
    INSERT INTO miraicms_forms (name, content, created_at, updated_at)
    VALUES (${cleanName}, ${content}, ${now}, ${now})
    RETURNING id
  `.execute(getFormDb())
  const id = Number(result.rows[0]?.id)
  const record = await readForm(id)
  if (!record) {
    throw createError({ statusCode: 500, statusMessage: 'Could not create the form.' })
  }
  return record
}

export async function updateForm(id: number, body: unknown): Promise<FormRecord> {
  const current = await readForm(id)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  const input = isRecord(body) ? body : {}
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, NAME_MAX) : current.name
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a form name.' })
  }
  applyServerFormBreakpoints()
  const normalized = normalizeFormContent(input.content ?? current.content)
  if (!hasSubmitButton(normalized)) {
    throw createError({ statusCode: 400, statusMessage: 'Please add a submit button' })
  }
  if (Object.keys(notificationFieldErrors(normalized.notification)).length) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address.' })
  }
  const content = JSON.stringify(normalized)
  if (content.length > 1_000_000) {
    throw createError({ statusCode: 400, statusMessage: 'This form is too large to save.' })
  }
  await sql`
    UPDATE miraicms_forms
    SET name = ${name},
        content = ${content},
        updated_at = ${nowIso()}
    WHERE id = ${id}
  `.execute(getFormDb())
  const record = await readForm(id)
  if (!record) {
    throw createError({ statusCode: 500, statusMessage: 'Could not save the form.' })
  }
  return record
}

export async function deleteForm(id: number): Promise<void> {
  const current = await readForm(id)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  const db = getFormDb()
  await sql`
    DELETE FROM miraicms_form_submission_values
    WHERE submission_id IN (SELECT id FROM miraicms_form_submissions WHERE form_id = ${id})
  `.execute(db)
  await sql`DELETE FROM miraicms_form_submissions WHERE form_id = ${id}`.execute(db)
  await sql`DELETE FROM miraicms_forms WHERE id = ${id}`.execute(db)
  await deleteFormUploads(id)
}

export async function submitForm(event: H3Event, id: number): Promise<{ ok: true, id: number }> {
  const form = await readForm(id)
  if (!form) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  const { input, files } = await readSubmission(event, form.content)
  const empty = emptySubmissionError(form.content, input, files)
  if (empty) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Empty form cannot be submitted.',
      data: { message: empty },
    })
  }
  const errors = submissionErrors(form.content, input, files, maxFileBytes())
  if (Object.keys(errors).length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Check the highlighted fields.',
      data: { errors },
    })
  }

  const message = submissionMail(form, input, files)
  if (form.content.disableEntryStorage) {
    await deliverSubmissionMail(message, true)
    return { ok: true, id: 0 }
  }

  const db = getFormDb()
  const ip = getRequestIP(event, { xForwardedFor: true }) || ''
  const inserted = await sql<{ id: number }>`
    INSERT INTO miraicms_form_submissions (form_id, ip, created_at)
    VALUES (${form.id}, ${ip.slice(0, 80)}, ${nowIso()})
    RETURNING id
  `.execute(db)
  const submissionId = Number(inserted.rows[0]?.id)
  const storedKeys: string[] = []
  try {
    const states = fieldConditionStates(form.content, conditionInputValues(form.content, input))
    const values: { key: string, value: string }[] = []
    for (const field of form.content.fields) {
      const state = states[field.id]
      if (!storesValue(field) || state?.hidden || state?.disabled) {
        continue
      }
      if (field.type === 'file') {
        const uploaded = files[field.key]
        const list = Array.isArray(uploaded) ? uploaded : uploaded ? [uploaded] : []
        const stored = []
        for (const item of list) {
          if (!item.data || item.size < 1) {
            continue
          }
          const key = await saveFormFile(form.id, submissionId, item.name, item.data)
          storedKeys.push(key)
          stored.push({ name: item.name, size: item.size, type: item.type, key })
        }
        if (stored.length) {
          values.push({
            key: field.key,
            value: JSON.stringify(stored.length === 1 ? stored[0] : stored),
          })
        }
        continue
      }
      values.push({ key: field.key, value: textStoredValue(field, input[field.key]) })
    }
    for (const item of values) {
      await sql`
        INSERT INTO miraicms_form_submission_values (submission_id, field_key, value)
        VALUES (${submissionId}, ${item.key}, ${item.value})
      `.execute(db)
    }
  }
  catch (error) {
    await sql`DELETE FROM miraicms_form_submission_values WHERE submission_id = ${submissionId}`.execute(db)
    await sql`DELETE FROM miraicms_form_submissions WHERE id = ${submissionId}`.execute(db)
    await Promise.all(storedKeys.map(key => deleteStoredFile(key)))
    throw error
  }
  await deliverSubmissionMail(message, false)
  return { ok: true, id: submissionId }
}

type SubmissionUpload = UploadedFile & { data: Buffer }

function submissionMail(
  form: FormRecord,
  input: Record<string, unknown>,
  files: Record<string, SubmissionUpload | SubmissionUpload[] | null>,
): SubmissionMail | null {
  const notification = form.content.notification
  if (!notification.to.trim()) {
    return null
  }
  const states = fieldConditionStates(form.content, conditionInputValues(form.content, input))
  const lines: SubmissionMail['lines'] = []
  const attachments: SubmissionMail['files'] = []
  for (const field of form.content.fields) {
    const state = states[field.id]
    if (!storesValue(field) || state?.hidden || state?.disabled) {
      continue
    }
    const label = field.label || field.key
    if (field.type === 'file') {
      const uploaded = files[field.key]
      const list = (Array.isArray(uploaded) ? uploaded : uploaded ? [uploaded] : [])
        .filter(item => item.data && item.size > 0)
      if (!list.length) {
        continue
      }
      lines.push({ label, value: list.map(item => item.name.replace(/[\r\n]/g, ' ')).join(', ') })
      for (const item of list) {
        attachments.push({ name: item.name, type: item.type, content: item.data })
      }
      continue
    }
    const value = readableValue(textStoredValue(field, input[field.key]))
    if (!value) {
      continue
    }
    lines.push({ label, value })
  }
  return {
    formName: form.name,
    to: notification.to,
    fromMail: notification.fromMail,
    fromName: notification.fromName,
    cc: notification.cc,
    bcc: notification.bcc,
    replyTo: notification.replyTo,
    lines,
    files: attachments,
  }
}

async function deliverSubmissionMail(message: SubmissionMail | null, required: boolean): Promise<void> {
  if (!message) {
    return
  }
  try {
    await sendSubmissionMail(message)
  }
  catch (error) {
    const detail = mailFailureDetail(error)
    console.error('[miraicms] form notification email failed', detail)
    if (!required) {
      return
    }
    const statusMessage = detail === 'Set the SMTP host and from address first.'
      ? detail
      : 'Could not send the form email.'
    throw createError({ statusCode: 400, statusMessage, data: { message: statusMessage } })
  }
}

function mailFailureDetail(error: unknown): string {
  if (error && typeof error === 'object' && 'statusMessage' in error && typeof error.statusMessage === 'string') {
    return error.statusMessage
  }
  return error instanceof Error ? error.message.slice(0, 300) : 'Could not send the form email.'
}

function readableValue(value: string): string {
  const trimmed = value.replace(/\r/g, '').trim()
  if (!trimmed) {
    return ''
  }
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item)).join(', ')
      }
    }
    catch {
      // Keep the stored text when it is not a choice list.
    }
  }
  return trimmed
}

async function readSubmission(event: H3Event, content: FormContent): Promise<{
  input: Record<string, unknown>
  files: Record<string, (UploadedFile & { data: Buffer }) | (UploadedFile & { data: Buffer })[] | null>
}> {
  const input: Record<string, unknown> = {}
  const files: Record<string, (UploadedFile & { data: Buffer }) | (UploadedFile & { data: Buffer })[] | null> = {}
  const type = event.node.req.headers['content-type'] || ''
  if (type.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event) || []
    const lists = new Map<string, string[]>()
    const uploads = new Map<string, (UploadedFile & { data: Buffer })[]>()
    for (const part of parts) {
      if (!part.name) {
        continue
      }
      if (part.filename) {
        const data = Buffer.from(part.data)
        const list = uploads.get(part.name) ?? []
        list.push({
          name: part.filename,
          type: part.type || 'application/octet-stream',
          size: data.length,
          data,
        })
        uploads.set(part.name, list)
        continue
      }
      const value = Buffer.from(part.data).toString('utf8')
      const list = lists.get(part.name) ?? []
      list.push(value)
      lists.set(part.name, list)
    }
    for (const field of content.fields) {
      if (field.type === 'checkbox' || (field.type === 'image_select' && field.text?.allowMultiple) || (field.type === 'select' && field.text?.selectMultiple.enabled)) {
        input[field.key] = lists.get(field.key) ?? []
      }
      else if (field.type === 'file') {
        const list = uploads.get(field.key) ?? []
        files[field.key] = field.text?.fileMultiple.enabled ? list : (list[0] ?? null)
      }
      else {
        input[field.key] = lists.get(field.key)?.[0] ?? ''
      }
    }
    return { input, files }
  }

  const body = await readBody(event)
  const values = isRecord(body) && isRecord(body.values) ? body.values : isRecord(body) ? body : {}
  for (const field of content.fields) {
    if (field.type !== 'file') {
      input[field.key] = values[field.key]
    }
  }
  return { input, files }
}

function rowToRecord(row: FormRow): FormRecord {
  return {
    id: Number(row.id),
    name: row.name,
    content: readStoredContent(row.content),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  }
}

function asIso(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  return typeof value === 'string' ? value : ''
}

function nowIso(): string {
  return new Date().toISOString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
