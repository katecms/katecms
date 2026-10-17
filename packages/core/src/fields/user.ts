import type { MediaItem } from '../media/types'
import type { UserFieldValue } from '../config/types/fields'

/** Row / object accepted by {@link toUserFieldValue}. Extra keys (including a password hash) are dropped. */
export interface UserFieldSource {
  id: number
  email: string
  name: string | null
  avatar?: unknown
  role: string
  status?: string
  created_at: Date | string
}

export function isUserFieldValue(value: unknown): value is UserFieldValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const user = value as Partial<UserFieldValue>
  return typeof user.id === 'number'
    && Number.isFinite(user.id)
    && typeof user.email === 'string'
    && (user.name === null || typeof user.name === 'string')
    && typeof user.role === 'string'
    && (user.status === 'active' || user.status === 'banned')
    && typeof user.created_at === 'string'
}

/** Extract a select option id from a stored user field value. */
export function userFieldId(value: unknown): string {
  if (value == null || value === '') {
    return ''
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'object' && !Array.isArray(value) && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? String(id) : ''
  }
  if (typeof value === 'string') {
    return value
  }
  return ''
}

export function toUserFieldValue(user: UserFieldSource): UserFieldValue {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: toUserAvatar(user.avatar),
    role: user.role,
    status: user.status === 'banned' ? 'banned' : 'active',
    created_at: toIsoTimestamp(user.created_at),
  }
}

export function encodeUserFieldValue(
  user: UserFieldValue,
  returnFormat?: 'array' | 'id',
): UserFieldValue | number {
  return returnFormat === 'id' ? user.id : toUserFieldValue(user)
}

export function filterUsersByRole(
  users: readonly UserFieldValue[],
  role?: 'all' | string | string[] | null,
): UserFieldValue[] {
  if (role === 'all' || role == null || role === '') {
    return [...users]
  }
  const allowed = new Set((Array.isArray(role) ? role : [role]).map(String))
  return users.filter(user => allowed.has(user.role))
}

function toUserAvatar(value: unknown): MediaItem | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as MediaItem
}

function toIsoTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  }
  return value
}
