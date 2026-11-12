import type { Kysely } from 'kysely'
import {
  createCollectionRevision,
  findUserById,
} from '@katecms/core'
import type { Collection, CollectionStatus, Database } from '@katecms/core'
import type { EntryRevisionItem } from '../../utils/collections'
import { fail } from './collections'

const KEEP_REVISIONS = 50

export interface EntryRevisionData {
  title: string
  slug: string
  status: CollectionStatus
  parentId: number | null
  menuOrder: number
  publishedAt: string | null
  authorId: number | null
  fields: Record<string, unknown>
  dictionaryIds: Record<string, number[]>
}

export function entryRevisionSnapshot(
  row: Collection,
  dictionaryIds: Record<string, number[]>,
): EntryRevisionData {
  return {
    title: row.title,
    slug: row.slug,
    status: row.status,
    parentId: row.parent_id,
    menuOrder: row.menu_order,
    publishedAt: asIso(row.published_at),
    authorId: row.author_id,
    fields: isRecord(row.fields) ? row.fields : {},
    dictionaryIds: sortDictionaryIds(dictionaryIds),
  }
}

export function readEntryRevisionData(value: unknown): EntryRevisionData {
  const snapshot = asSnapshot(value)
  if (!snapshot) {
    fail(422, 'This revision cannot be restored.')
  }
  return snapshot
}

/** Store the saved entry when it differs from the latest revision. The first change also keeps the previous state. */
export async function recordEntryRevision(
  db: Kysely<Database>,
  entryId: number,
  actorId: number,
  previous: EntryRevisionData | null,
  next: EntryRevisionData,
): Promise<void> {
  const latest = await db
    .selectFrom('collection_revisions')
    .select('data')
    .where('collection_id', '=', entryId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .executeTakeFirst()
  const latestSnapshot = latest ? asSnapshot(latest.data) : null
  if (
    previous
    && !sameSnapshot(previous, next)
    && (!latestSnapshot || !sameSnapshot(latestSnapshot, previous))
  ) {
    await insertRevision(db, entryId, null, previous)
  }
  if (!latestSnapshot || !sameSnapshot(latestSnapshot, next)) {
    await insertRevision(db, entryId, actorId, next)
  }
  await pruneRevisions(db, entryId)
}

export async function listEntryRevisions(
  db: Kysely<Database>,
  entryId: number,
): Promise<EntryRevisionItem[]> {
  const rows = await db
    .selectFrom('collection_revisions')
    .select(['id', 'created_at', 'data', 'author_id'])
    .where('collection_id', '=', entryId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(KEEP_REVISIONS)
    .execute()
  const authorIds = [...new Set(rows.flatMap(row => row.author_id == null ? [] : [row.author_id]))]
  const authors = authorIds.length
    ? await db.selectFrom('users').select(['id', 'name', 'email']).where('id', 'in', authorIds).execute()
    : []
  const names = new Map(authors.map(user => [user.id, authorLabel(user.name, user.email)]))
  return rows.map((row) => {
    const snapshot = asSnapshot(row.data)
    return {
      id: Number(row.id),
      createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
      authorName: row.author_id == null ? 'Unknown' : (names.get(row.author_id) ?? 'Unknown'),
      title: snapshot?.title || 'Revision',
      status: snapshot?.status ?? 'draft',
    }
  })
}

export async function revisionAuthorId(
  db: Kysely<Database>,
  authorId: number | null,
): Promise<number | null> {
  if (authorId == null) {
    return null
  }
  const user = await findUserById(db, authorId)
  return user ? authorId : null
}

async function insertRevision(
  db: Kysely<Database>,
  entryId: number,
  authorId: number | null,
  data: EntryRevisionData,
): Promise<void> {
  await createCollectionRevision(db, {
    collection_id: entryId,
    author_id: authorId,
    data,
    created_at: new Date(),
  })
}

async function pruneRevisions(db: Kysely<Database>, entryId: number): Promise<void> {
  const keep = await db
    .selectFrom('collection_revisions')
    .select('id')
    .where('collection_id', '=', entryId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(KEEP_REVISIONS)
    .execute()
  if (keep.length < KEEP_REVISIONS) {
    return
  }
  await db
    .deleteFrom('collection_revisions')
    .where('collection_id', '=', entryId)
    .where('id', 'not in', keep.map(row => Number(row.id)))
    .execute()
}

function sameSnapshot(left: EntryRevisionData, right: EntryRevisionData): boolean {
  return canonical(left) === canonical(right)
}

function canonical(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sortValue(item))
  }
  if (!isRecord(value)) {
    return value
  }
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortValue(value[key])
  }
  return sorted
}

function asSnapshot(value: unknown): EntryRevisionData | null {
  if (!isRecord(value)) {
    return null
  }
  if (typeof value.title !== 'string' || !value.title.trim()) {
    return null
  }
  if (typeof value.slug !== 'string' || !value.slug.trim()) {
    return null
  }
  if (value.status !== 'published' && value.status !== 'draft' && value.status !== 'trash') {
    return null
  }
  const fields = value.fields == null ? {} : value.fields
  if (!isRecord(fields)) {
    return null
  }
  return {
    title: value.title.trim(),
    slug: value.slug.trim(),
    status: value.status,
    parentId: wholeId(value.parentId),
    menuOrder: Number.isInteger(value.menuOrder) ? Number(value.menuOrder) : 0,
    publishedAt: typeof value.publishedAt === 'string' && value.publishedAt ? value.publishedAt : null,
    authorId: wholeId(value.authorId),
    fields,
    dictionaryIds: sortDictionaryIds(readDictionaryIds(value.dictionaryIds)),
  }
}

function readDictionaryIds(value: unknown): Record<string, number[]> {
  if (!isRecord(value)) {
    return {}
  }
  const ids: Record<string, number[]> = {}
  for (const [slug, raw] of Object.entries(value)) {
    if (!Array.isArray(raw)) {
      continue
    }
    ids[slug] = raw.map(wholeId).filter((id): id is number => id != null)
  }
  return ids
}

function sortDictionaryIds(value: Record<string, number[]>): Record<string, number[]> {
  const sorted: Record<string, number[]> = {}
  for (const slug of Object.keys(value).sort()) {
    sorted[slug] = [...(value[slug] ?? [])].sort((left, right) => left - right)
  }
  return sorted
}

function wholeId(value: unknown): number | null {
  const id = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function authorLabel(name: unknown, email: unknown): string {
  if (typeof name === 'string' && name.trim()) {
    return name.trim()
  }
  if (typeof email === 'string' && email.trim()) {
    return email.trim()
  }
  return 'Unknown'
}

function asIso(value: unknown): string | null {
  if (value == null || value === '') {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toISOString()
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
