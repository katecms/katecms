import type { Field } from './fields'

export interface OptionPageLabels {
  /** Label shown in the admin menu (e.g. `Site`). */
  name: string
}

/** Distribute `Omit` over the {@link Field} union so variant-only keys stay. */
type OmitPosition<T> = T extends unknown ? Omit<T, 'position'> : never

/** Field on an options page: same as {@link Field} without `position` (no main/sidebar). */
export type OptionField = OmitPosition<Field>

export type OptionFields = Record<string, OptionField>

/**
 * Definition of a singleton options page in CMS config.
 *
 * The object key is the page slug (e.g. `site`), stored as `options.key`.
 * Field schema lives in config; stored `options.value` is the fields map.
 */
export interface OptionPageDefinition {
  labels: OptionPageLabels
  /** Inline SVG for the admin menu. Invalid or empty values use the default icon. */
  icon?: string
  fields?: OptionFields
}

/**
 * Map of option page definitions, keyed by slug.
 *
 * The object key is the page slug (e.g. `site`), stored as `options.key`.
 */
export type OptionPages = Record<string, OptionPageDefinition>
