import { createError } from 'h3'
import type { H3Event } from 'h3'
import { getRequestIP, readBody, readMultipartFormData } from 'h3'
import { sql } from 'kysely'
import type {
  FormContent,
  FormListItem,
  FormRecord,
  FormStatus,
  PublicForm,
  UploadedFile,
} from '../../form/model'
import {
  createEmptyContent,
  normalizeFormContent,
  parseContent,
  slugify,
  storesValue,
  submissionErrors,
  textStoredValue,
} from '../../form/model'
import { getFormDb, maxFileBytes } from './db'
import { applyServerFormBreakpoints } from './breakpoints'
import { deleteFormUploads, deleteStoredFile, saveFormFile } from './uploads'

interface FormRow {
  id: number
  name: string
  slug: string
  status: string
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
  const result = await sql<Pick<FormRow, 'id' | 'name' | 'slug' | 'status' | 'content' | 'updated_at'>>`
    SELECT id, name, slug, status, content, updated_at
    FROM miraicms_forms
    ORDER BY updated_at DESC, id DESC
  `.execute(getFormDb())
  return result.rows.map((row) => {
    const content = readStoredContent(row.content)
    return {
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      status: asStatus(row.status),
      fieldCount: content.fields.length,
      updatedAt: asIso(row.updated_at),
    }
  })
}

export async function readForm(id: number): Promise<FormRecord | null> {
  const result = await sql<FormRow>`
    SELECT id, name, slug, status, content, created_at, updated_at
    FROM miraicms_forms
    WHERE id = ${id}
  `.execute(getFormDb())
  const row = result.rows[0]
  return row ? rowToRecord(row) : null
}

export async function readPublicForm(id: number): Promise<PublicForm | null> {
  const record = await readForm(id)
  if (!record || record.status !== 'published') {
    return null
  }
  return {
    name: record.name,
    slug: record.slug,
    maxFileBytes: maxFileBytes(),
    content: record.content,
  }
}

export async function createForm(name: string): Promise<FormRecord> {
  const cleanName = name.trim().slice(0, NAME_MAX)
  if (!cleanName) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a form name.' })
  }
  const slug = await uniqueSlug(slugify(cleanName))
  applyServerFormBreakpoints()
  const content = JSON.stringify(createEmptyContent())
  const now = nowIso()
  const result = await sql<{ id: number }>`
    INSERT INTO miraicms_forms (name, slug, status, content, created_at, updated_at)
    VALUES (${cleanName}, ${slug}, 'draft', ${content}, ${now}, ${now})
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
  const status: FormStatus = input.status === 'published' || input.status === 'draft'
    ? input.status
    : current.status
  applyServerFormBreakpoints()
  const content = JSON.stringify(normalizeFormContent(input.content ?? current.content))
  if (content.length > 1_000_000) {
    throw createError({ statusCode: 400, statusMessage: 'This form is too large to save.' })
  }
  await sql`
    UPDATE miraicms_forms
    SET name = ${name},
        status = ${status},
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
  if (!form || form.status !== 'published') {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  const { input, files } = await readSubmission(event, form.content)
  const errors = submissionErrors(form.content, input, files, maxFileBytes())
  if (Object.keys(errors).length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Check the highlighted fields.',
      data: { errors },
    })
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
    const values: { key: string, value: string }[] = []
    for (const field of form.content.fields) {
      if (!storesValue(field)) {
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
  return { ok: true, id: submissionId }
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'form'
  let n = 2
  while (true) {
    const existing = await sql<{ id: number }>`SELECT id FROM miraicms_forms WHERE slug = ${slug}`.execute(getFormDb())
    if (!existing.rows.length) {
      return slug
    }
    const suffix = `-${n}`
    slug = `${base.slice(0, 80 - suffix.length)}${suffix}`
    n++
  }
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
    slug: row.slug,
    status: asStatus(row.status),
    content: readStoredContent(row.content),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  }
}

function asStatus(value: string): FormStatus {
  return value === 'published' ? 'published' : 'draft'
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
