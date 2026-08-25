import { createRequire } from 'node:module'
import { join } from 'node:path'

/**
 * `require` rooted at the app directory (`process.cwd()`), for native addons
 * such as `better-sqlite3`.
 *
 * `createRequire()` needs a *file* path as the calling module; it then walks
 * `node_modules` from that file's folder. We pass `package.json` only as that
 * anchor (the file is not read). A directory path is not accepted.
 *
 * `import.meta.url` cannot be used: Nitro rewrites it to `file:///_entry.js`,
 * which Node rejects.
 */
export const nodeRequire = createRequire(join(process.cwd(), 'package.json'))
