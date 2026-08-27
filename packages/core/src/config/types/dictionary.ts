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
  fields?: Fields
  /** Collection slug(s) this dictionary is attached to. */
  collections: string[]
}

/**
 * Map of dictionary definitions, keyed by slug.
 *
 * The object key is the dictionary slug (e.g. `categories`), stored as the `type`
 * column on each dictionary row.
 */
export type Dictionaries = Record<string, DictionaryDefinition>
