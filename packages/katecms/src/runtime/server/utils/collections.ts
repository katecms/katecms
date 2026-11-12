import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  can,
  canOnEntry,
  collectionPerPage,
  DEFAULT_COLLECTION_PER_PAGE,
  findUserById,
  formatRequiredFieldsError,
  isUniqueConstraintError,
  parseDate,
  UNLIMITED_COLLECTION_PER_PAGE,
  validateRequiredFields,
} from '@katecms/core'
import type {
  Collection,
  CollectionDefinition,
  CollectionListStatus,
  CollectionParentOption,
  CollectionStatus,
  Collections,
  Fields,
  RoleMap,
  SafeUser,
} from '@katecms/core'
import type {
  AdminCollectionMeta,
  AdminEntry,
  ParentOption,
  PublicDictionaryTerm,
} from '../../utils/collections'

const ENTRY_STATUSES: readonly CollectionStatus[] = ['published', 'draft', 'trash']
const LIST_STATUSES: readonly CollectionListStatus[] = ['published', 'draft', 'trash', 'active', 'all']
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

const STATUS_PHRASE: Record<number, string> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
}

export function fail(statusCode: number, message: string): never {
  throw createError({
    statusCode,
    statusMessage: STATUS_PHRASE[statusCode] ?? 'Error',
    message,
  })
}

export function getCollections(): Collections {
  return useRuntimeConfig().katecms?.collections ?? {}
}

export function getCollectionDefinition(slug: string): CollectionDefinition | undefined {
  return getCollections()[slug]
}

export function requireCollection(slug: string): CollectionDefinition {
  const collection = getCollectionDefinition(slug)
  if (!collection) {
    fail(404, 'Collection not found.')
  }
  return collection
}

export function toCollectionMeta(slug: string, def: CollectionDefinition): AdminCollectionMeta {
  return {
    slug,
    labels: {
      name: def.labels.name,
      singularName: def.labels.singularName ?? def.labels.name,
    },
    hierarchical: def.hierarchical === true,
    autosave: def.autosave === true,
    revisions: def.revisions !== false,
    public: def.public !== false,
    has_archive: typeof def.has_archive === 'string' ? def.has_archive : def.has_archive === true,
    perPage: collectionPerPage(def),
    rewrite: def.rewrite,
    fields: (def.fields ?? {}) as Fields,
  }
}

export function collectionRevisionsEnabled(def: CollectionDefinition): boolean {
  return def.revisions !== false
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toAdminEntry(
  row: Collection,
  slugPath: string,
  flags?: {
    canUpdate?: boolean
    canDelete?: boolean
    depth?: number
    authorName?: string | null
    dictionaryIds?: Record<string, number[]>
    dictionaries?: Record<string, PublicDictionaryTerm[]>
  },
): AdminEntry {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    slug: row.slug,
    slugPath: slugPath || row.slug,
    title: row.title,
    fields: (row.fields ?? {}) as Record<string, unknown>,
    parentId: row.parent_id,
    menuOrder: row.menu_order,
    authorId: row.author_id,
    createdAt: toIso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date(0).toISOString(),
    publishedAt: toIso(row.published_at),
    ...flags,
  }
}

export function entryFlags(
  actor: SafeUser,
  row: Collection,
  roles: RoleMap,
): { canUpdate: boolean, canDelete: boolean } {
  const entry = { authorId: row.author_id }
  return {
    canUpdate: canOnEntry(actor, 'collections', 'update', entry, {
      roles,
      scope: row.type,
      userId: actor.id,
    }),
    canDelete: canOnEntry(actor, 'collections', 'delete', entry, {
      roles,
      scope: row.type,
      userId: actor.id,
    }),
  }
}

export function toParentOption(row: CollectionParentOption): ParentOption {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    parentId: row.parentId,
    slugPath: row.slugPath,
    depth: row.depth,
  }
}

export function readCollectionSlug(raw: string | undefined): string {
  const slug = typeof raw === 'string' ? raw.trim() : ''
  if (!slug) {
    fail(400, 'Collection is required.')
  }
  return slug
}

export function readEntryId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    fail(400, 'Invalid entry id.')
  }
  return id
}

export function readTitle(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    fail(422, 'Title is required.')
  }
  return value.trim()
}

export function readSlug(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    fail(422, 'Slug is required.')
  }
  const slug = value.trim()
  if (!SLUG_PATTERN.test(slug)) {
    fail(422, 'Slug may contain only letters, numbers, and hyphens.')
  }
  return slug
}

export function readStatus(value: unknown, fallback: CollectionStatus = 'draft'): CollectionStatus {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  if (typeof value !== 'string' || !ENTRY_STATUSES.includes(value as CollectionStatus)) {
    fail(422, 'Invalid status.')
  }
  return value as CollectionStatus
}

export function readFields(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {}
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    fail(422, 'Invalid field values.')
  }
  return value as Record<string, unknown>
}

/** Reject published entries that are missing visible required fields. */
export function requirePublishedFields(
  def: CollectionDefinition,
  status: CollectionStatus,
  fields: Record<string, unknown>,
): void {
  if (status !== 'published') {
    return
  }
  const issues = validateRequiredFields(def.fields ?? {}, fields)
  if (issues.length > 0) {
    fail(422, formatRequiredFieldsError(issues))
  }
}

export function readParentId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const id = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    fail(422, 'Invalid parent.')
  }
  return id
}

export function readAuthorId(value: unknown): number {
  const id = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    fail(422, 'Invalid author.')
  }
  return id
}

/** Resolve `authorId` from the request. Assigning another user requires `users:read`. */
export async function resolveAuthorId(
  db: Parameters<typeof findUserById>[0],
  actor: SafeUser,
  roles: RoleMap,
  requested: unknown,
  fallback: number,
): Promise<number> {
  if (requested === undefined || requested === null || requested === '') {
    return fallback
  }
  const id = readAuthorId(requested)
  if (id === fallback) {
    return id
  }
  if (id !== actor.id && !can(actor, 'users', 'read', { roles })) {
    fail(403, 'Insufficient permissions.')
  }
  const user = await findUserById(db, id)
  if (!user) {
    fail(422, 'Author not found.')
  }
  return id
}

export function readMenuOrder(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(n)) {
    fail(422, 'Invalid menu order.')
  }
  return n
}

/** `undefined` = omit from patch; `null` = clear. */
export function readPublishedAt(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null || value === '') {
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }
  if (typeof value === 'string') {
    const iso = new Date(value)
    if (!Number.isNaN(iso.getTime())) {
      return iso
    }
    const parsed = parseDate(value, 'YYYY-MM-DD HH:mm') ?? parseDate(value, 'YYYY-MM-DD')
    if (parsed) {
      return parsed
    }
  }
  fail(422, 'Invalid publish date.')
}

export function readListStatus(value: unknown): CollectionListStatus {
  if (value === undefined || value === null || value === '') {
    return 'active'
  }
  if (value === 'all') {
    return 'active'
  }
  if (typeof value === 'string' && LIST_STATUSES.includes(value as CollectionListStatus)) {
    return value as CollectionListStatus
  }
  fail(400, 'Invalid status filter.')
}

export function readPage(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return 1
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    fail(400, 'Invalid page.')
  }
  return n
}

export function readPerPage(
  value: unknown,
  fallback: number = DEFAULT_COLLECTION_PER_PAGE,
): number {
  if (value === undefined || value === null || value === '') {
    if (fallback === UNLIMITED_COLLECTION_PER_PAGE) {
      return UNLIMITED_COLLECTION_PER_PAGE
    }
    if (!Number.isInteger(fallback) || fallback < 1) {
      return DEFAULT_COLLECTION_PER_PAGE
    }
    return fallback
  }
  const n = Number(value)
  if (n === UNLIMITED_COLLECTION_PER_PAGE) {
    return UNLIMITED_COLLECTION_PER_PAGE
  }
  if (!Number.isInteger(n) || n < 1) {
    fail(400, 'Invalid page size.')
  }
  return n
}

export function readSearch(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim().slice(0, 200)
}

export function rethrowCollectionWriteError(error: unknown): never {
  if (isUniqueConstraintError(error)) {
    fail(409, 'An entry with this slug already exists.')
  }
  const message = error instanceof Error ? error.message : ''
  if (
    /parent/i.test(message)
    || /descendant/i.test(message)
    || /hierarchy/i.test(message)
  ) {
    fail(422, message.startsWith('collections:') ? 'Invalid parent entry.' : message)
  }
  throw error
}
