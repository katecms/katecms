import { createError } from 'h3'
import { sql } from 'kysely'
import nodemailer from 'nodemailer'
import type { MailSettings } from '../../form/model'
import { getFormDb } from './db'

interface MailRow {
  host: string
  port: number
  encryption: string
  username: string
  password: string
  from_email: string
  from_name: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface SubmissionMailFile {
  name: string
  type: string
  content: Buffer
}

export interface SubmissionMail {
  formName: string
  to: string
  fromMail: string
  fromName: string
  cc: string
  bcc: string
  replyTo: string
  lines: { label: string, value: string }[]
  files: SubmissionMailFile[]
}

export async function readMailSettings(): Promise<MailSettings> {
  const row = await readRow()
  return {
    host: row.host || '',
    port: clampPort(row.port),
    encryption: asEncryption(row.encryption),
    username: row.username || '',
    fromEmail: row.from_email || '',
    fromName: row.from_name || '',
    passwordSet: Boolean(row.password),
  }
}

export async function writeMailSettings(body: unknown): Promise<MailSettings> {
  const current = await readRow()
  const input = isRecord(body) ? body : {}
  const host = clip(input.host, 200)
  const port = clampPort(Number(input.port))
  const encryption = asEncryption(input.encryption)
  const username = clip(input.username, 200)
  const fromEmail = clip(input.fromEmail, 200)
  const fromName = clip(input.fromName, 200)
  const nextPassword = typeof input.password === 'string' && input.password.length > 0
    ? input.password.slice(0, 400)
    : current.password
  if (fromEmail && !EMAIL_PATTERN.test(fromEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid from address.' })
  }
  await sql`
    UPDATE miraicms_form_mail
    SET host = ${host},
        port = ${port},
        encryption = ${encryption},
        username = ${username},
        password = ${nextPassword},
        from_email = ${fromEmail},
        from_name = ${fromName}
    WHERE id = 1
  `.execute(getFormDb())
  return readMailSettings()
}

export async function sendTestMail(to: string): Promise<void> {
  const destination = addressList(to)
  if (!destination) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid test recipient.' })
  }
  const row = await requireSmtp()
  const transport = createTransport(row)
  try {
    await transport.sendMail({
      from: formatFrom(row.from_name, row.from_email),
      to: destination,
      subject: 'MiraiCMS form mail test',
      text: 'This is a test message from MiraiCMS forms.',
    })
  }
  catch (error) {
    throw mailError(error, 'Could not send the test message.')
  }
  finally {
    transport.close()
  }
}

export async function sendSubmissionMail(message: SubmissionMail): Promise<void> {
  const to = addressList(message.to)
  if (!to) {
    return
  }
  const row = await requireSmtp()
  const fromEmail = singleAddress(message.fromMail) || row.from_email.trim()
  const fromName = headerText(message.fromName) || row.from_name
  const transport = createTransport(row)
  try {
    await transport.sendMail({
      from: formatFrom(fromName, fromEmail),
      to,
      cc: addressList(message.cc),
      bcc: addressList(message.bcc),
      replyTo: singleAddress(message.replyTo),
      subject: headerText(`New entry: ${message.formName}`) || 'New form entry',
      text: submissionText(message),
      attachments: message.files.map(file => ({
        filename: safeAttachmentName(file.name),
        content: file.content,
        contentType: file.type || undefined,
      })),
    })
  }
  catch (error) {
    const detail = error instanceof Error ? error.message : 'Could not send the form email.'
    throw new Error(detail.slice(0, 300))
  }
  finally {
    transport.close()
  }
}

async function requireSmtp(): Promise<MailRow> {
  const row = await readRow()
  if (!row.host.trim() || !row.from_email.trim()) {
    const statusMessage = 'Set the SMTP host and from address first.'
    throw createError({ statusCode: 400, statusMessage, data: { message: statusMessage } })
  }
  return row
}

function createTransport(row: MailRow) {
  return nodemailer.createTransport({
    host: row.host.trim(),
    port: clampPort(row.port),
    secure: row.encryption === 'ssl',
    auth: row.username ? { user: row.username, pass: row.password } : undefined,
    requireTLS: row.encryption === 'starttls',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

function submissionText(message: SubmissionMail): string {
  const lines = [`Form: ${headerText(message.formName) || 'Form'}`, '']
  for (const line of message.lines) {
    lines.push(`${headerText(line.label) || 'Field'}: ${line.value}`)
  }
  if (message.files.length) {
    lines.push('', `Files: ${message.files.map(file => safeAttachmentName(file.name)).join(', ')}`)
  }
  return lines.join('\n')
}

function addressList(value: string): string | undefined {
  const parts = value.split(',').map(part => headerText(part)).filter(part => EMAIL_PATTERN.test(part))
  return parts.length ? parts.join(', ') : undefined
}

function singleAddress(value: string): string | undefined {
  const address = headerText(value)
  return EMAIL_PATTERN.test(address) ? address : undefined
}

function headerText(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function safeAttachmentName(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file'
  return base.replace(/[\r\n"]/g, '').slice(0, 120) || 'file'
}

function mailError(error: unknown, fallback: string): never {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    throw error
  }
  const message = error instanceof Error ? error.message : fallback
  throw createError({ statusCode: 400, statusMessage: message.slice(0, 300) })
}

async function readRow(): Promise<MailRow> {
  const result = await sql<MailRow>`
    SELECT host, port, encryption, username, password, from_email, from_name
    FROM miraicms_form_mail
    WHERE id = 1
  `.execute(getFormDb())
  return result.rows[0] ?? {
    host: '',
    port: 587,
    encryption: 'starttls',
    username: '',
    password: '',
    from_email: '',
    from_name: '',
  }
}

function formatFrom(name: string, email: string): string {
  const clean = name.replace(/[\r\n"]/g, '').trim()
  return clean ? `"${clean}" <${email}>` : email
}

function asEncryption(value: unknown): MailSettings['encryption'] {
  return value === 'none' || value === 'ssl' || value === 'starttls' ? value : 'starttls'
}

function clampPort(value: number): number {
  if (!Number.isFinite(value)) {
    return 587
  }
  return Math.min(65535, Math.max(1, Math.round(value)))
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
