import type { ResolvedRole, ResolvedRoleRights, RoleRights, Roles } from './types'

/**
 * Reserved slug for the protected superuser role. The first account created
 * after the database is migrated becomes the `owner`; it always has full access
 * and cannot be overridden, hidden, demoted, deleted or banned.
 */
export const OWNER_ROLE = 'owner'

/** Every capability, granted on every resource. Used by the `owner` superuser. */
const FULL_RIGHTS: RoleRights = {
  collections: true,
  dictionaries: true,
  media: true,
  users: true,
  options: true,
}

/**
 * Built-in roles available in every install (besides the reserved `owner`).
 * Any of these can be overridden or hidden from CMS config.
 */
export const BUILT_IN_ROLES: Roles = {
  admin: {
    label: 'Administrator',
    maintenance: true,
    rights: FULL_RIGHTS,
  },
  editor: {
    label: 'Editor',
    rights: {
      collections: true,
      dictionaries: true,
      media: true,
    },
  },
  author: {
    label: 'Author',
    rights: {
      collections: ['read', 'create', 'update'],
      media: ['read', 'create'],
    },
  },
  subscriber: {
    label: 'Subscriber',
    rights: {
      collections: ['read'],
    },
  },
}

/** Fill in every resource key so consumers never deal with `undefined`. */
function normalizeRights(rights?: RoleRights): ResolvedRoleRights {
  return {
    collections: rights?.collections ?? false,
    dictionaries: rights?.dictionaries ?? false,
    media: rights?.media ?? false,
    users: rights?.users ?? false,
    options: rights?.options ?? false,
  }
}

export interface ResolveRolesResult {
  roles: Record<string, ResolvedRole>
  warnings: string[]
}

/**
 * Merge the user `roles` config over the built-in roles and inject the
 * protected `owner` superuser.
 *
 * - A `Role` definition adds a new role or fully replaces a built-in one.
 * - `false` hides a built-in role.
 * - Any entry for the reserved `owner` slug is ignored (warning in `warnings`).
 */
export function resolveRoles(configRoles?: Roles): ResolveRolesResult {
  const warnings: string[] = []
  const merged: Roles = { ...BUILT_IN_ROLES }

  for (const [slug, definition] of Object.entries(configRoles ?? {})) {
    if (slug === OWNER_ROLE) {
      warnings.push('role "owner" is reserved and cannot be overridden; ignoring config entry.')
      continue
    }
    merged[slug] = definition
  }

  const roles: Record<string, ResolvedRole> = {
    [OWNER_ROLE]: {
      slug: OWNER_ROLE,
      label: 'Owner',
      superuser: true,
      maintenance: true,
      rights: normalizeRights(FULL_RIGHTS),
    },
  }

  for (const [slug, definition] of Object.entries(merged)) {
    if (definition === false) {
      continue
    }
    roles[slug] = {
      slug,
      label: definition.label,
      superuser: false,
      maintenance: definition.maintenance === true,
      rights: normalizeRights(definition.rights),
    }
  }

  return { roles, warnings }
}
