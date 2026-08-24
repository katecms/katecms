import type { ResolvedRole, ResourceRights, RoleAction, ScopedRights } from '../config'

/** Resources that rights can be granted on. */
export type Resource = 'collections' | 'taxonomies' | 'media' | 'users' | 'options'

/** Keyed resources whose rights are scoped by an entry slug. */
const SCOPED_RESOURCES = new Set<Resource>(['collections', 'taxonomies'])

/** The minimal user shape needed to evaluate permissions. */
export type RoleHolder = { role: string }

export type RoleMap = Record<string, ResolvedRole>

export interface CanOptions {
  /** Resolved roles from {@link resolveRoles} / {@link resolveMiraiCmsConfig}. */
  roles: RoleMap
  /** Collection/taxonomy slug when `resource` is scoped. */
  scope?: string
}

export function getRole(roles: RoleMap, slug: string): ResolvedRole | undefined {
  return roles[slug]
}

export function isValidRole(roles: RoleMap, slug: string): boolean {
  return slug in roles
}

export function isOwner(user: RoleHolder, roles: RoleMap): boolean {
  return getRole(roles, user.role)?.superuser === true
}

/** Whether the user may run schema/index maintenance (owner or `maintenance` role). */
export function isAdminOrOwner(user: RoleHolder, roles: RoleMap): boolean {
  return isOwner(user, roles) || getRole(roles, user.role)?.maintenance === true
}

function resourceAllows(right: ResourceRights, action: RoleAction): boolean {
  if (typeof right === 'boolean') {
    return right
  }
  return right.includes(action)
}

function scopedAllows(right: ScopedRights, action: RoleAction, scope: string | undefined): boolean {
  if (typeof right === 'boolean') {
    return right
  }
  if (Array.isArray(right)) {
    return right.includes(action)
  }
  if (scope === undefined) {
    return false
  }
  const entry = right[scope]
  return entry === undefined ? false : resourceAllows(entry, action)
}

/**
 * Whether `user` may perform `action` on `resource`.
 *
 * For keyed resources (`collections`, `taxonomies`) pass `options.scope`.
 * The `owner` superuser always passes.
 */
export function can(
  user: RoleHolder,
  resource: Resource,
  action: RoleAction,
  options: CanOptions,
): boolean {
  const role = getRole(options.roles, user.role)
  if (!role) {
    return false
  }
  if (role.superuser) {
    return true
  }
  const right = role.rights[resource]
  if (SCOPED_RESOURCES.has(resource)) {
    return scopedAllows(right as ScopedRights, action, options.scope)
  }
  return resourceAllows(right as ResourceRights, action)
}

export interface EntryAuthor {
  authorId: number | null
}

export interface CanOnEntryOptions extends CanOptions {
  /** Authenticated user id, compared to {@link EntryAuthor.authorId}. */
  userId: number
}

/**
 * Permission check for one stored entry (update/delete).
 *
 * `read` / `create` follow {@link can}. `update` / `delete` additionally require
 * `userId === entry.authorId`, unless the role is owner, has `maintenance`,
 * or has blanket (`true`) rights on the resource/scope.
 */
export function canOnEntry(
  user: RoleHolder,
  resource: Resource,
  action: RoleAction,
  entry: EntryAuthor,
  options: CanOnEntryOptions,
): boolean {
  if (!can(user, resource, action, options)) {
    return false
  }
  if (action === 'read' || action === 'create') {
    return true
  }
  if (isAdminOrOwner(user, options.roles)) {
    return true
  }
  const role = getRole(options.roles, user.role)
  if (!role) {
    return false
  }
  const right = role.rights[resource]
  if (right === true) {
    return true
  }
  if (
    right
    && typeof right === 'object'
    && !Array.isArray(right)
    && options.scope !== undefined
    && right[options.scope] === true
  ) {
    return true
  }
  return entry.authorId === options.userId
}
