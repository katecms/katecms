/**
 * Role & permission configuration.
 *
 * Roles are config-extensible: the CMS ships built-in roles
 * (`owner`, `admin`, `editor`, `author`, `subscriber`) and the `roles` map lets
 * you add new roles, override the rights of a built-in one (by re-declaring its
 * slug), or hide a built-in one (`author: false`).
 *
 * The `owner` slug is reserved: it always exists as a protected superuser role
 * with full access and cannot be overridden or hidden.
 */

/** A CRUD action that can be granted on a resource. */
export type RoleAction = 'read' | 'create' | 'update' | 'delete'

/**
 * Rights on a single resource: an explicit list of actions, or a boolean
 * shorthand (`true` = every action, `false` = no access).
 */
export type ResourceRights = RoleAction[] | boolean

/**
 * Rights on a keyed resource (collections, taxonomies). One of:
 * - a boolean covering every entry (`true` = all actions, `false` = none);
 * - an action list applied to every entry (e.g. `['read']` = read any entry);
 * - a per-entry map keyed by slug (entries not listed get no access).
 */
export type ScopedRights = boolean | RoleAction[] | Record<string, ResourceRights>

/**
 * Capabilities granted to a role across CMS resources. Any omitted resource
 * defaults to no access.
 */
export interface RoleRights {
  /** Per-collection rights (keyed by collection slug) or a blanket boolean. */
  collections?: ScopedRights
  /** Per-taxonomy rights (keyed by taxonomy slug) or a blanket boolean. */
  taxonomies?: ScopedRights
  /** Rights on the media library. */
  media?: ResourceRights
  /** Rights to manage users (create/edit/delete accounts and roles). */
  users?: ResourceRights
  /** Rights on site options/settings. */
  options?: ResourceRights
}

/** A single role definition. */
export interface Role {
  /** Human-readable label shown in the admin UI. */
  label: string
  /** Capabilities granted to the role. Omitted resources grant no access. */
  rights?: RoleRights
}

/**
 * Roles map in CMS config, keyed by slug.
 *
 * - Add a new role by giving it a {@link Role} definition.
 * - Override a built-in role (`admin`/`editor`/`author`/`subscriber`) by
 *   re-declaring its slug; the definition fully replaces the built-in one.
 * - Hide a built-in role by setting it to `false` (e.g. `author: false`).
 * - The `owner` slug is reserved and any entry for it is ignored.
 */
export type Roles = Record<string, Role | false>

/**
 * Fully-resolved rights: every resource key is present (defaulting to `false`),
 * so consumers don't have to handle `undefined`.
 */
export interface ResolvedRoleRights {
  collections: ScopedRights
  taxonomies: ScopedRights
  media: ResourceRights
  users: ResourceRights
  options: ResourceRights
}

/**
 * A resolved role, keyed by slug. Built-in defaults are merged with the user
 * config and the protected `owner` superuser is always injected.
 */
export interface ResolvedRole {
  slug: string
  label: string
  /** When true the role bypasses all checks (the `owner` superuser). */
  superuser: boolean
  rights: ResolvedRoleRights
}
