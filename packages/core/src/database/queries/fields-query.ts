import type { Kysely, RawBuilder, SelectQueryBuilder, SqlBool } from 'kysely'
import { sql } from 'kysely'
import type { Database } from '../client'

export type FieldsQueryRelation = 'AND' | 'OR'

export type FieldsQueryKeyCompare
  = | '='
    | '!='
    | 'LIKE'
    | 'NOT LIKE'
    | 'IN'
    | 'NOT IN'
    | 'REGEXP'
    | 'NOT REGEXP'

export type FieldsQueryCompare
  = | '='
    | '!='
    | '>'
    | '>='
    | '<'
    | '<='
    | 'LIKE'
    | 'NOT LIKE'
    | 'ILIKE'
    | 'NOT ILIKE'
    | 'IN'
    | 'NOT IN'
    | 'BETWEEN'
    | 'NOT BETWEEN'
    | 'EXISTS'
    | 'NOT EXISTS'
    | 'REGEXP'
    | 'NOT REGEXP'

export type FieldsQueryCast
  = | 'TEXT'
    | 'INTEGER'
    | 'NUMERIC'
    | 'DATETIME'
    | 'DATE'
    | 'TIME'

export type FieldsQueryScalar = string | number | boolean

export interface FieldsQueryItem {
  /** Field key(s). Dotted paths (`seo.title`) work for `=` / `IN`. */
  key: string | string[]
  /** How to match `key`. Default: `IN` when `key` is an array, otherwise `=`. */
  compareKey?: FieldsQueryKeyCompare
  /** Unused for `EXISTS` / `NOT EXISTS`. */
  value?: FieldsQueryScalar | FieldsQueryScalar[]
  /** Comparison operator. Default: `IN` when `value` is an array, otherwise `=`. */
  compare?: FieldsQueryCompare
  /** Cast for numeric/date compares. Default: `TEXT`. */
  type?: FieldsQueryCast
}

export interface FieldsQuery {
  /** How to combine `queries`. Default: `AND`. */
  relation?: FieldsQueryRelation
  queries?: FieldsQueryItem[]
}

interface ResolvedItem {
  keys: string[]
  compareKey: FieldsQueryKeyCompare
  values: FieldsQueryScalar[]
  compare: FieldsQueryCompare
  type: FieldsQueryCast
}

const KEY_COMPARES = new Set<string>([
  '=',
  '!=',
  'LIKE',
  'NOT LIKE',
  'IN',
  'NOT IN',
  'REGEXP',
  'NOT REGEXP',
])

const VALUE_COMPARES = new Set<string>([
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  'LIKE',
  'NOT LIKE',
  'ILIKE',
  'NOT ILIKE',
  'IN',
  'NOT IN',
  'BETWEEN',
  'NOT BETWEEN',
  'EXISTS',
  'NOT EXISTS',
  'REGEXP',
  'NOT REGEXP',
])

const CASTS = new Set<string>(['TEXT', 'INTEGER', 'NUMERIC', 'DATETIME', 'DATE', 'TIME'])
const PATH_SEGMENT = /^[\w-]+$/
const SYMBOL_OPS = new Set(['=', '!=', '>', '>=', '<', '<='])

function isPostgres(db: Kysely<Database>): boolean {
  return db.getExecutor().adapter.constructor.name === 'PostgresAdapter'
}

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  const token = value.trim()
  if (SYMBOL_OPS.has(token)) {
    return token
  }
  return token.replace(/\s+/g, ' ').toUpperCase()
}

function asStringList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value]
  return [...new Set(raw.map(item => String(item).trim()).filter(Boolean))]
}

function asValueList(value: unknown): FieldsQueryScalar[] {
  if (value == null) {
    return []
  }
  const raw = Array.isArray(value) ? value : [value]
  const out: FieldsQueryScalar[] = []
  for (const item of raw) {
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      out.push(item)
    }
  }
  return out
}

function normalizeRelation(value: unknown): FieldsQueryRelation {
  return normalizeToken(value) === 'OR' ? 'OR' : 'AND'
}

function normalizeCast(value: unknown): FieldsQueryCast {
  const token = normalizeToken(value)
  return CASTS.has(token) ? token as FieldsQueryCast : 'TEXT'
}

function normalizeKeyCompare(value: unknown, keyCount: number): FieldsQueryKeyCompare {
  const token = normalizeToken(value)
  if (KEY_COMPARES.has(token)) {
    return token as FieldsQueryKeyCompare
  }
  return keyCount > 1 ? 'IN' : '='
}

function normalizeCompare(value: unknown, valueCount: number): FieldsQueryCompare {
  const token = normalizeToken(value)
  if (VALUE_COMPARES.has(token)) {
    return token as FieldsQueryCompare
  }
  return valueCount > 1 ? 'IN' : '='
}

function keyScan(op: FieldsQueryKeyCompare): boolean {
  return op === '!='
    || op === 'NOT IN'
    || op === 'LIKE'
    || op === 'NOT LIKE'
    || op === 'REGEXP'
    || op === 'NOT REGEXP'
}

function splitPath(key: string): string[] | null {
  const parts = key.split('.').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0 || parts.some(part => !PATH_SEGMENT.test(part))) {
    return null
  }
  return parts
}

function sqlitePath(path: string[]): string {
  return `$.${path.join('.')}`
}

function neverMatch() {
  return sql<SqlBool>`0 = 1`
}

function alwaysMatch() {
  return sql<SqlBool>`1 = 1`
}

function bindScalar(value: FieldsQueryScalar, type: FieldsQueryCast) {
  if (type === 'INTEGER' || type === 'NUMERIC') {
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? n : String(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  return String(value)
}

function extractText(path: string[], postgres: boolean): RawBuilder<unknown> {
  if (postgres) {
    if (path.length === 1) {
      return sql`fields->>${path[0]}`
    }
    let expr: RawBuilder<unknown> = sql`fields`
    for (const segment of path.slice(0, -1)) {
      expr = sql`${expr}->${segment}`
    }
    return sql`${expr}->>${path[path.length - 1]}`
  }
  return sql`json_extract(fields, ${sqlitePath(path)})`
}

function literalExists(path: string[], postgres: boolean): RawBuilder<SqlBool> {
  if (postgres) {
    return sql`fields #> array[${sql.join(path.map(segment => sql`${segment}`))}]::text[] is not null`
  }
  return sql`json_type(fields, ${sqlitePath(path)}) is not null`
}

function castExpr(
  expr: RawBuilder<unknown>,
  type: FieldsQueryCast,
  postgres: boolean,
): RawBuilder<unknown> {
  if (type === 'TEXT' || type === 'DATETIME' || type === 'DATE' || type === 'TIME') {
    return expr
  }
  if (postgres) {
    if (type === 'INTEGER') {
      return sql`case when ${expr} ~ '^-?[0-9]+$' then (${expr})::bigint end`
    }
    return sql`case when ${expr} ~ '^-?[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?$' then (${expr})::numeric end`
  }
  if (type === 'INTEGER') {
    return sql`cast(${expr} as integer)`
  }
  return sql`cast(${expr} as real)`
}

function containsNeedle(value: FieldsQueryScalar): string {
  return String(value)
}

function likeMatch(
  expr: RawBuilder<unknown>,
  value: FieldsQueryScalar,
  postgres: boolean,
  caseInsensitive: boolean,
  negate: boolean,
): RawBuilder<SqlBool> {
  const needle = containsNeedle(value)
  if (postgres) {
    const pattern = `%${needle.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
    if (caseInsensitive) {
      return negate
        ? sql`${expr} not ilike ${pattern} escape ${'\\'}`
        : sql`${expr} ilike ${pattern} escape ${'\\'}`
    }
    return negate
      ? sql`${expr} not like ${pattern} escape ${'\\'}`
      : sql`${expr} like ${pattern} escape ${'\\'}`
  }
  const haystack = caseInsensitive ? sql`lower(${expr})` : expr
  const find = caseInsensitive ? needle.toLowerCase() : needle
  const found = sql`instr(${haystack}, ${find})`
  return negate
    ? sql`${expr} is not null and coalesce(${found}, 0) = 0`
    : sql`${found} > 0`
}

function regexpMatch(
  expr: RawBuilder<unknown>,
  pattern: string,
  postgres: boolean,
  negate: boolean,
): RawBuilder<SqlBool> {
  if (!pattern) {
    return neverMatch()
  }
  if (postgres) {
    return negate ? sql`${expr} !~ ${pattern}` : sql`${expr} ~ ${pattern}`
  }
  const hit = sql<SqlBool>`${expr} regexp ${pattern}`
  return negate ? sql<SqlBool>`not (${hit})` : hit
}

function valueCompare(
  expr: RawBuilder<unknown>,
  item: ResolvedItem,
  postgres: boolean,
): RawBuilder<SqlBool> {
  const op = item.compare
  const typed = castExpr(expr, item.type, postgres)
  const values = item.values

  if (op === 'LIKE' || op === 'NOT LIKE' || op === 'ILIKE' || op === 'NOT ILIKE') {
    if (values.length === 0) {
      return neverMatch()
    }
    return likeMatch(
      expr,
      values[0]!,
      postgres,
      op === 'ILIKE' || op === 'NOT ILIKE',
      op === 'NOT LIKE' || op === 'NOT ILIKE',
    )
  }

  if (op === 'REGEXP' || op === 'NOT REGEXP') {
    return regexpMatch(expr, values.length ? String(values[0]) : '', postgres, op === 'NOT REGEXP')
  }

  if (op === 'IN') {
    if (values.length === 0) {
      return neverMatch()
    }
    return sql`${typed} in (${sql.join(values.map(value => sql`${bindScalar(value, item.type)}`))})`
  }

  if (op === 'NOT IN') {
    if (values.length === 0) {
      return alwaysMatch()
    }
    return sql`${typed} is not null and ${typed} not in (${sql.join(values.map(value => sql`${bindScalar(value, item.type)}`))})`
  }

  if (op === 'BETWEEN' || op === 'NOT BETWEEN') {
    if (values.length < 2) {
      return neverMatch()
    }
    const left = bindScalar(values[0]!, item.type)
    const right = bindScalar(values[1]!, item.type)
    return op === 'BETWEEN'
      ? sql`${typed} between ${left} and ${right}`
      : sql`${typed} is not null and ${typed} not between ${left} and ${right}`
  }

  if (values.length === 0) {
    return neverMatch()
  }
  const bound = bindScalar(values[0]!, item.type)
  if (op === '=') {
    return sql`${typed} = ${bound}`
  }
  if (op === '!=') {
    return sql`${typed} is not null and ${typed} <> ${bound}`
  }
  if (op === '>') {
    return sql`${typed} > ${bound}`
  }
  if (op === '>=') {
    return sql`${typed} >= ${bound}`
  }
  if (op === '<') {
    return sql`${typed} < ${bound}`
  }
  return sql`${typed} <= ${bound}`
}

function keyPredicate(
  keyExpr: RawBuilder<unknown>,
  item: ResolvedItem,
  postgres: boolean,
): RawBuilder<SqlBool> {
  const op = item.compareKey
  const keys = item.keys
  if (keys.length === 0) {
    return neverMatch()
  }

  if (op === '=' || op === 'IN') {
    return keys.length === 1
      ? sql`${keyExpr} = ${keys[0]}`
      : sql`${keyExpr} in (${sql.join(keys.map(key => sql`${key}`))})`
  }
  if (op === '!=' || op === 'NOT IN') {
    return keys.length === 1
      ? sql`${keyExpr} <> ${keys[0]}`
      : sql`${keyExpr} not in (${sql.join(keys.map(key => sql`${key}`))})`
  }
  if (op === 'LIKE' || op === 'NOT LIKE') {
    const parts = keys.map(key => likeMatch(keyExpr, key, postgres, false, op === 'NOT LIKE'))
    return parts.length === 1 ? parts[0]! : sql`(${sql.join(parts, sql` or `)})`
  }
  const parts = keys.map(key => regexpMatch(keyExpr, key, postgres, op === 'NOT REGEXP'))
  return parts.length === 1 ? parts[0]! : sql`(${sql.join(parts, sql` or `)})`
}

function scanExists(item: ResolvedItem, postgres: boolean): RawBuilder<SqlBool> {
  const pred = keyPredicate(sql`e.key`, item, postgres)
  return postgres
    ? sql<SqlBool>`exists (select 1 from jsonb_each_text(fields) as e where ${pred})`
    : sql<SqlBool>`exists (select 1 from json_each(fields) as e where ${pred})`
}

function scanValue(item: ResolvedItem, postgres: boolean): RawBuilder<SqlBool> {
  const pred = sql`${keyPredicate(sql`e.key`, item, postgres)} and ${valueCompare(sql`e.value`, item, postgres)}`
  return postgres
    ? sql<SqlBool>`exists (select 1 from jsonb_each_text(fields) as e where ${pred})`
    : sql<SqlBool>`exists (select 1 from json_each(fields) as e where ${pred})`
}

function itemSql(item: ResolvedItem, postgres: boolean): RawBuilder<SqlBool> {
  const existsOp = item.compare === 'EXISTS' || item.compare === 'NOT EXISTS'
  if (keyScan(item.compareKey)) {
    const inner = existsOp ? scanExists(item, postgres) : scanValue(item, postgres)
    return item.compare === 'NOT EXISTS' ? sql<SqlBool>`not (${inner})` : inner
  }

  const paths = item.keys.map(splitPath).filter((path): path is string[] => path != null)
  if (paths.length === 0) {
    return neverMatch()
  }

  if (existsOp) {
    const parts = paths.map(path => literalExists(path, postgres))
    const inner = parts.length === 1 ? parts[0]! : sql<SqlBool>`(${sql.join(parts, sql` or `)})`
    return item.compare === 'NOT EXISTS' ? sql<SqlBool>`not (${inner})` : inner
  }

  const parts = paths.map(path => valueCompare(extractText(path, postgres), item, postgres))
  return parts.length === 1 ? parts[0]! : sql<SqlBool>`(${sql.join(parts, sql` or `)})`
}

function resolveItem(item: FieldsQueryItem): ResolvedItem | null {
  const keys = asStringList(item.key)
  if (keys.length === 0) {
    return null
  }
  const compare = item.compare != null
    ? normalizeCompare(item.compare, asValueList(item.value).length)
    : normalizeCompare(undefined, Array.isArray(item.value) ? item.value.length : 0)
  const existsOp = compare === 'EXISTS' || compare === 'NOT EXISTS'
  const values = existsOp ? [] : asValueList(item.value)
  return {
    keys,
    compareKey: normalizeKeyCompare(item.compareKey, keys.length),
    values,
    compare,
    type: normalizeCast(item.type),
  }
}

/** Drop empty/invalid items. `undefined` means no field filter. */
export function parseFieldsQuery(value: unknown): FieldsQuery | undefined {
  if (value == null || value === '') {
    return undefined
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const raw = value as FieldsQuery
  const queries = (Array.isArray(raw.queries) ? raw.queries : [])
    .map((item): FieldsQueryItem | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }
      const resolved = resolveItem(item)
      if (!resolved) {
        return null
      }
      return {
        key: resolved.keys.length === 1 ? resolved.keys[0]! : resolved.keys,
        compareKey: resolved.compareKey,
        value: resolved.values.length === 1 ? resolved.values[0] : resolved.values,
        compare: resolved.compare,
        type: resolved.type,
      }
    })
    .filter((item): item is FieldsQueryItem => item != null)
  if (queries.length === 0) {
    return undefined
  }
  return {
    relation: normalizeRelation(raw.relation),
    queries,
  }
}

/** Filter `collections.fields` JSON by {@link FieldsQuery}. */
export function applyFieldsQueryFilters<O>(
  db: Kysely<Database>,
  query: SelectQueryBuilder<Database, 'collections', O>,
  input: FieldsQuery | undefined,
): SelectQueryBuilder<Database, 'collections', O> {
  const parsed = parseFieldsQuery(input)
  if (!parsed?.queries?.length) {
    return query
  }
  const postgres = isPostgres(db)
  const parts = parsed.queries
    .map(resolveItem)
    .filter((item): item is ResolvedItem => item != null)
    .map(item => itemSql(item, postgres))
  if (parts.length === 0) {
    return query
  }
  if (parts.length === 1) {
    return query.where(parts[0]!)
  }
  const separator = parsed.relation === 'OR' ? sql` or ` : sql` and `
  return query.where(sql<SqlBool>`(${sql.join(parts, separator)})`)
}
