import { createError } from 'h3'
import {
  ADMIN_ROLE,
  isImageMedia,
  isMediaItem,
  isValidRole,
  SUBSCRIBER_ROLE,
  toUserFieldValue,
} from '@katecms/core'
import type { MediaItem, RoleMap, User } from '@katecms/core'
import type { AdminUser, RoleOption } from '../../utils/admin-users'

const STATUS_PHRASE: Record<number, string> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
}

export function fail(statusCode: number, message: string): never {
  throw createError({
    statusCode,
    statusMessage: STATUS_PHRASE[statusCode] ?? 'Error',
    message,
  })
}

export function toAdminUser(user: User): AdminUser {
  return toUserFieldValue(user)
}

export function roleOptions(roles: RoleMap): RoleOption[] {
  return Object.values(roles).map(role => ({ slug: role.slug, label: role.label }))
}

/** Role assigned when the create payload omits `role`. */
export function defaultAssignableRole(roles: RoleMap): string {
  if (isValidRole(roles, SUBSCRIBER_ROLE)) {
    return SUBSCRIBER_ROLE
  }
  return ADMIN_ROLE
}

export function readName(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length ? value.trim() : null
}

/**
 * Parse an optional avatar payload: a media item, or null to clear.
 * Empty / missing values become null; malformed payloads are rejected.
 */
export function readAvatar(value: unknown): MediaItem | null {
  if (value === null || value === undefined) {
    return null
  }
  if (
    !isMediaItem(value)
    || !isImageMedia(value)
    || !Number.isInteger(value.id)
    || value.id <= 0
    || !value.filename
  ) {
    fail(422, 'Invalid avatar.')
  }
  return value
}
