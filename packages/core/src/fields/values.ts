import type { ColorArrayValue, LinkValue } from '../config/types/fields'

export function isLinkValue(value: unknown): value is LinkValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  return typeof (value as { url?: unknown }).url === 'string'
}

export function isColorArrayValue(value: unknown): value is ColorArrayValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const color = value as Partial<ColorArrayValue>
  return typeof color.r === 'number' && typeof color.g === 'number' && typeof color.b === 'number'
}
