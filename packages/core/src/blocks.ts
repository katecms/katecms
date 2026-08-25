/**
 * A block instance stored on a collection entry (`collections.blocks`).
 *
 * Distinct from {@link Block} in config, which is the registry definition.
 */
export interface BlockInstance {
  id: string
  name: string
  data: Record<string, unknown>
}

const ID_LENGTH = 10
const FIRST_ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
const REST_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const ID_MAX_LENGTH = 64

const BLOCK_ID_RE = new RegExp(`^[a-z][a-z0-9]{0,${ID_MAX_LENGTH - 1}}$`, 'i')

/**
 * Random {@link ID_LENGTH}-character block id: starts with a letter, letters/digits only.
 * Safe as an HTML id / CSS selector / URL hash. Not a security token.
 */
export function newBlockId(): string {
  const bytes = new Uint8Array(ID_LENGTH)
  globalThis.crypto.getRandomValues(bytes)
  let id = FIRST_ALPHABET[bytes[0]! % FIRST_ALPHABET.length]!
  for (let i = 1; i < ID_LENGTH; i++) {
    id += REST_ALPHABET[bytes[i]! % REST_ALPHABET.length]!
  }
  return id
}

/** Whether a (manually entered) block id has a valid, anchor-safe shape. */
export function isValidBlockId(value: unknown): value is string {
  return typeof value === 'string' && BLOCK_ID_RE.test(value)
}

export function createBlockInstance(
  name: string,
  data: Record<string, unknown> = {},
): BlockInstance {
  return { id: newBlockId(), name, data }
}

type RawBlockInstance = { id?: unknown, name: string, data?: Record<string, unknown> }

/**
 * Keep each instance's id when it is a valid block id, otherwise generate one.
 * Preserves anchors for ids typed in the editor.
 */
export function ensureBlockIds(blocks: RawBlockInstance[]): BlockInstance[] {
  return blocks.map(block => ({
    id: isValidBlockId(block.id) ? block.id : newBlockId(),
    name: block.name,
    data: block.data ?? {},
  }))
}
