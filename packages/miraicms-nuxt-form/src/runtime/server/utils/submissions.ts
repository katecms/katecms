import { createError } from 'h3'
import { sql } from 'kysely'
import type {
  FormContent,
  FormSubmissionDetail,
  FormSubmissionFile,
  FormSubmissionListItem,
  FormSubmissionValue,
} from '../../form/model'
import { getFormDb } from './db'
import { readForm } from './forms'
import { deleteStoredFile, readStoredFile } from './uploads'

const LIST_LIMIT = 100
const PREVIEW_LENGTH = 80

interface SubmissionRow {
  id: number
  form_id: number
  ip: string
  created_at: string | Date
}

interface ValueRow {
  submission_id: number
  field_key: string
  value: string
}

interface StoredFile {
  name: string
  size: number
  key: string
}

export async function listFormSubmissions(formId: number): Promise<{ submissions: FormSubmissionListItem[], total: number } | null> {
  const form = await readForm(formId)
  if (!form) {
    return null
  }
  const db = getFormDb()
  const totalRow = await sql<{ total: number | string }>`
    SELECT COUNT(*) AS total
    FROM miraicms_form_submissions
    WHERE form_id = ${formId}
  `.execute(db)
  const rows = await sql<SubmissionRow>`
    SELECT id, form_id, ip, created_at
    FROM miraicms_form_submissions
    WHERE form_id = ${formId}
    ORDER BY id DESC
    LIMIT ${LIST_LIMIT}
  `.execute(db)
  const ids = rows.rows.map(row => Number(row.id))
  const values = ids.length
    ? await sql<ValueRow>`
      SELECT submission_id, field_key, value
      FROM miraicms_form_submission_values
      WHERE submission_id IN (${sql.join(ids.map(id => sql`${id}`))})
      ORDER BY id ASC
    `.execute(db)
    : { rows: [] as ValueRow[] }
  const bySubmission = new Map<number, ValueRow[]>()
  for (const row of values.rows) {
    const id = Number(row.submission_id)
    const list = bySubmission.get(id) ?? []
    list.push(row)
    bySubmission.set(id, list)
  }
  return {
    total: Number(totalRow.rows[0]?.total) || 0,
    submissions: rows.rows.map(row => ({
      id: Number(row.id),
      createdAt: asIso(row.created_at),
      preview: previewOf(form.content, bySubmission.get(Number(row.id)) ?? []),
    })),
  }
}

export async function readFormSubmission(formId: number, submissionId: number): Promise<FormSubmissionDetail | null> {
  const form = await readForm(formId)
  if (!form) {
    return null
  }
  const row = await loadSubmission(formId, submissionId)
  if (!row) {
    return null
  }
  const values = await loadValues(submissionId)
  return {
    id: Number(row.id),
    formId,
    formName: form.name,
    createdAt: asIso(row.created_at),
    ip: row.ip || '',
    values: presentValues(form.content, formId, submissionId, values),
  }
}

export async function deleteFormSubmission(formId: number, submissionId: number): Promise<boolean> {
  const row = await loadSubmission(formId, submissionId)
  if (!row) {
    return false
  }
  const values = await loadValues(submissionId)
  const keys = values.flatMap(item => storedFiles(item.value, formId, submissionId).map(file => file.key))
  const db = getFormDb()
  await sql`DELETE FROM miraicms_form_submission_values WHERE submission_id = ${submissionId}`.execute(db)
  await sql`DELETE FROM miraicms_form_submissions WHERE id = ${submissionId} AND form_id = ${formId}`.execute(db)
  await Promise.all(keys.map(key => deleteStoredFile(key)))
  return true
}

export async function readSubmissionFile(
  formId: number,
  submissionId: number,
  index: number,
): Promise<{ name: string, data: Buffer } | null> {
  const form = await readForm(formId)
  const row = await loadSubmission(formId, submissionId)
  if (!form || !row || !Number.isInteger(index) || index < 0) {
    return null
  }
  const values = await loadValues(submissionId)
  const file = orderedFiles(form.content, formId, submissionId, values)[index]
  if (!file) {
    return null
  }
  const data = await readStoredFile(file.key)
  if (!data) {
    return null
  }
  return { name: file.name, data }
}

function orderedFiles(
  content: FormContent,
  formId: number,
  submissionId: number,
  rows: ValueRow[],
): StoredFile[] {
  const types = new Map(content.fields.map(field => [field.key, field.type]))
  return rows.flatMap((row) => {
    if (types.get(row.field_key) !== 'file' && types.get(row.field_key) != null) {
      return []
    }
    return storedFiles(row.value, formId, submissionId)
  })
}
function presentValues(
  content: FormContent,
  formId: number,
  submissionId: number,
  rows: ValueRow[],
): FormSubmissionValue[] {
  const labels = new Map(content.fields.map(field => [field.key, field.label || field.key]))
  const types = new Map(content.fields.map(field => [field.key, field.type]))
  let index = 0
  return rows.map((row) => {
    const files = (types.get(row.field_key) === 'file' || types.get(row.field_key) == null)
      ? storedFiles(row.value, formId, submissionId)
      : []
    const shown: FormSubmissionFile[] = files.map((file) => {
      const item = { name: file.name, size: file.size, index }
      index += 1
      return item
    })
    return {
      key: row.field_key,
      label: labels.get(row.field_key) || row.field_key,
      text: shown.length ? '' : row.value,
      files: shown,
    }
  })
}

function previewOf(content: FormContent, rows: ValueRow[]): string {
  const types = new Map(content.fields.map(field => [field.key, field.type]))
  for (const row of rows) {
    if (types.get(row.field_key) === 'file') {
      continue
    }
    const text = row.value.replace(/\s+/g, ' ').trim()
    if (text) {
      return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text
    }
  }
  return ''
}

function storedFiles(value: string, formId: number, submissionId: number): StoredFile[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  }
  catch {
    return []
  }
  const list = Array.isArray(parsed) ? parsed : [parsed]
  const prefix = `${formId}/${submissionId}/`
  const files: StoredFile[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const record = item as { name?: unknown, size?: unknown, key?: unknown }
    if (typeof record.key !== 'string' || !record.key.startsWith(prefix) || record.key.includes('..')) {
      continue
    }
    files.push({
      name: typeof record.name === 'string' && record.name.trim() ? record.name : 'file',
      size: typeof record.size === 'number' && Number.isFinite(record.size) ? record.size : 0,
      key: record.key,
    })
  }
  return files
}

async function loadSubmission(formId: number, submissionId: number): Promise<SubmissionRow | undefined> {
  const result = await sql<SubmissionRow>`
    SELECT id, form_id, ip, created_at
    FROM miraicms_form_submissions
    WHERE id = ${submissionId} AND form_id = ${formId}
  `.execute(getFormDb())
  return result.rows[0]
}

async function loadValues(submissionId: number): Promise<ValueRow[]> {
  const result = await sql<ValueRow>`
    SELECT submission_id, field_key, value
    FROM miraicms_form_submission_values
    WHERE submission_id = ${submissionId}
    ORDER BY id ASC
  `.execute(getFormDb())
  return result.rows
}

function asIso(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  return typeof value === 'string' ? value : ''
}

export function missingForm(): never {
  throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
}
