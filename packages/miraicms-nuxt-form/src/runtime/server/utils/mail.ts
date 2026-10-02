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
  const destination = to.trim()
  if (!EMAIL_PATTERN.test(destination)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid test recipient.' })
  }
  const row = await readRow()
  if (!row.host.trim() || !row.from_email.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Set the SMTP host and from address first.' })
  }
  const transport = nodemailer.createTransport({
    host: row.host.trim(),
    port: clampPort(row.port),
    secure: row.encryption === 'ssl',
    auth: row.username ? { user: row.username, pass: row.password } : undefined,
    requireTLS: row.encryption === 'starttls',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
  try {
    await transport.sendMail({
      from: formatFrom(row.from_name, row.from_email),
      to: destination,
      subject: 'MiraiCMS form mail test',
      text: 'This is a test message from MiraiCMS forms.',
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send the test message.'
    throw createError({ statusCode: 400, statusMessage: message.slice(0, 300) })
  }
  finally {
    transport.close()
  }
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
  const clean = name.replace(/"/g, '').trim()
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
