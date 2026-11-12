import { isImageMedia } from '@katecms/core'
import type { MediaItem, UserFieldValue } from '@katecms/core'

/** A user row in the admin UI. Same shape as a stored `user` field value. */
export type AdminUser = UserFieldValue

/** A role option (slug + label) for pickers and table labels. */
export interface RoleOption {
  slug: string
  label: string
}

/** Response of `GET /api/_katecms/users`. */
export interface UsersResponse {
  users: AdminUser[]
  roles: RoleOption[]
  currentUserId: number
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

/** Prefer a compact image variant for avatars, then the original URL. */
export function avatarSrc(avatar: MediaItem | null | undefined): string | null {
  if (!avatar || !isImageMedia(avatar)) {
    return null
  }
  const preferred = avatar.variants?.find(variant => variant.size === 'thumbnail')
    ?? avatar.variants?.find(variant => variant.size === 'medium')
  return preferred?.url || avatar.url || null
}

export function userInitials(user: Pick<AdminUser, 'name' | 'email'>): string {
  const name = user.name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return (user.email[0] || '?').toUpperCase()
}
