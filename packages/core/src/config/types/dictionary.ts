import type { Fields } from './fields'

export interface DictionaryLabels {
  /** Plural label for the dictionary (e.g. `Categories`). */
  name: string
  /** Singular label for one term. Defaults to `labels.name` when omitted. */
  singularName?: string
}

/**
 * Definition of a dictionary type in CMS config.
 * Distinct from the database row type {@link Dictionary} exported from `core/database`.
 */
export interface DictionaryDefinition {
  labels: DictionaryLabels
  /** Inline SVG for the admin menu. Invalid or empty values use the default icon. */
  icon?: string
  fields?: Fields
  /** Enable parent/child nesting (uses the `parent_id` column). Default: false. */
  hierarchical?: boolean
  /**
   * Whether terms of this dictionary have a public URL. Default: `true`.
   * When `false`, the dictionary stays in the admin, but term URLs do not
   * resolve and the View link is hidden.
   */
  public?: boolean
  /**
   * Public URL pattern for terms. `%name%` is the term slug path.
   * Flat dictionaries use one segment. Hierarchical ones may include ancestors.
   *
   * @example '/categories/%name%'
   */
  rewrite?: string
  /** Collection slug(s) this dictionary is attached to. */
  collections: string[]
  /**
   * When `true`, an entry may have several terms of this dictionary.
   * When omitted / `false`, at most one term. The join table already allows
   * many rows per entry; this flag is enforced in the adapter. Default: `false`.
   */
  multiple?: boolean
}

/**
 * Map of dictionary definitions, keyed by slug.
 *
 * The object key is the dictionary slug (e.g. `categories`), stored as the `type`
 * column on each dictionary row.
 */
export type Dictionaries = Record<string, DictionaryDefinition>
