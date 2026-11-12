/**
 * Build `.ai/` — a compact map of the KateCMS repo for later AI sessions.
 *
 *   pnpm ai:index
 *
 * Reads source only (no dist, node_modules, or lockfile). Writes:
 *   .ai/INDEX.md      how to use the map
 *   .ai/files.jsonl   one source file per line (imports, exports, summary)
 *   .ai/symbols.jsonl exported name → file
 *   .ai/routes.json   pages, HTTP handlers, plugins, auto-imports
 *   .ai/domain.json   packages, public API, tables, field types
 *
 * English, short keys, stable order. No timestamps, so a rerun changes git
 * only when the tree changes.
 */

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outDir = path.join(root, '.ai')

const SKIP_DIR = new Set([
  'node_modules',
  'dist',
  '.nuxt',
  '.output',
  '.git',
  '.ai',
  'coverage',
  'reports',
  '.nyc_output',
  '.data',
  '.cache',
  '.temp',
  '.tmp',
  '.vercel_build_output',
])

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.vue', '.scss', '.css', '.sql'])
const ASSET_EXT = new Set([
  '.json', '.md', '.svg', '.yml', '.yaml',
  '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
])
const RESOLVE_EXT = ['.ts', '.tsx', '.vue', '.mjs', '.js', '.scss', '.css', '.json', '.d.ts']

const KIND_LABEL = {
  api: 'HTTP handler',
  page: 'Page',
  module: 'Nuxt module',
  composable: 'Composable',
  'field-ui': 'Field widget',
  component: 'Component',
  middleware: 'Route middleware',
  plugin: 'Plugin',
  query: 'DB queries',
  db: 'Database',
  schema: 'DB schema',
  migration: 'Migration',
  type: 'Types',
  'field-logic': 'Field logic',
  auth: 'Auth',
  media: 'Media',
  style: 'Styles',
  test: 'Test',
  fixture: 'Fixture',
  doc: 'Doc',
  manifest: 'Package manifest',
  config: 'Config',
  asset: 'Asset',
  script: 'Script',
  mod: 'Source',
}

const NUXT_BUILTINS = new Set([
  'ref', 'computed', 'watch', 'watchEffect', 'reactive', 'readonly',
  'onMounted', 'onBeforeUnmount', 'onUnmounted', 'nextTick',
  'defineProps', 'defineEmits', 'defineExpose', 'defineModel', 'withDefaults',
  'useRoute', 'useRouter', 'useHead', 'useSeoMeta', 'useRuntimeConfig',
  'navigateTo', 'useFetch', 'useAsyncData', 'useState', 'useNuxtApp', 'useRequestURL',
  'defineEventHandler', 'defineNuxtPlugin', 'defineNuxtRouteMiddleware',
  'getQuery', 'readBody', 'readMultipartFormData', 'createError', 'sendRedirect',
  'setCookie', 'getCookie', 'deleteCookie', 'setResponseStatus', 'getHeader',
  'assertMethod', 'getRouterParam', 'getRequestURL',
])

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function rel(abs) {
  return toPosix(path.relative(root, abs))
}

function clip(value, max = 180) {
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (text.length <= max)
    return text
  return `${text.slice(0, max - 3)}...`
}

function walk(dir, into) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name))
      continue
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      const relDir = rel(abs)
      if (relDir === 'public/uploads' || relDir.endsWith('/public/uploads') || relDir.endsWith('/public/seed'))
        continue
      walk(abs, into)
      continue
    }
    if (!ent.isFile())
      continue
    if (ent.name === 'pnpm-lock.yaml' || ent.name === 'package-lock.json')
      continue
    const relFile = rel(abs)
    if (relFile.includes('/public/uploads/') || relFile.includes('/public/seed/'))
      continue
    const ext = path.extname(ent.name).toLowerCase()
    if (!CODE_EXT.has(ext) && !ASSET_EXT.has(ext))
      continue
    into.push(rel(abs))
  }
}

function stripComments(code) {
  let out = ''
  let i = 0
  let mode = 'code'
  while (i < code.length) {
    const c = code[i]
    const n = code[i + 1]
    if (mode === 'code') {
      if (c === '/' && n === '/') {
        mode = 'line'
        i += 2
        continue
      }
      if (c === '/' && n === '*') {
        mode = 'block'
        i += 2
        continue
      }
      if (c === '\'' || c === '"' || c === '`') {
        mode = c
        out += c
        i++
        continue
      }
      out += c
      i++
      continue
    }
    if (mode === 'line') {
      if (c === '\n') {
        mode = 'code'
        out += c
      }
      i++
      continue
    }
    if (mode === 'block') {
      if (c === '*' && n === '/') {
        mode = 'code'
        i += 2
        continue
      }
      if (c === '\n')
        out += c
      i++
      continue
    }
    out += c
    if (c === '\\') {
      out += code[i + 1] ?? ''
      i += 2
      continue
    }
    if (c === mode)
      mode = 'code'
    i++
  }
  return out
}

function isStmtStart(code, index) {
  let j = index - 1
  while (j >= 0 && (code[j] === ' ' || code[j] === '\t'))
    j--
  if (j < 0)
    return true
  return code[j] === '\n' || code[j] === ';' || code[j] === '{'
}

function readStatement(code, start) {
  let depth = 0
  let quote = null
  for (let i = start; i < code.length; i++) {
    const c = code[i]
    if (quote) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === quote)
        quote = null
      continue
    }
    if (c === '\'' || c === '"' || c === '`') {
      quote = c
      continue
    }
    if (c === '(' || c === '{' || c === '[')
      depth++
    else if (c === ')' || c === '}' || c === ']')
      depth = Math.max(0, depth - 1)
    else if (c === ';' && depth === 0)
      return code.slice(start, i + 1)
    else if (c === '\n' && depth === 0) {
      const rest = code.slice(i + 1)
      if (!/^\s*(?:from\b|as\b)/.test(rest))
        return code.slice(start, i + 1)
    }
  }
  return code.slice(start)
}

function statements(code) {
  const out = []
  const re = /\b(import|export)\b/g
  let from = 0
  while (from < code.length) {
    re.lastIndex = from
    let hit = null
    let m = re.exec(code)
    while (m) {
      const dynamic = m[1] === 'import' && code[m.index + 6] === '('
      if (!dynamic && isStmtStart(code, m.index)) {
        hit = m
        break
      }
      m = re.exec(code)
    }
    if (!hit)
      break
    const text = readStatement(code, hit.index).trim()
    if (text)
      out.push(text)
    from = hit.index + Math.max(text.length, 1)
  }
  return out
}

function parseNameList(list) {
  const parts = []
  let depth = 0
  let cur = ''
  for (const c of list) {
    if (c === '<' || c === '(' || c === '{' || c === '[')
      depth++
    else if (c === '>' || c === ')' || c === '}' || c === ']')
      depth = Math.max(0, depth - 1)
    if (c === ',' && depth === 0) {
      parts.push(cur)
      cur = ''
    }
    else {
      cur += c
    }
  }
  if (cur.trim())
    parts.push(cur)
  const names = []
  for (const part of parts) {
    let s = part.trim()
    if (!s)
      continue
    let typeOnly = false
    if (s.startsWith('type ')) {
      typeOnly = true
      s = s.slice(5).trim()
    }
    const bits = s.split(/\s+as\s+/)
    const imported = bits[0].trim()
    const local = (bits[1] || bits[0]).trim()
    if (!/^[A-Za-z_$][\w$]*$/.test(local) || !/^[A-Za-z_$*][\w$]*$/.test(imported))
      continue
    names.push({ imported, local, typeOnly })
  }
  return names
}

function parseImportBindings(text, spec) {
  let clause = text.replace(/^import\s+type\s+/, '').replace(/^import\s+/, '')
  clause = clause.replace(/\s+from\s+['"][\s\S]*$/, '').trim()
  const bindings = []
  const ns = clause.match(/\*\s+as\s+(\w+)/)
  if (ns)
    bindings.push({ local: ns[1], imported: '*', spec })
  const brace = clause.match(/\{([\s\S]*)\}/)
  if (brace) {
    for (const item of parseNameList(brace[1]))
      bindings.push({ local: item.local, imported: item.imported, spec, typeOnly: item.typeOnly })
  }
  const without = clause
    .replace(/\{[\s\S]*\}/, '')
    .replace(/\*\s+as\s+\w+/, '')
    .replace(/\btype\b/g, '')
    .split(',')[0]
    .trim()
  if (/^[A-Za-z_$][\w$]*$/.test(without))
    bindings.push({ local: without, imported: 'default', spec })
  return bindings
}

function addDecls(text, local) {
  const rules = [
    [/export\s+default\s+(?:async\s+)?function\s*\*?\s+(\w+)/, 'fn'],
    [/export\s+(?:declare\s+)?(?:async\s+)?function\s*\*?\s+(\w+)/, 'fn'],
    [/export\s+(?:declare\s+)?(?:abstract\s+)?class\s+(\w+)/, 'class'],
    [/export\s+(?:declare\s+)?enum\s+(\w+)/, 'enum'],
    [/export\s+interface\s+(\w+)/, 'iface'],
    [/export\s+type\s+(\w+)\b/, 'type'],
    [/export\s+(?:declare\s+)?(const|let|var)\s+(\w+)/, 'bind'],
  ]
  for (const [re, kind] of rules) {
    const m = text.match(re)
    if (!m)
      continue
    if (kind === 'bind')
      local.push({ n: m[2], k: m[1] === 'const' ? 'const' : m[1] })
    else
      local.push({ n: m[1], k: kind })
    return
  }
}

function leadDoc(source) {
  const m = source.match(/^\uFEFF?\s*\/\*\*([\s\S]*?)\*\//)
  if (!m)
    return null
  const text = m[1]
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text)
    return null
  const sentence = text.split(/(?<=\.)\s/)[0]
  return clip(sentence, 160)
}

function parseCode(source) {
  const code = stripComments(source)
  const local = []
  const reexports = []
  const specOrder = []
  const bindings = []

  function addSpec(spec) {
    const clean = spec.split('?')[0].split('#')[0]
    if (clean && !specOrder.includes(clean))
      specOrder.push(clean)
  }

  for (const text of statements(code)) {
    if (text.startsWith('import')) {
      const side = text.match(/^import\s+['"]([^'"]+)['"]/)
      const from = text.match(/\bfrom\s+['"]([^'"]+)['"]/)
      const spec = from?.[1] || side?.[1]
      if (!spec)
        continue
      addSpec(spec)
      if (from)
        bindings.push(...parseImportBindings(text, spec))
      continue
    }
    if (!text.startsWith('export'))
      continue
    const from = text.match(/\bfrom\s+['"]([^'"]+)['"]/)
    if (from) {
      addSpec(from[1])
      const ns = text.match(/export\s+(?:type\s+)?\*\s+as\s+(\w+)/)
      const star = /export\s+(?:type\s+)?\*\s+from\b/.test(text)
      const brace = text.match(/\{([\s\S]*)\}/)
      reexports.push({
        spec: from[1],
        star: Boolean(star && !ns),
        ns: ns?.[1] || null,
        names: brace ? parseNameList(brace[1]) : [],
        to: null,
      })
      continue
    }
    const brace = text.match(/^export\s+(?:type\s+)?\{([\s\S]*)\}\s*$/)
    if (brace) {
      for (const item of parseNameList(brace[1])) {
        const binding = bindings.find(row => row.local === item.imported)
        if (binding) {
          reexports.push({
            spec: binding.spec,
            star: false,
            ns: null,
            names: [{ imported: binding.imported, local: item.local, typeOnly: item.typeOnly || binding.typeOnly }],
            to: null,
          })
          addSpec(binding.spec)
        }
        else if (!local.some(row => row.n === item.local)) {
          local.push({ n: item.local, k: item.typeOnly ? 'type' : 'const' })
        }
      }
      continue
    }
    addDecls(text, local)
  }

  for (const m of code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g))
    addSpec(m[1])
  for (const m of code.matchAll(/import\.meta\.glob(?:\s*<[\s\S]*?>)?\(\s*['"]([^'"]+)['"]/g))
    specOrder.push(`glob:${m[1]}`)

  return { local, reexports, specOrder, bindings }
}

function sassSpecs(source) {
  const specs = []
  for (const m of source.matchAll(/@(?:use|forward|import)\s+['"]([^'"]+)['"]/g)) {
    if (!specs.includes(m[1]))
      specs.push(m[1])
  }
  return specs
}

function kindOf(file) {
  const base = path.posix.basename(file)
  if (base.endsWith('.test.ts') || file.includes('/test/')) {
    if (file.includes('/fixtures/'))
      return 'fixture'
    return 'test'
  }
  if (file.includes('/fixtures/'))
    return 'fixture'
  if (base === 'module.ts')
    return 'module'
  if (file.includes('/server/api/') || file.includes('/server/routes/'))
    return 'api'
  if (file.includes('/pages/') && file.endsWith('.vue'))
    return 'page'
  if (file.includes('/middleware/'))
    return 'middleware'
  if (file.includes('/plugins/'))
    return 'plugin'
  if (file.includes('/composables/'))
    return 'composable'
  if (file.includes('/internal/fields/'))
    return 'field-ui'
  if (file.endsWith('.vue'))
    return 'component'
  if (file.endsWith('.scss') || file.endsWith('.css'))
    return 'style'
  if (file.endsWith('.sql') || base === 'schema.ts')
    return 'schema'
  if (file.includes('/migrations/'))
    return 'migration'
  if (file.includes('/database/queries/'))
    return 'query'
  if (file.includes('/database/'))
    return 'db'
  if (file.includes('/config/types/') || base.endsWith('.d.ts') || base === 'types.ts')
    return 'type'
  if (file.includes('/fields/'))
    return 'field-logic'
  if (file.includes('/auth/'))
    return 'auth'
  if (file.includes('/media/'))
    return 'media'
  if (file.endsWith('.md'))
    return 'doc'
  if (base === 'package.json')
    return 'manifest'
  if (file.startsWith('scripts/'))
    return 'script'
  if (/\.(json|ya?ml|mjs)$/.test(file) || base.includes('config') || base.includes('tsconfig'))
    return 'config'
  if (ASSET_EXT.has(path.posix.extname(file)))
    return 'asset'
  return 'mod'
}

function isClientFile(file) {
  if (file.includes('/runtime/server/') || file.includes('/server/'))
    return false
  if (file.endsWith('module.ts'))
    return false
  if (file.includes('/test/') || file.endsWith('.test.ts'))
    return false
  if (file.includes('/runtime/'))
    return true
  if (file.startsWith('playground/') && !file.endsWith('nuxt.config.ts') && !file.endsWith('tsconfig.json'))
    return true
  return false
}

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8'))
}

function loadPackages(files) {
  const packages = []
  for (const file of files) {
    if (path.posix.basename(file) !== 'package.json')
      continue
    const json = readJson(path.join(root, file))
    if (!json.name)
      continue
    packages.push({
      name: json.name,
      dir: path.posix.dirname(file) === '.' ? '' : path.posix.dirname(file),
      sum: json.description || '',
      json,
      file,
    })
  }
  packages.sort((a, b) => b.dir.length - a.dir.length)
  return packages
}

function packageOf(file, packages) {
  const hit = packages.find(pkg => pkg.dir && (file === pkg.dir || file.startsWith(`${pkg.dir}/`)))
  return hit?.name || packages.find(pkg => pkg.dir === '')?.name || 'root'
}

function toSource(pkgDir, exportPath, fileSet) {
  if (typeof exportPath !== 'string')
    return null
  let relPath = exportPath.replace(/^\.\//, '')
  const exact = pkgDir ? `${pkgDir}/${relPath}` : relPath
  if (fileSet.has(exact))
    return exact
  if (!relPath.startsWith('dist/'))
    return null
  let src = relPath
    .replace(/^dist\//, 'src/')
    .replace(/\.d\.mts$/, '.ts')
    .replace(/\.d\.ts$/, '.ts')
    .replace(/\.mjs$/, '.ts')
    .replace(/\.js$/, '.ts')
  const candidate = pkgDir ? `${pkgDir}/${src}` : src
  return fileSet.has(candidate) ? candidate : null
}

function pickCondition(value, client) {
  if (typeof value === 'string')
    return value
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return null
  const order = client
    ? ['browser', 'import', 'module', 'default']
    : ['import', 'node', 'module', 'default', 'require']
  for (const key of order) {
    if (!(key in value))
      continue
    const nested = pickCondition(value[key], client)
    if (nested)
      return nested
  }
  return null
}

function entryId(pkgName, sub, client) {
  const short = pkgName
    .replace(/^@katecms\//, '')
    .replace(/^katecms-/, '')
  const tail = sub === '.' ? '' : sub.replace(/^\.\//, '')
  if (client && sub === '.')
    return `${short}/browser`
  return tail ? `${short}/${tail}` : short
}

function packageEntries(pkg, fileSet) {
  const exportsField = pkg.json.exports
  const entries = []
  const seen = new Set()
  function add(sub, client) {
    let target = null
    if (exportsField && typeof exportsField === 'object' && !Array.isArray(exportsField))
      target = pickCondition(exportsField[sub], client)
    else if (typeof exportsField === 'string' && sub === '.')
      target = exportsField
    if (!target && sub === '.' && client && typeof pkg.json.browser === 'string')
      target = pkg.json.browser
    if (!target && sub === '.' && !client && typeof pkg.json.module === 'string')
      target = pkg.json.module
    if (!target && sub === '.' && !client && typeof pkg.json.main === 'string')
      target = pkg.json.main
    const source = target ? toSource(pkg.dir, target, fileSet) : null
    if (!source)
      return
    const id = entryId(pkg.name, sub, client)
    const key = `${id}:${source}`
    if (seen.has(key))
      return
    seen.add(key)
    entries.push({ id, p: source, client: Boolean(client), sub })
  }

  const subs = exportsField && typeof exportsField === 'object' && !Array.isArray(exportsField)
    ? Object.keys(exportsField)
    : ['.']
  for (const sub of subs) {
    if (sub === './package.json')
      continue
    add(sub, false)
    const nodeSource = entries.find(row => row.sub === sub && !row.client)?.p
    add(sub, true)
    const clientRow = [...entries].reverse().find(row => row.sub === sub && row.client)
    if (clientRow && nodeSource && clientRow.p === nodeSource)
      entries.pop()
  }
  return entries
}

function resolveRelative(fromFile, spec, fileSet) {
  const cleaned = spec.split('?')[0].split('#')[0]
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), cleaned))
  const candidates = []
  const add = (value) => {
    if (!candidates.includes(value))
      candidates.push(value)
  }
  add(base)
  for (const ext of RESOLVE_EXT)
    add(base + ext)
  for (const ext of RESOLVE_EXT)
    add(path.posix.join(base, `index${ext}`))
  add(path.posix.join(base, '_index.scss'))
  const name = path.posix.basename(base)
  const dir = path.posix.dirname(base)
  if (!name.startsWith('_')) {
    add(path.posix.join(dir, `_${name}`))
    for (const ext of ['.scss', '.css', '.sass'])
      add(path.posix.join(dir, `_${name}${ext}`))
  }
  for (const candidate of candidates) {
    if (fileSet.has(candidate))
      return candidate
    const src = distToSrcPath(candidate)
    if (src && fileSet.has(src))
      return src
  }
  return null
}

function distToSrcPath(candidate) {
  if (!candidate.includes('/dist/'))
    return null
  return candidate
    .replace('/dist/', '/src/')
    .replace(/\.d\.mts$/, '.ts')
    .replace(/\.d\.ts$/, '.ts')
    .replace(/\.mjs$/, '.ts')
    .replace(/\.js$/, '.ts')
}

function expandGlob(fromFile, pattern, fileSet) {
  const full = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), pattern))
  const body = full
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')
  const re = new RegExp(`^${body}$`)
  return [...fileSet].filter(file => re.test(file)).sort()
}

function externalName(spec) {
  if (spec.startsWith('node:') || spec.startsWith('#') || spec.startsWith('~') || spec.startsWith('sass:'))
    return spec
  if (spec.startsWith('@'))
    return spec.split('/').slice(0, 2).join('/')
  return spec.split('/')[0]
}

function resolveSpec(fromFile, spec, fileSet, packages) {
  if (spec.startsWith('glob:')) {
    return { im: expandGlob(fromFile, spec.slice(5), fileSet), ext: [], miss: [] }
  }
  if (spec.startsWith('.')) {
    const hit = resolveRelative(fromFile, spec, fileSet)
    if (hit)
      return { im: [hit], ext: [], miss: [] }
    return { im: [], ext: [], miss: [spec] }
  }
  const names = packages.map(pkg => pkg.name).sort((a, b) => b.length - a.length)
  const pkgName = names.find(name => spec === name || spec.startsWith(`${name}/`))
  if (pkgName) {
    const pkg = packages.find(item => item.name === pkgName)
    const sub = spec === pkgName ? '.' : `./${spec.slice(pkgName.length + 1)}`
    const client = isClientFile(fromFile)
    const entries = packageEntries(pkg, fileSet)
    const row = entries.find(item => item.sub === sub && item.client === client)
      || entries.find(item => item.sub === sub && !item.client)
      || entries.find(item => item.sub === sub)
    if (row)
      return { im: [row.p], ext: [], miss: [] }
    return { im: [], ext: [], miss: [spec] }
  }
  if (spec.startsWith('sass:'))
    return { im: [], ext: [spec], miss: [] }
  return { im: [], ext: [externalName(spec)], miss: [] }
}

function vueBlock(source, tag) {
  const chunks = []
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
  let open = openRe.exec(source)
  while (open) {
    if (open[0].endsWith('/>')) {
      open = openRe.exec(source)
      continue
    }
    const start = open.index + open[0].length
    const token = new RegExp(`</?${tag}\\b[^>]*>`, 'gi')
    token.lastIndex = start
    let depth = 1
    let hit = token.exec(source)
    while (hit) {
      if (hit[0].startsWith('</')) {
        depth--
        if (depth === 0) {
          chunks.push(source.slice(start, hit.index))
          openRe.lastIndex = hit.index + hit[0].length
          break
        }
      }
      else if (!hit[0].endsWith('/>')) {
        depth++
      }
      hit = token.exec(source)
    }
    open = openRe.exec(source)
  }
  return chunks
}

function vueParts(source) {
  const scripts = vueBlock(source, 'script')
  const templates = vueBlock(source, 'template')
  const styles = vueBlock(source, 'style')
  return {
    script: scripts.join('\n'),
    template: templates.join('\n'),
    style: styles.join('\n'),
  }
}

function declaredNames(code) {
  const names = new Set()
  for (const m of code.matchAll(/\b(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g))
    names.add(m[1])
  return names
}

function readBrace(code, openIndex) {
  let depth = 0
  let quote = null
  for (let i = openIndex; i < code.length; i++) {
    const c = code[i]
    if (quote) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === quote)
        quote = null
      continue
    }
    if (c === '\'' || c === '"' || c === '`') {
      quote = c
      continue
    }
    if (c === '{')
      depth++
    else if (c === '}') {
      depth--
      if (depth === 0)
        return code.slice(openIndex + 1, i)
    }
  }
  return ''
}

function shortType(raw) {
  let type = raw.replace(/\s+/g, ' ').trim().replace(/[,;]$/, '')
  let generated = false
  let optional = false
  const generatedMatch = type.match(/^Generated<([\s\S]+)>$/)
  if (generatedMatch) {
    generated = true
    type = generatedMatch[1].trim()
  }
  if (/\|\s*null\b/.test(type) || /\bnull\s*\|/.test(type)) {
    optional = true
    type = type.replace(/\s*\|\s*null\b/, '').replace(/\bnull\s*\|\s*/, '').trim()
  }
  if (type === 'TimestampNullable') {
    type = 'ts'
    optional = true
  }
  else if (type === 'Timestamp') {
    type = 'ts'
  }
  else if (type === 'Json' || type.startsWith('Json<')) {
    type = 'json'
  }
  if (type.length > 48)
    type = 'json'
  return `${type}${optional ? '?' : ''}${generated ? '*' : ''}`
}

function interfaceColumns(body) {
  const cols = []
  let depth = 0
  let quote = null
  let start = 0
  const parts = []
  for (let i = 0; i <= body.length; i++) {
    const c = body[i]
    if (quote) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === quote)
        quote = null
      continue
    }
    if (c === '\'' || c === '"' || c === '`') {
      quote = c
      continue
    }
    if (c === '<' || c === '(' || c === '{' || c === '[')
      depth++
    else if (c === '>' || c === ')' || c === '}' || c === ']')
      depth = Math.max(0, depth - 1)
    if ((i === body.length || c === '\n' || c === ';') && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  for (const part of parts) {
    const match = part.match(/^\s*(?:readonly\s+)?(\w+)(\??)\s*:\s*([\s\S]+)$/)
    if (!match)
      continue
    let type = shortType(match[3])
    if (match[2] && !type.endsWith('?') && !type.includes('?'))
      type = type.replace(/\*$/, '') + '?' + (type.endsWith('*') ? '*' : '')
    if (match[2] && type.endsWith('*') && !type.includes('?'))
      type = `${type.slice(0, -1)}?*`
    cols.push(`${match[1]}:${type}`)
  }
  return cols
}

function extractInterfaces(source) {
  const code = stripComments(source)
  const map = new Map()
  const re = /export\s+interface\s+(\w+)(?:\s+extends\s+[^{]+)?\s*\{/g
  let m = re.exec(code)
  while (m) {
    const open = m.index + m[0].length - 1
    map.set(m[1], readBrace(code, open))
    m = re.exec(code)
  }
  return map
}

function normalizePathExpr(expr) {
  if (!expr)
    return ''
  const value = expr.trim().replace(/,$/, '')
  if ((value.startsWith('\'') && value.endsWith('\'')) || (value.startsWith('"') && value.endsWith('"')))
    return value.slice(1, -1)
  if (value.startsWith('`') && value.endsWith('`')) {
    return value.slice(1, -1)
      .replace(/\$\{resolved\.adminPath\}/g, '{adminPath}')
      .replace(/\$\{adminPath\}/g, '{adminPath}')
      .replace(/\$\{[^}]+\}/g, '{expr}')
  }
  if (value.includes('loginPath'))
    return '{loginPath}'
  if (value.includes('registerPath'))
    return '{registerPath}'
  if (value.includes('adminPath'))
    return '{adminPath}'
  if (value === '\'\'' || value === '""')
    return ''
  return value
}

function nuxtPagePath(file) {
  const marker = '/pages/'
  const at = file.lastIndexOf(marker)
  let route = file.slice(at + marker.length).replace(/\.vue$/, '')
  if (route.endsWith('/index'))
    route = route.slice(0, -'/index'.length)
  if (route === 'index')
    route = ''
  route = route.split('/').filter(Boolean).map((segment) => {
    if (segment.startsWith('[...') && segment.endsWith(']'))
      return `:${segment.slice(4, -1)}(.*)*`
    if (segment.startsWith('[') && segment.endsWith(']'))
      return `:${segment.slice(1, -1)}`
    return segment
  }).join('/')
  return route ? `/${route}` : '/'
}

function joinRoute(parent, child) {
  if (!child)
    return parent
  if (child.startsWith('/'))
    return child
  return `${parent.replace(/\/$/, '')}/${child}`
}

function extractPages(source) {
  const pages = []
  const re = /resolver\.resolve\(\s*['"](\.\/runtime\/pages\/[^'"]+)['"]\s*\)/g
  let m = re.exec(source)
  while (m) {
    const before = source.slice(Math.max(0, m.index - 500), m.index)
    const names = [...before.matchAll(/name:\s*['"]([^'"]+)['"]/g)]
    const paths = [...before.matchAll(/path:\s*([^,\n]+)/g)]
    const pathExpr = normalizePathExpr(paths.at(-1)?.[1] || '')
    pages.push({
      n: names.at(-1)?.[1] || '',
      path: pathExpr.startsWith('/') ? pathExpr : joinRoute('/{adminPath}', pathExpr),
      spec: m[1],
    })
    m = re.exec(source)
  }
  return pages
}

function extractHandlers(source) {
  const rows = []
  const re = /addServerHandler\(\s*\{([\s\S]*?)\}\s*\)/g
  let m = re.exec(source)
  while (m) {
    const body = m[1]
    const route = body.match(/route:\s*['"]([^'"]+)['"]/)?.[1]
      || body.match(/route:\s*`([^`]+)`/)?.[1]
    const method = (body.match(/method:\s*['"]([^'"]+)['"]/)?.[1] || 'get').toUpperCase()
    const handler = body.match(/resolver\.resolve\(\s*['"]([^'"]+)['"]\s*\)/)?.[1]
    if (handler && /middleware:\s*true/.test(body))
      rows.push({ m: method, path: '', spec: handler, middleware: true })
    else if (route && handler)
      rows.push({ m: method, path: route, spec: handler })
    m = re.exec(source)
  }
  return rows
}

function extractCalls(source) {
  const imports = []
  const reImport = /name:\s*['"]([^'"]+)['"][\s\S]*?from:\s*resolver\.resolve\(\s*['"]([^'"]+)['"]\s*\)/g
  let m = reImport.exec(source)
  while (m) {
    imports.push({ n: m[1], spec: m[2] })
    m = reImport.exec(source)
  }
  const plugins = []
  const rePlugin = /add(Server)?Plugin\(\s*resolver\.resolve\(\s*['"]([^'"]+)['"]\s*\)\s*\)/g
  m = rePlugin.exec(source)
  while (m) {
    plugins.push({ side: m[1] ? 'server' : 'client', spec: m[2] })
    m = rePlugin.exec(source)
  }
  const middleware = []
  const reMw = /addRouteMiddleware\(\s*\{([\s\S]*?)\}\s*\)/g
  m = reMw.exec(source)
  while (m) {
    const body = m[1]
    const spec = body.match(/resolver\.resolve\(\s*['"]([^'"]+)['"]\s*\)/)?.[1]
      || body.match(/path:\s*resolver\.resolve\(\s*['"]([^'"]+)['"]\s*\)/)?.[1]
    middleware.push({
      n: body.match(/name:\s*['"]([^'"]+)['"]/)?.[1] || '',
      global: /global:\s*true/.test(body),
      spec,
    })
    m = reMw.exec(source)
  }
  const components = []
  const reCmp = /add(?:ComponentsDir|AdminComponents)\(\s*\{([\s\S]*?)\}\s*\)/g
  m = reCmp.exec(source)
  while (m) {
    const body = m[1]
    components.push({
      spec: body.match(/resolver\.resolve\(\s*['"]([^'"]+)['"]\s*\)/)?.[1] || '',
      prefix: body.match(/prefix:\s*['"]([^'"]+)['"]/)?.[1] || '',
      internal: m[0].startsWith('addAdminComponents'),
    })
    m = reCmp.exec(source)
  }
  return { imports, plugins, middleware, components }
}

function resolveModuleSpec(moduleFile, spec, fileSet) {
  if (!spec)
    return null
  const hit = resolveRelative(moduleFile, spec, fileSet)
  if (hit)
    return hit
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(moduleFile), spec.split('?')[0].split('#')[0]))
  const abs = path.join(root, base)
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory())
    return base
  return null
}

function pascal(type) {
  return type
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

function kebab(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function fieldTypeFromFile(file) {
  const base = path.posix.basename(file, '.vue').replace(/Field$/, '')
  return base.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
}

function surface(filePath, byPath, stack = new Set()) {
  if (!filePath || stack.has(filePath))
    return new Map()
  const rec = byPath.get(filePath)
  if (!rec)
    return new Map()
  stack.add(filePath)
  const names = new Map()
  for (const item of rec.local)
    names.set(item.n, { p: filePath, k: item.k })
  for (const row of rec.reexports) {
    if (!row.to)
      continue
    if (row.star) {
      for (const [name, meta] of surface(row.to, byPath, stack)) {
        if (!names.has(name))
          names.set(name, meta)
      }
    }
    else if (row.ns) {
      names.set(row.ns, { p: row.to, k: 'ns' })
    }
    else {
      const inner = surface(row.to, byPath, stack)
      for (const item of row.names) {
        const meta = inner.get(item.imported)
        names.set(item.local, meta || { p: row.to, k: item.typeOnly ? 'type' : 'const' })
      }
    }
  }
  stack.delete(filePath)
  return names
}

function readDelim(code, openIndex, openChar, closeChar) {
  let depth = 0
  let quote = null
  for (let i = openIndex; i < code.length; i++) {
    const c = code[i]
    if (quote) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === quote)
        quote = null
      continue
    }
    if (c === '\'' || c === '"' || c === '`') {
      quote = c
      continue
    }
    if (c === openChar)
      depth++
    else if (c === closeChar) {
      depth--
      if (depth === 0)
        return code.slice(openIndex + 1, i)
    }
  }
  return ''
}

function sqlColumns(body) {
  const cols = []
  let depth = 0
  let quote = null
  let start = 0
  const parts = []
  for (let i = 0; i <= body.length; i++) {
    const c = body[i]
    if (quote) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === quote)
        quote = null
      continue
    }
    if (c === '\'' || c === '"' || c === '`') {
      quote = c
      continue
    }
    if (c === '(')
      depth++
    else if (c === ')')
      depth = Math.max(0, depth - 1)
    if ((i === body.length || c === ',') && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  for (const part of parts) {
    const name = part.trim().match(/^(?:CONSTRAINT\s+\w+\s+)?["']?(\w+)["']?/i)
    if (!name)
      continue
    const upper = name[1].toUpperCase()
    if (['UNIQUE', 'PRIMARY', 'CONSTRAINT', 'CHECK', 'FOREIGN', 'INDEX'].includes(upper))
      continue
    if (!cols.includes(name[1]))
      cols.push(name[1])
  }
  return cols
}

function sqlCreateTables(source) {
  const tables = []
  const re = /CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+["']?(\w+)["']?\s*\(/gi
  let match = re.exec(source)
  while (match) {
    const body = readDelim(source, match.index + match[0].length - 1, '(', ')')
    if (!tables.some(row => row.n === match[1]))
      tables.push({ n: match[1], cols: sqlColumns(body) })
    match = re.exec(source)
  }
  return tables
}

function compact(obj) {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value == null || value === '')
      continue
    if (Array.isArray(value) && value.length === 0)
      continue
    out[key] = value
  }
  return out
}

function uniq(list) {
  return [...new Set(list)].sort()
}

function build() {
  const files = []
  walk(root, files)
  files.sort()
  const fileSet = new Set(files)
  const packages = loadPackages(files)
  const byPath = new Map()
  const misses = []

  for (const file of files) {
    const abs = path.join(root, file)
    const ext = path.posix.extname(file).toLowerCase()
    const source = CODE_EXT.has(ext) || ext === '.md' || ext === '.json' || ext === '.yml' || ext === '.yaml'
      ? fs.readFileSync(abs, 'utf8')
      : ''
    const rec = {
      p: file,
      pkg: packageOf(file, packages),
      k: kindOf(file),
      ln: source ? source.split(/\r?\n/).length : 0,
      lead: null,
      local: [],
      reexports: [],
      im: [],
      ext: [],
      source,
    }
    if (ext === '.vue') {
      const parts = vueParts(source)
      const parsed = parseCode(parts.script)
      rec.local = parsed.local
      rec.reexports = parsed.reexports
      rec.bindings = parsed.bindings
      rec.script = parts.script
      rec.template = parts.template
      rec.specs = [...parsed.specOrder, ...sassSpecs(parts.style).map(spec => spec)]
    }
    else if (ext === '.scss' || ext === '.css') {
      rec.specs = sassSpecs(source)
      rec.bindings = []
      rec.script = ''
      rec.template = ''
    }
    else if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.mjs') {
      const parsed = parseCode(source)
      rec.local = parsed.local
      rec.reexports = parsed.reexports
      rec.bindings = parsed.bindings
      rec.specs = parsed.specOrder
      rec.script = source
      rec.template = ''
      rec.lead = leadDoc(source)
    }
    else if (ext === '.sql') {
      const tables = sqlCreateTables(source).map(row => row.n)
      rec.specs = []
      rec.bindings = []
      rec.script = ''
      rec.template = ''
      rec.lead = tables.length ? `DDL tables: ${tables.join(', ')}` : null
    }
    else if (ext === '.json' && path.posix.basename(file) === 'package.json') {
      try {
        rec.lead = readJson(abs).description || null
      }
      catch {
        rec.lead = null
      }
      rec.specs = []
      rec.bindings = []
      rec.script = ''
      rec.template = ''
    }
    else if (ext === '.md') {
      const heading = source.match(/^#\s+(.+)$/m)?.[1]
      rec.lead = heading ? clip(heading, 160) : null
      rec.specs = []
      rec.bindings = []
      rec.script = ''
      rec.template = ''
    }
    else {
      rec.specs = []
      rec.bindings = []
      rec.script = ''
      rec.template = ''
    }
    byPath.set(file, rec)
  }

  for (const rec of byPath.values()) {
    const im = []
    const ext = []
    for (const spec of rec.specs || []) {
      const resolved = resolveSpec(rec.p, spec, fileSet, packages)
      im.push(...resolved.im)
      ext.push(...resolved.ext)
      for (const miss of resolved.miss)
        misses.push(`${rec.p} -> ${miss}`)
    }
    for (const row of rec.reexports) {
      const resolved = resolveSpec(rec.p, row.spec, fileSet, packages)
      row.to = resolved.im[0] || null
      if (!row.to && resolved.miss.length)
        misses.push(`${rec.p} -> ${row.spec}`)
    }
    rec.im = uniq(im.filter(item => item !== rec.p))
    rec.ext = uniq(ext)
  }

  const routes = { pages: [], api: [], plugins: [], middleware: [], imports: [], components: [] }
  for (const file of files.filter(item => item.endsWith('/module.ts') || item.endsWith('/src/module.ts'))) {
    const source = byPath.get(file).source
    const handlerCount = (source.match(/addServerHandler\s*\(/g) || []).length
    const handlers = extractHandlers(source)
    if (handlers.length !== handlerCount)
      throw new Error(`Handler parse mismatch in ${file}: found ${handlers.length}, calls ${handlerCount}`)
    const pageCount = (source.match(/\.\/runtime\/pages\/[^'"]+\.vue/g) || []).length
    const pages = extractPages(source)
    if (pages.length !== pageCount)
      throw new Error(`Page parse mismatch in ${file}: found ${pages.length}, refs ${pageCount}`)
    const calls = extractCalls(source)
    for (const row of handlers) {
      const p = resolveModuleSpec(file, row.spec, fileSet)
      if (!p)
        misses.push(`${file} -> ${row.spec}`)
      if (row.middleware)
        routes.middleware.push({ n: path.posix.basename(row.spec), global: true, p: p || row.spec })
      else
        routes.api.push({ m: row.m, path: row.path, p: p || row.spec })
    }
    for (const row of pages) {
      const p = resolveModuleSpec(file, row.spec, fileSet)
      if (!p)
        misses.push(`${file} -> ${row.spec}`)
      routes.pages.push({ n: row.n, path: row.path, p: p || row.spec })
    }
    for (const row of calls.plugins) {
      const p = resolveModuleSpec(file, row.spec, fileSet)
      routes.plugins.push({ side: row.side, p: p || row.spec })
    }
    for (const row of calls.middleware) {
      const p = resolveModuleSpec(file, row.spec, fileSet)
      routes.middleware.push({ n: row.n, global: row.global, p: p || row.spec })
    }
    for (const row of calls.imports) {
      const p = resolveModuleSpec(file, row.spec, fileSet)
      routes.imports.push({ n: row.n, p: p || row.spec })
    }
    for (const row of calls.components) {
      const p = resolveModuleSpec(file, row.spec, fileSet)
      routes.components.push({ prefix: row.prefix, dir: p || row.spec, ...(row.internal ? { internal: true } : {}) })
    }
  }
  for (const file of files) {
    if (!file.endsWith('.vue') || !file.includes('/pages/') || file.includes('/runtime/pages/'))
      continue
    if (routes.pages.some(row => row.p === file))
      continue
    routes.pages.push({ n: path.posix.basename(file, '.vue'), path: nuxtPagePath(file), p: file })
  }
  routes.api.sort((a, b) => a.path.localeCompare(b.path) || a.m.localeCompare(b.m))
  routes.pages.sort((a, b) => a.path.localeCompare(b.path) || a.n.localeCompare(b.n))
  routes.imports.sort((a, b) => a.n.localeCompare(b.n))

  const tagToFile = new Map()
  for (const dir of routes.components) {
    if (!dir.dir || !fileSet.has(dir.dir) && !files.some(file => file.startsWith(`${dir.dir}/`)))
      continue
    for (const file of files) {
      if (!file.startsWith(`${dir.dir}/`) || !file.endsWith('.vue'))
        continue
      const base = path.posix.basename(file, '.vue')
      const registered = `${dir.prefix}${base}`
      tagToFile.set(registered, file)
      tagToFile.set(kebab(registered), file)
    }
  }
  for (const rec of byPath.values()) {
    if (!rec.template)
      continue
    for (const m of rec.template.matchAll(/<([A-Za-z][\w-]*)\b/g)) {
      const target = tagToFile.get(m[1])
      if (target && target !== rec.p && !rec.im.includes(target))
        rec.im.push(target)
    }
    rec.im.sort()
  }

  const autoByPkg = new Map()
  for (const rec of byPath.values()) {
    const server = rec.p.includes('/server/utils/')
    const client = !rec.p.includes('/server/') && (rec.p.includes('/composables/') || rec.p.includes('/utils/'))
    if (!server && !client)
      continue
    for (const item of rec.local) {
      if (item.n.length < 4 || NUXT_BUILTINS.has(item.n))
        continue
      const key = `${rec.pkg}:${server ? 'server' : 'client'}:${item.n}`
      const prev = autoByPkg.get(key)
      if (prev && prev !== rec.p)
        autoByPkg.set(key, '')
      else if (!prev)
        autoByPkg.set(key, rec.p)
    }
  }
  for (const rec of byPath.values()) {
    if (!rec.p.includes('/runtime/'))
      continue
    const server = rec.p.includes('/server/')
    const code = `${rec.script || ''}\n${rec.template || ''}`
    const declared = declaredNames(stripComments(code))
    for (const binding of rec.bindings || [])
      declared.add(binding.local)
    for (const [key, target] of autoByPkg) {
      if (!target)
        continue
      const [pkg, side, name] = key.split(':')
      if (pkg !== rec.pkg || target === rec.p)
        continue
      if (server && side !== 'server')
        continue
      if (!server && side !== 'client')
        continue
      if (declared.has(name) || rec.im.includes(target))
        continue
      const stripped = stripComments(code)
      if (!new RegExp(`\\b${name}\\s*\\(`).test(stripped))
        continue
      rec.im.push(target)
    }
    rec.im = uniq(rec.im)
  }

  const routeLabel = new Map()
  for (const row of routes.api) {
    const label = `${row.m} ${row.path}`
    const prev = routeLabel.get(row.p)
    routeLabel.set(row.p, prev ? `${prev} | ${label}` : label)
  }
  for (const row of routes.pages) {
    if (!routeLabel.has(row.p))
      routeLabel.set(row.p, `Page ${row.path}`)
  }

  for (const rec of byPath.values()) {
    if (rec.k === 'field-ui') {
      const base = path.posix.basename(rec.p, '.vue')
      rec.sum = `Field widget ${base} for type "${fieldTypeFromFile(rec.p)}"`
      continue
    }
    const route = routeLabel.get(rec.p)
    if (route && rec.lead)
      rec.sum = clip(`${route}. ${rec.lead}`)
    else if (route)
      rec.sum = route
    else if (rec.lead)
      rec.sum = rec.lead
    else {
      const names = rec.local.map(item => item.n)
      const shown = names.slice(0, 8).join(', ')
      const more = names.length > 8 ? ', ...' : ''
      const label = KIND_LABEL[rec.k] || 'Source'
      const base = path.posix.basename(rec.p)
      rec.sum = shown ? clip(`${label}: ${shown}${more}`) : `${label} ${base}`
    }
  }

  const symbols = new Map()
  function addSymbol(n, k, p) {
    if (!n || n === 'default')
      return
    const key = `${n}\0${p}\0${k}`
    if (!symbols.has(key))
      symbols.set(key, { n, k, p })
  }
  for (const rec of byPath.values()) {
    for (const item of rec.local)
      addSymbol(item.n, item.k, rec.p)
  }
  for (const [tag, file] of tagToFile) {
    if (tag.includes('-'))
      continue
    addSymbol(tag, 'cmp', file)
    addSymbol(path.posix.basename(file, '.vue'), 'cmp', file)
  }

  const domainPackages = []
  const publicApi = {}
  for (const pkg of [...packages].sort((a, b) => a.name.localeCompare(b.name))) {
    const entries = packageEntries(pkg, fileSet)
    const deps = pkg.json.dependencies || {}
    const dev = pkg.json.devDependencies || {}
    domainPackages.push(compact({
      name: pkg.name,
      dir: pkg.dir || '.',
      sum: pkg.sum,
      entries: entries.map(row => compact({ id: row.id, p: row.p, client: row.client || null })),
      deps: Object.keys(deps).sort(),
      dev: Object.keys(dev).sort(),
      workspace: Object.entries({ ...deps, ...dev })
        .filter(([, version]) => String(version).startsWith('workspace:'))
        .map(([name]) => name)
        .sort(),
      scripts: Object.keys(pkg.json.scripts || {}).sort(),
    }))
    for (const entry of entries) {
      const names = [...surface(entry.p, byPath).keys()].sort()
      publicApi[entry.id] = names
      for (const [name, meta] of surface(entry.p, byPath))
        addSymbol(name, meta.k, meta.p)
    }
  }

  let tables = []
  const schemaFile = files.find(file => file.endsWith('/database/client/schema.ts'))
  if (schemaFile) {
    const interfaces = extractInterfaces(byPath.get(schemaFile).source)
    const dbBody = interfaces.get('Database') || ''
    tables = []
    for (const line of dbBody.split('\n')) {
      const match = line.match(/^\s*(\w+)\s*:\s*(\w+)/)
      if (!match)
        continue
      const cols = interfaceColumns(interfaces.get(match[2]) || '')
      tables.push({ n: match[1], cols: cols.join(',') })
    }
  }

  const ddl = []
  const ddlNames = new Set()
  for (const file of files) {
    if (file.endsWith('.md') || file.includes('/test/') || file.endsWith('.test.ts'))
      continue
    if (!/\.(sql|ts|mjs|js)$/.test(file))
      continue
    const source = byPath.get(file).source
    if (!source || !/CREATE TABLE/i.test(source))
      continue
    ddl.push(file)
    for (const row of sqlCreateTables(source)) {
      ddlNames.add(row.n)
      if (tables.some(table => table.n === row.n))
        continue
      tables.push({ n: row.n, cols: row.cols.join(',') })
    }
  }
  const missingDdl = tables
    .map(row => row.n)
    .filter(name => !ddlNames.has(name))

  const fieldFile = files.find(file => file.endsWith('/config/types/fields.ts'))
  const fieldTypes = new Set()
  if (fieldFile) {
    for (const m of byPath.get(fieldFile).source.matchAll(/type:\s*['"]([a-z0-9_]+)['"]/g))
      fieldTypes.add(m[1])
  }
  const fieldsOut = [...fieldTypes].sort().map((type) => {
    const uiName = `${pascal(type)}Field.vue`
    const ui = files.find(file => file.endsWith(`/internal/fields/${uiName}`)) || null
    return compact({ type, ui })
  })

  const domain = {
    packages: domainPackages,
    public: publicApi,
    tables,
    ddl,
    fields: fieldsOut,
    fieldRule: 'Config type snake_case maps to PascalCase + Field.vue. resolveField() globs internal/fields/*.vue.',
  }
  if (missingDdl.length)
    throw new Error(`Database tables missing from DDL: ${missingDdl.join(', ')}`)

  const fileRows = [...byPath.values()]
    .sort((a, b) => a.p.localeCompare(b.p))
    .map(rec => compact({
      p: rec.p,
      pkg: rec.pkg,
      k: rec.k,
      ln: rec.ln,
      sum: rec.sum,
      ex: rec.local.map(item => item.n),
      star: rec.reexports.filter(row => row.star && row.to).map(row => row.to),
      im: rec.im,
      ext: rec.ext,
    }))

  const symbolRows = [...symbols.values()].sort((a, b) => a.n.localeCompare(b.n) || a.p.localeCompare(b.p) || a.k.localeCompare(b.k))

  assertIndex(fileRows, symbolRows, routes, domain, misses)

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'files.jsonl'), `${fileRows.map(row => JSON.stringify(row)).join('\n')}\n`)
  fs.writeFileSync(path.join(outDir, 'symbols.jsonl'), `${symbolRows.map(row => JSON.stringify(row)).join('\n')}\n`)
  fs.writeFileSync(path.join(outDir, 'routes.json'), `${JSON.stringify(routes, null, 2)}\n`)
  fs.writeFileSync(path.join(outDir, 'domain.json'), `${JSON.stringify(domain, null, 2)}\n`)
  fs.writeFileSync(path.join(outDir, 'INDEX.md'), `${renderIndex(fileRows, symbolRows, routes, domain)}\n`)

  console.log(`ai-index: ${fileRows.length} files, ${symbolRows.length} symbols, ${routes.api.length} handlers, ${routes.pages.length} pages, ${domain.tables.length} tables`)
}

function assertIndex(fileRows, symbolRows, routes, domain, misses) {
  if (misses.length) {
    const sample = misses.slice(0, 30).join('\n')
    throw new Error(`Unresolved imports (${misses.length}):\n${sample}`)
  }
  function symbol(name, file) {
    if (!symbolRows.some(row => row.n === name && row.p === file))
      throw new Error(`Missing symbol ${name} in ${file}`)
  }
  symbol('hashPassword', 'packages/core/src/auth/password.ts')
  symbol('resolveField', 'packages/katecms/src/runtime/utils/helpers.ts')
  const core = domain.public.core || []
  const browser = domain.public['core/browser'] || []
  if (!core.includes('createSqliteDb'))
    throw new Error('core public API missing createSqliteDb')
  if (browser.includes('createSqliteDb'))
    throw new Error('browser public API leaked createSqliteDb')
  if (!browser.includes('isMediaItem'))
    throw new Error('browser public API missing isMediaItem')
  const users = domain.tables.find(row => row.n === 'users')
  if (!users?.cols.includes('email:string'))
    throw new Error(`users table cols look wrong: ${users?.cols}`)
  const text = domain.fields.find(row => row.type === 'text')
  if (!text?.ui?.endsWith('TextField.vue'))
    throw new Error('field type text has no TextField.vue')
  const media = routes.api.find(row => row.m === 'GET' && row.path === '/api/_katecms/media')
  if (!media?.p.endsWith('media/index.get.ts'))
    throw new Error('GET /api/_katecms/media not mapped')
  const userPage = routes.pages.find(row => row.n === 'admin-users-id')
  if (userPage?.path !== '/{adminPath}/users/:id')
    throw new Error(`user page path: ${userPage?.path}`)
  const home = routes.pages.find(row => row.p === 'playground/pages/index.vue')
  if (home?.path !== '/')
    throw new Error(`playground home path: ${home?.path}`)
  const slug = routes.pages.find(row => row.p.endsWith('/pages/[...slug].vue'))
  if (slug?.path !== '/:slug(.*)*')
    throw new Error(`playground slug path: ${slug?.path}`)
  const link = fileRows.find(row => row.p.endsWith('internal/fields/LinkField.vue'))
  if (!link?.im.includes('packages/core/src/browser.ts'))
    throw new Error('client field did not resolve @katecms/core to browser.ts')
  if (link.im.includes('packages/core/src/index.ts'))
    throw new Error('client field resolved @katecms/core to the node entry')
  const mediaApi = fileRows.find(row => row.p.endsWith('server/api/_katecms/media/index.get.ts'))
  if (!mediaApi?.im.includes('packages/core/src/index.ts'))
    throw new Error('server handler did not resolve @katecms/core to index.ts')
  const helpers = fileRows.find(row => row.p.endsWith('runtime/utils/helpers.ts'))
  if (!helpers?.im.some(item => item.endsWith('/internal/fields/TextField.vue')))
    throw new Error('resolveField glob missed TextField.vue')
  const register = fileRows.find(row => row.p.endsWith('pages/admin/register.vue'))
  if (!register?.im.some(item => item.endsWith('/assets/styles/_index.scss')))
    throw new Error('register.vue missed styles import')
  if (!register.im.some(item => item.endsWith('/internal/fields/PasswordField.vue')))
    throw new Error('register.vue missed KateCmsPasswordField')
  const redirects = domain.tables.find(row => row.n === 'seo_redirects')
  if (!redirects?.cols.includes('from_path'))
    throw new Error('seo_redirects columns missing')
  if (domain.tables.some(row => row.n === 'products'))
    throw new Error('example collection slug was indexed as a table')
}

function renderIndex(fileRows, symbolRows, routes, domain) {
  const pkgs = domain.packages
    .map(pkg => `- \`${pkg.name}\` \`${pkg.dir}\` — ${pkg.sum || 'package'}`)
    .join('\n')
  const counts = `${fileRows.length} files, ${symbolRows.length} symbols, ${routes.api.length} handlers, ${routes.pages.length} pages, ${domain.tables.length} tables, ${domain.fields.length} field types`
  return `# KateCMS index

Read this file first. Grep \`.ai/\` instead of scanning \`packages/\` for imports, symbols, routes, or schema.

Refresh after code changes: \`pnpm ai:index\`

Counts: ${counts}.

## Files

| File | Use |
| --- | --- |
| \`files.jsonl\` | One source file per line |
| \`symbols.jsonl\` | Exported name to the file that defines it |
| \`routes.json\` | Admin pages, HTTP handlers, plugins, middleware, Nuxt auto-imports |
| \`domain.json\` | Packages, dependency lists, public API, DB tables, field types |

\`dist/\`, \`node_modules/\`, \`.nuxt/\`, \`pnpm-lock.yaml\`, and \`public/uploads\` are omitted.

## files.jsonl

\`p\` path from repo root. \`pkg\` package name. \`k\` kind. \`ln\` lines. \`sum\` one-line purpose. \`ex\` names declared here. \`star\` files pulled in with \`export *\`. \`im\` internal dependencies (repo paths). \`ext\` external packages.

Empty keys are omitted. To see who imports a file, grep its \`p\` value: hits in other lines' \`im\` are the importers.

## symbols.jsonl

\`n\` name. \`k\` is \`fn\`, \`const\`, \`type\`, \`iface\`, \`class\`, \`enum\`, \`cmp\`, or \`ns\`. \`p\` defining file. \`cmp\` is a Nuxt component registered with the module prefix (\`KateCms*\`, \`Mirai*\`).

Public entry surfaces are name lists in \`domain.json\` under \`public\` (\`core\`, \`core/browser\`, \`nuxt\`, \`nuxt/server\`, \`nuxt/extensions\`, \`seo\`).

## Resolve rules

- Client files under \`runtime/\` (not \`runtime/server/\`) import \`@katecms/core\` from \`packages/core/src/browser.ts\`.
- Server, tests, and \`module.ts\` import \`@katecms/core\` from \`packages/core/src/index.ts\`.
- Admin pages and \`/api/_katecms/*\` handlers are registered in each package \`module.ts\`, not by Nuxt file-system routing. Paths are in \`routes.json\`. \`{adminPath}\` defaults to \`admin\`.
- App \`pages/*.vue\` outside \`runtime/pages\` (the playground) use Nuxt file routes, also listed in \`routes.json\`.
- Field config \`type\` maps to a widget: snake_case to PascalCase plus \`Field.vue\` (\`image_select\` to \`ImageSelectField.vue\`). \`resolveField()\` globs \`internal/fields/*.vue\`.
- Template tags \`KateCms*\` / \`Mirai*\` are edges in \`im\` even without a script import. \`addAdminComponents()\` dirs are internal: the tags resolve in admin and addon templates, and they are not host components.
- A named call that matches a unique composable or util export is also an \`im\` edge.

## Tables

Column codec in \`domain.json\`: \`name:type\`. \`?\` nullable. \`*\` generated or DB default. \`ts\` timestamp. \`json\` JSON column.

## Packages

${pkgs}
`
}

build()
