import type { Fields } from './fields'

export interface TaxonomyLabels {
  /** Plural label for the taxonomy (e.g. `Categories`). */
  name: string
  /** Singular label for one term. Defaults to `labels.name` when omitted. */
  singularName?: string
}

/** Definition of a single taxonomy. */
export interface Taxonomy {
  labels: TaxonomyLabels
  fields?: Fields
  /** Collection slug(s) this taxonomy is attached to. */
  collections: string[]
}

/**
 * Map of taxonomies, keyed by slug.
 *
 * The object key is the taxonomy slug (e.g. `categories`), stored as the `type`
 * column on each taxonomy row.
 */
export type Taxonomies = Record<string, Taxonomy>
