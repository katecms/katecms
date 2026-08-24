import type { Fields } from './fields'

/** Definition of a single content block in the top-level `blocks` registry. */
export interface Block {
  label: string
  icon?: string
  fields?: Fields
}

/**
 * Map of block definitions, keyed by slug.
 *
 * The object key is the block slug (e.g. `hero`), which collections reference
 * via their `blocks` allowlist.
 */
export type Blocks = Record<string, Block>
