import type { CollectionStatus, CollectionStatusCounts, Fields } from '@miraicms/core'

/** Collection definition exposed to the admin UI (from CMS config). */
export interface AdminCollectionMeta {
  slug: string
  labels: {
    name: string
    singularName: string
  }
  hierarchical: boolean
  autosave: boolean
  rewrite?: string
  fields: Fields
}

/** A collection entry as shown in the admin UI and public resolve. */
export interface AdminEntry {
  id: number
  type: string
  status: CollectionStatus
  slug: string
  slugPath: string
  title: string
  fields: Record<string, unknown>
  parentId: number | null
  /** Nesting level in a hierarchical list (0 = top-level). */
  depth?: number
  menuOrder: number
  authorId: number | null
  /** Display name for the list (name, else email). Null when unknown. */
  authorName?: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  canUpdate?: boolean
  canDelete?: boolean
}

export interface ParentOption {
  id: number
  title: string
  slug: string
  parentId: number | null
  slugPath: string
}

export interface CollectionListResponse {
  collection: AdminCollectionMeta
  entries: AdminEntry[]
  counts: CollectionStatusCounts
  page: number
  perPage: number
  total: number
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  parents?: ParentOption[]
}

export interface CollectionEntryResponse {
  collection: AdminCollectionMeta
  entry: AdminEntry
  canUpdate: boolean
  canDelete: boolean
  parents?: ParentOption[]
}

export interface ResolveResponse {
  collection: AdminCollectionMeta
  entry: AdminEntry
  /** True when unpublished statuses were actually allowed for this request. */
  preview: boolean
}

export interface CollectionEntryFormModel {
  title: string
  slug: string
  status: CollectionStatus
  parentId: number | null
  publishedAt: string | null
  fields: Record<string, unknown>
}

export type CollectionListFilter = 'all' | CollectionStatus

export function collectionApi(slug: string, id?: number | 'trash'): string {
  const base = `/api/_miraicms/collections/${encodeURIComponent(slug)}`
  if (id == null) {
    return base
  }
  return `${base}/${id}`
}

export function collectionStatusLabel(status: CollectionStatus): string {
  if (status === 'published') {
    return 'Published'
  }
  if (status === 'draft') {
    return 'Draft'
  }
  return 'Trash'
}

/** Slim collection descriptors sent on `public.miraicms.collections` (sidebar). */
export interface PublicCollectionNav {
  labels: {
    name: string
    singularName: string
  }
  icon?: string
}
