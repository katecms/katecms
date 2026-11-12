import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { randomBytes } from 'node:crypto'
import { useRuntimeConfig } from '#imports'

export function uploadRoot(): string {
  const configured = useRuntimeConfig().katecms?.form?.uploadDir
  if (typeof configured === 'string' && configured.trim()) {
    return resolve(configured.trim())
  }
  return resolve(process.cwd(), 'data', 'katecms-form')
}

export function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file'
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 120)
  return cleaned || 'file'
}

export async function saveFormFile(formId: number, submissionId: number, name: string, data: Buffer): Promise<string> {
  const key = `${formId}/${submissionId}/${randomBytes(8).toString('hex')}-${safeFileName(name)}`
  const full = resolve(uploadRoot(), key)
  const root = uploadRoot()
  if (full !== root && !full.startsWith(root + sep)) {
    throw new Error('Refusing to store a file outside the form upload directory.')
  }
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, data)
  return key
}

export async function readStoredFile(key: string): Promise<Buffer | null> {
  const located = storedPath(key)
  if (!located) {
    return null
  }
  try {
    return await readFile(located)
  }
  catch {
    return null
  }
}

export async function deleteStoredFile(key: string): Promise<void> {
  const full = storedPath(key)
  if (!full) {
    return
  }
  await rm(full, { force: true })
}

function storedPath(key: string): string | null {
  const root = uploadRoot()
  const full = resolve(root, key)
  if (full !== root && !full.startsWith(root + sep)) {
    return null
  }
  return full
}

export async function deleteFormUploads(formId: number): Promise<void> {
  const root = uploadRoot()
  const full = resolve(root, String(formId))
  if (full !== root && !full.startsWith(root + sep)) {
    return
  }
  await rm(full, { recursive: true, force: true })
}
