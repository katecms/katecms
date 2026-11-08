import type { Kysely, SelectQueryBuilder, SqlBool } from 'kysely'
import { sql } from 'kysely'
import type { Database } from '../client'
import { listDictionaries } from './dictionaries'
import type { Dictionary } from './dictionaries'

export type DictionaryQueryRelation = 'AND' | 'OR'
export type DictionaryQueryField = 'id' | 'name' | 'slug'
export type DictionaryQueryOperator = 'IN' | 'NOT IN' | 'AND' | 'EXISTS' | 'NOT EXISTS'

export interface DictionaryQueryItem {
  /** Dictionary slug (`type` column). */
  dictionary: string
  /**
   * How `terms` are matched. `name` is the dictionary title.
   * Default: `id`.
   */
  field?: DictionaryQueryField
  /** Dictionary rows to match (`id` / title / slug). Unused for EXISTS / NOT EXISTS. */
  terms?: number | string | Array<number | string>
  /** Default: `IN`. */
  operator?: DictionaryQueryOperator
  /**
   * Include child dictionary rows for hierarchical dictionaries.
   * Default: `true`. Unused for EXISTS / NOT EXISTS.
   */
  includeChildren?: boolean
}

export interface DictionaryQuery {
  /** How to combine `queries`. Default: `AND`. */
  relation?: DictionaryQueryRelation
  queries?: DictionaryQueryItem[]
}

type ResolvedClause
  = | { op: 'in', ids: number[] }
    | { op: 'notIn', ids: number[] }
    | { op: 'and', groups: number[][] }
    | { op: 'exists', type: string }
    | { op: 'notExists', type: string }

interface ResolvedDictionaryQuery {
  relation: DictionaryQueryRelation
  clauses: ResolvedClause[]
}

const FIELDS = new Set<string>(['id', 'name', 'slug'])
const OPERATORS = new Set<string>(['IN', 'NOT IN', 'AND', 'EXISTS', 'NOT EXISTS'])

function asTermList(value: DictionaryQueryItem['terms']): Array<number | string> {
  if (value == null) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

function normalizeRelation(value: unknown): DictionaryQueryRelation {
  return typeof value === 'string' && value.trim().toUpperCase() === 'OR' ? 'OR' : 'AND'
}

function normalizeField(value: unknown): DictionaryQueryField {
  if (typeof value === 'string' && FIELDS.has(value.trim().toLowerCase())) {
    return value.trim().toLowerCase() as DictionaryQueryField
  }
  return 'id'
}

function normalizeOperator(value: unknown): DictionaryQueryOperator {
  if (typeof value !== 'string') {
    return 'IN'
  }
  const token = value.trim().replace(/\s+/g, ' ').toUpperCase()
  return OPERATORS.has(token) ? token as DictionaryQueryOperator : 'IN'
}

function matchDictionaryIds(
  rows: Dictionary[],
  field: DictionaryQueryField,
  terms: Array<number | string>,
): number[] {
  const ids: number[] = []
  const seen = new Set<number>()
  for (const term of terms) {
    let row: Dictionary | undefined
    if (field === 'id') {
      const n = typeof term === 'number' ? term : Number(String(term).trim())
      if (!Number.isInteger(n) || n < 1) {
        continue
      }
      row = rows.find(item => item.id === n)
    }
    else if (field === 'slug') {
      const slug = String(term).trim()
      if (!slug) {
        continue
      }
      row = rows.find(item => item.slug === slug)
    }
    else {
      const name = String(term).trim().toLowerCase()
      if (!name) {
        continue
      }
      row = rows.find(item => item.title.toLowerCase() === name)
    }
    if (!row || seen.has(row.id)) {
      continue
    }
    seen.add(row.id)
    ids.push(row.id)
  }
  return ids
}

function withDescendantIds(rows: Dictionary[], matched: number[]): number[] {
  const children = new Map<number, number[]>()
  for (const row of rows) {
    if (row.parent_id == null) {
      continue
    }
    const list = children.get(row.parent_id) ?? []
    list.push(row.id)
    children.set(row.parent_id, list)
  }
  const out = new Set(matched)
  const walk = (id: number) => {
    for (const childId of children.get(id) ?? []) {
      if (out.has(childId)) {
        continue
      }
      out.add(childId)
      walk(childId)
    }
  }
  for (const id of matched) {
    walk(id)
  }
  return [...out]
}

/** Drop empty/invalid items. `undefined` means no dictionary filter. */
export function parseDictionaryQuery(value: unknown): DictionaryQuery | undefined {
  if (value == null || value === '') {
    return undefined
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const raw = value as DictionaryQuery
  const queries = (Array.isArray(raw.queries) ? raw.queries : [])
    .map((item): DictionaryQueryItem | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }
      const dictionary = typeof item.dictionary === 'string' ? item.dictionary.trim() : ''
      if (!dictionary) {
        return null
      }
      return {
        dictionary,
        field: normalizeField(item.field),
        terms: asTermList(item.terms),
        operator: normalizeOperator(item.operator),
        includeChildren: item.includeChildren !== false,
      }
    })
    .filter((item): item is DictionaryQueryItem => item != null)
  if (queries.length === 0) {
    return undefined
  }
  return {
    relation: normalizeRelation(raw.relation),
    queries,
  }
}

async function resolveDictionaryQuery(
  db: Kysely<Database>,
  input: DictionaryQuery | undefined,
): Promise<ResolvedDictionaryQuery | null> {
  const parsed = parseDictionaryQuery(input)
  if (!parsed?.queries?.length) {
    return null
  }
  const byType = new Map<string, Dictionary[]>()
  const clauses: ResolvedClause[] = []
  for (const item of parsed.queries) {
    const type = item.dictionary
    const operator = item.operator ?? 'IN'
    if (operator === 'EXISTS') {
      clauses.push({ op: 'exists', type })
      continue
    }
    if (operator === 'NOT EXISTS') {
      clauses.push({ op: 'notExists', type })
      continue
    }
    let rows = byType.get(type)
    if (!rows) {
      rows = await listDictionaries(db, type)
      byType.set(type, rows)
    }
    const matched = matchDictionaryIds(rows, item.field ?? 'id', asTermList(item.terms))
    const expand = item.includeChildren !== false
    if (operator === 'NOT IN') {
      clauses.push({ op: 'notIn', ids: expand ? withDescendantIds(rows, matched) : matched })
    }
    else if (operator === 'AND') {
      clauses.push({
        op: 'and',
        groups: matched.map(id => expand ? withDescendantIds(rows, [id]) : [id]),
      })
    }
    else {
      clauses.push({ op: 'in', ids: expand ? withDescendantIds(rows, matched) : matched })
    }
  }
  return {
    relation: parsed.relation ?? 'AND',
    clauses,
  }
}

function inDictionaryIdsSql(ids: number[]) {
  return sql<SqlBool>`id in (select collection_id from collection_dictionaries where dictionary_id in (${sql.join(ids.map(id => sql`${id}`))}))`
}

function existsByTypeSql(type: string, not: boolean) {
  const inner = sql`id in (select collection_dictionaries.collection_id from collection_dictionaries inner join dictionaries on dictionaries.id = collection_dictionaries.dictionary_id where dictionaries.type = ${type})`
  return not ? sql<SqlBool>`not (${inner})` : sql<SqlBool>`${inner}`
}

function clauseSql(clause: ResolvedClause) {
  if (clause.op === 'in' && clause.ids.length === 0) {
    return sql<SqlBool>`0 = 1`
  }
  if (clause.op === 'and' && (clause.groups.length === 0 || clause.groups.some(group => group.length === 0))) {
    return sql<SqlBool>`0 = 1`
  }
  if (clause.op === 'in') {
    return inDictionaryIdsSql(clause.ids)
  }
  if (clause.op === 'notIn') {
    if (clause.ids.length === 0) {
      return sql<SqlBool>`1 = 1`
    }
    return sql<SqlBool>`not (${inDictionaryIdsSql(clause.ids)})`
  }
  if (clause.op === 'and') {
    return sql<SqlBool>`(${sql.join(clause.groups.map(inDictionaryIdsSql), sql` and `)})`
  }
  if (clause.op === 'exists') {
    return existsByTypeSql(clause.type, false)
  }
  return existsByTypeSql(clause.type, true)
}

export async function applyDictionaryQueryFilters<O>(
  db: Kysely<Database>,
  query: SelectQueryBuilder<Database, 'collections', O>,
  input: DictionaryQuery | undefined,
): Promise<SelectQueryBuilder<Database, 'collections', O>> {
  const resolved = await resolveDictionaryQuery(db, input)
  if (!resolved || resolved.clauses.length === 0) {
    return query
  }
  const parts = resolved.clauses.map(clauseSql)
  if (parts.length === 1) {
    return query.where(parts[0]!)
  }
  const separator = resolved.relation === 'OR' ? sql` or ` : sql` and `
  return query.where(sql<SqlBool>`(${sql.join(parts, separator)})`)
}
