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
   * When `true`, leaving the create/edit screen with unsaved changes
   * automatically persists the entry as a `draft`. Default: false.
   */
  autosave?: boolean
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
