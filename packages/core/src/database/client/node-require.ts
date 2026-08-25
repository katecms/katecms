import { createRequire } from 'node:module'
import { join } from 'node:path'

function requireAnchor(): string {
  const url = import.meta.url
  if (url.startsWith('file:') && !url.includes('_entry')) {
    return url
  }
  return join(process.cwd(), 'package.json')
}

/**
 * `require` for native addons such as `better-sqlite3`.
 *
 * Prefers this module's real `import.meta.url` (when `@miraicms/core` is not
 * inlined by Nitro). Falls back to `package.json` in `process.cwd()` because
 * Nitro rewrites `import.meta.url` to `file:///_entry.js`.
 *
 * `createRequire()` needs a *file* path as the calling module; a directory
 * path is not accepted. `package.json` is only that anchor (the file is not read).
 */
export const nodeRequire = createRequire(requireAnchor())
