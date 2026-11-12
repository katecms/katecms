import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import MagicString from 'magic-string'
import { addVitePlugin } from '@nuxt/kit'

/** Packages whose runtime SFCs may use admin component tags. */
export const ADMIN_COMPONENT_PACKAGES = [
  'katecms',
  'katecms-form-builder',
  'katecms-seo',
] as const

/**
 * Registers admin Vue files for tag resolution inside the CMS packages.
 * They stay out of Nuxt's component dirs, so a host page cannot use them.
 */
export function addAdminComponents(options: { path: string, prefix: string }) {
  const components = loadAdminComponents(options.path, options.prefix)
  addVitePlugin({
    name: 'katecms:admin-components',
    enforce: 'post',
    transform(code, id) {
      if (!isAdminConsumerId(id) || !code.includes(options.prefix))
        return
      return rewriteAdminComponents(code, components, id, options.prefix) ?? undefined
    },
  })
}

export function loadAdminComponents(dir: string, prefix: string): Map<string, string> {
  const map = new Map<string, string>()
  let entries: string[]
  try {
    entries = readdirSync(dir, { recursive: true, encoding: 'utf8' })
  }
  catch {
    return map
  }
  for (const entry of entries) {
    if (!entry.endsWith('.vue'))
      continue
    const base = entry.split(/[/\\]/).pop()!.replace(/\.vue$/, '')
    const name = `${prefix}${base}`
    const file = join(dir, entry)
    const previous = map.get(name)
    if (previous)
      throw new Error(`Duplicate admin component ${name}: ${previous} and ${file}`)
    map.set(name, file)
  }
  return map
}

export function isAdminConsumerId(id: string): boolean {
  const file = id.replace(/\\/g, '/').split('?')[0]?.split('#')[0] ?? ''
  if (!file.endsWith('.vue'))
    return false
  const names = [...ADMIN_COMPONENT_PACKAGES].sort((a, b) => b.length - a.length)
  for (const name of names) {
    const marker = `/${name}/`
    let from = 0
    while (from < file.length) {
      const at = file.indexOf(marker, from)
      if (at < 0)
        break
      const rest = file.slice(at + marker.length)
      if (rest.startsWith('src/runtime/') || rest.startsWith('dist/runtime/'))
        return true
      from = at + marker.length
    }
  }
  return false
}

export function rewriteAdminComponents(
  code: string,
  components: Map<string, string>,
  id: string,
  prefix: string,
): { code: string, map: ReturnType<MagicString['generateMap']> } | null {
  const current = id.split('?')[0]?.split('#')[0] ?? id
  const pattern = componentCallPattern(prefix)
  const used = new Map<string, string>()
  const edits: Array<{ start: number, end: number, name: string }> = []
  for (const match of code.matchAll(pattern)) {
    const name = match.groups?.name || match.groups?.hName
    const file = name ? components.get(name) : undefined
    if (!name || !file || sameFile(file, current) || match.index == null)
      continue
    edits.push({ start: match.index, end: match.index + match[0].length, name })
    if (!used.has(name))
      used.set(name, `__mirai_${name}`)
  }
  if (!edits.length)
    return null
  const source = new MagicString(code)
  for (const edit of edits)
    source.overwrite(edit.start, edit.end, used.get(edit.name)!)
  const imports = [...used.entries()]
    .map(([name, local]) => `import ${local} from ${JSON.stringify(importPath(components.get(name)!))}`)
    .join('\n')
  source.prepend(`${imports}\n`)
  return {
    code: source.toString(),
    map: source.generateMap({ hires: true }),
  }
}

function componentCallPattern(prefix: string): RegExp {
  const safe = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `(?<=[\\s(=;])_?resolveComponent\\d*\\s*\\(\\s*(?<quote>["'\`])(?<name>${safe}[A-Za-z0-9]*)\\k<quote>\\s*\\)|(?<=\\bh\\s*\\(\\s*)(?<hName>${safe}[A-Za-z0-9]*)\\b`,
    'g',
  )
}

function importPath(file: string): string {
  return file.replace(/\\/g, '/')
}

function sameFile(left: string, right: string): boolean {
  const a = resolve(left)
  const b = resolve(right)
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}
