/** Field types that never own a value key in the form store. */
export const LAYOUT_ONLY_FIELD_TYPES = new Set([
  'tab',
  'accordion',
  'separator',
  'message',
])

export function isLayoutOnlyFieldType(type: string): boolean {
  return LAYOUT_ONLY_FIELD_TYPES.has(type)
}
