import type { CollectionStatus } from '@miraicms/core'

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])
const PUBLIC_STATUSES = new Set<CollectionStatus>(['published', 'draft'])

export function isTruthyQueryParam(value: unknown): boolean {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw === 'boolean') {
    return raw
  }
  if (typeof raw === 'number') {
    return raw !== 0
  }
  if (typeof raw !== 'string') {
    return false
  }
  return TRUTHY.has(raw.trim().toLowerCase())
}

/**
 * Parse `status` from a query string (`published`, `draft`, or comma-separated).
 * Trash is never a public status.
 */
export function parsePublicStatusParam(value: unknown): CollectionStatus[] | null {
  const raw = Array.isArray(value) ? value.join(',') : value
  if (typeof raw !== 'string' || !raw.trim()) {
    return null
  }
  const statuses = raw
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter((part): part is CollectionStatus => PUBLIC_STATUSES.has(part as CollectionStatus))
  return statuses.length > 0 ? [...new Set(statuses)] : null
}

/**
 * Statuses the public resolve endpoint may look up.
 *
 * - Default: `published` only.
 * - `preview` + authorized: `published` + `draft`, or the requested subset.
 * - Unauthorized preview: still `published` only (no 403, no existence leak).
 */
export function resolvePublicStatuses(options: {
  previewRequested: boolean
  previewAllowed: boolean
  requested?: CollectionStatus[] | null
}): { statuses: CollectionStatus[], preview: boolean } {
  if (!options.previewRequested || !options.previewAllowed) {
    return { statuses: ['published'], preview: false }
  }
  const requested = (options.requested ?? []).filter(status => status !== 'trash')
  if (requested.length === 0) {
    return { statuses: ['published', 'draft'], preview: true }
  }
  return { statuses: requested, preview: true }
}
