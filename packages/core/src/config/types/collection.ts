import type { Fields } from './fields'

export interface CollectionLabels {
  /** Plural label for the collection (e.g. `Pages`). */
  name: string
  /** Singular label for one entry. Defaults to `labels.name` when omitted. */
  singularName?: string
}

/**
 * Definition of a collection type in CMS config.
 * Distinct from the database row type {@link Collection} exported from `core/database`.
 */
export interface CollectionDefinition {
  labels: CollectionLabels
  icon?: string
  /** Enable parent/child nesting (uses the `parent_id` column). Default: false. */
  hierarchical?: boolean
  /**
   * When `true`, leaving a **new** unsaved entry persists it as a `draft`.
   * Already saved draft/published entries prompt instead. Default: `false`.
   */
  autosave?: boolean
  /**
   * Whether this collection is public. Default: `true`.
   *
   * When `false`, the collection stays in the admin menu, but public
   * entry/archive URLs do not resolve and admin View links are hidden.
   */
  public?: boolean
  /**
   * Enable a public archive (listing) for this collection. Default: `false`.
   *
   * - `true` — archive URL is the rewrite prefix (`/type/%name%` → `/type`).
   * - a string — that slug is used as the archive permalink
   *   (`'typepage'` → `/typepage`).
   */
  has_archive?: boolean | string
  /**
   * Entries per page on this collection's public archive and admin list.
   * Default: {@link DEFAULT_COLLECTION_PER_PAGE} (10).
   * `-1` ({@link UNLIMITED_COLLECTION_PER_PAGE}) returns every entry.
   */
  perPage?: number
  /**
   * Public URL pattern for entries of this collection.
   * Use `%name%` as a placeholder for the entry slug path.
   *
   * For flat collections `%name%` is a single segment (`about`).
   * For `hierarchical: true` it may include ancestors (`parent/child`).
   *
   * @example '/page/%name%'  // → /page/about  or  /page/parent/child
   * @example '/%name%'       // → /about
   * @example '/info/%name%'  // → /info/about
   */
  rewrite?: string
  fields?: Fields
  /**
   * Blocks allowed on entries of this collection:
   * - an array of block slugs from the top-level `blocks` registry,
   * - `true` to allow every registered block,
   * - `false` / omitted to disable blocks. Default: false.
   */
  blocks?: string[] | boolean
}

/**
 * Map of collection definitions, keyed by slug.
 *
 * The object key is the collection slug (e.g. `pages`), stored as the `type`
 * column on each entry.
 */
export type Collections = Record<string, CollectionDefinition>

/** Default `perPage` when a collection omits the option. */
export const DEFAULT_COLLECTION_PER_PAGE = 10

/** `perPage` value that disables paging and returns every entry. */
export const UNLIMITED_COLLECTION_PER_PAGE = -1

export function isUnlimitedPerPage(perPage: number): boolean {
  return perPage === UNLIMITED_COLLECTION_PER_PAGE
}

/** Resolved page size for a collection (`perPage`, default 10, or `-1` for all). */
export function collectionPerPage(
  def?: Pick<CollectionDefinition, 'perPage'> | null,
): number {
  const n = def?.perPage
  if (n === UNLIMITED_COLLECTION_PER_PAGE) {
    return UNLIMITED_COLLECTION_PER_PAGE
  }
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
    return DEFAULT_COLLECTION_PER_PAGE
  }
  return n
}

/** `LIMIT` / `OFFSET` for a list, or `{}` when `perPage` is unlimited. */
export function collectionListPaging(
  page: number,
  perPage: number,
): { limit?: number, offset?: number } {
  if (isUnlimitedPerPage(perPage)) {
    return {}
  }
  return {
    limit: perPage,
    offset: Math.max(0, page - 1) * perPage,
  }
}
