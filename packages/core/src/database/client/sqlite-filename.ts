import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `:memory:` and `file:` URIs with `mode=memory`. Other `file:` URIs are disk paths.
 */
export function isMemorySqliteFilename(filename: string): boolean {
  if (filename === ':memory:') {
    return true
  }
  if (!filename.startsWith('file:')) {
    return false
  }
  const queryIndex = filename.indexOf('?')
  if (queryIndex === -1) {
    return false
  }
  const query = filename.slice(queryIndex + 1).replace(/#.*$/, '')
  return new URLSearchParams(query).get('mode') === 'memory'
}

/** Resolve a SQLite filename and create parent directories for disk files. */
export function resolveSqliteFilename(filename: string): string {
  if (isMemorySqliteFilename(filename)) {
    return filename
  }
  const path = sqliteFilePath(filename)
  mkdirSync(dirname(path), { recursive: true })
  return path
}

function sqliteFilePath(filename: string): string {
  if (!filename.startsWith('file:')) {
    return isAbsolute(filename) ? filename : resolve(filename)
  }
  const stripped = filename.replace(/[?#].*$/, '')
  try {
    return fileURLToPath(stripped)
  }
  catch {
    const rest = stripped.slice('file:'.length)
    return isAbsolute(rest) ? rest : resolve(rest)
  }
}
