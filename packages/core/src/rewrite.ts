import type { Collections } from './config'

/** Strip query/hash, ensure leading slash, drop trailing slash (except `/`). */
export function normalizePublicPath(path: string): string {
  let p = path.split('?')[0]?.split('#')[0] ?? ''
  if (!p.startsWith('/')) {
    p = `/${p}`
  }
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1)
  }
  return p || '/'
}

/**
 * Default public URL pattern when a collection has no `rewrite`.
 * `/{collection}/%name%`.
 */
export function defaultRewrite(collectionSlug: string): string {
  return `/${collectionSlug}/%name%`
}

export interface CollectionPathMatch {
  collectionSlug: string
  /** Slug segments under the rewrite prefix, e.g. `['about', 'team']`. */
  segments: string[]
  /** Joined slug path, e.g. `about/team`. */
  slugPath: string
}

/**
 * Match a request path against collection `rewrite` patterns.
 *
 * `%name%` is one segment for flat collections, or one or more segments when
 * `hierarchical: true`.
 *
 * Matching order: longer rewrite strings first. When two rewrites have the same
 * length, `Object.entries` order is used (the order keys were declared in the
 * config object). The algorithm is not changed; adapters should not rely on
 * equal-length ties being stable across engines.
 */
export function matchCollectionPath(
  collections: Collections,
  path: string,
): CollectionPathMatch | null {
  const normalized = normalizePublicPath(path)

  const candidates = Object.entries(collections)
    .map(([slug, def]) => ({
      slug,
      rewrite: normalizePublicPath(def.rewrite?.trim() || defaultRewrite(slug)),
      hierarchical: def.hierarchical === true,
    }))
    .sort((a, b) => b.rewrite.length - a.rewrite.length)

  for (const { slug, rewrite, hierarchical } of candidates) {
    if (!rewrite.includes('%name%')) {
      continue
    }
    const escaped = rewrite.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const namePattern = hierarchical ? '(.+)' : '([^/]+)'
    const regex = new RegExp(`^${escaped.replace(/%name%/g, namePattern)}$`)
    const match = normalized.match(regex)
    const captured = match?.[1]
    if (!captured) {
      continue
    }
    const segments = captured.split('/').filter(Boolean)
    if (segments.length === 0) {
      continue
    }
    if (!hierarchical && segments.length !== 1) {
      continue
    }
    return {
      collectionSlug: slug,
      segments,
      slugPath: segments.join('/'),
    }
  }

  return null
}

/** Build a public path from rewrite + slug path (`parent/child` or a single slug). */
export function buildPublicPath(
  rewrite: string | undefined,
  collectionSlug: string,
  slugPath: string,
): string {
  const pattern = normalizePublicPath(rewrite?.trim() || defaultRewrite(collectionSlug))
  return pattern.replace(/%name%/g, slugPath)
}

/** Collection archive path: rewrite with `%name%` removed (`/inf/%name%` → `/inf`). */
export function buildArchivePath(
  rewrite: string | undefined,
  collectionSlug: string,
): string {
  const pattern = normalizePublicPath(rewrite?.trim() || defaultRewrite(collectionSlug))
  return normalizePublicPath(pattern.replace(/%name%/g, '').replace(/\/{2,}/g, '/'))
}

/**
 * Build `id → slugPath` for entries that include `parent_id` links.
 * Cycle-safe: a loop falls back to the entry's own slug.
 */
export function buildSlugPathMap(
  entries: Array<{ id: number, slug: string, parent_id: number | null }>,
): Map<number, string> {
  const byId = new Map(entries.map(entry => [entry.id, entry]))
  const cache = new Map<number, string>()

  function pathFor(id: number, stack: Set<number> = new Set()): string {
    if (cache.has(id)) {
      return cache.get(id)!
    }
    const entry = byId.get(id)
    if (!entry) {
      return ''
    }
    if (stack.has(id)) {
      return entry.slug
    }
    stack.add(id)
    if (entry.parent_id == null || !byId.has(entry.parent_id)) {
      cache.set(id, entry.slug)
      return entry.slug
    }
    const parentPath = pathFor(entry.parent_id, stack)
    const full = parentPath ? `${parentPath}/${entry.slug}` : entry.slug
    cache.set(id, full)
    return full
  }

  for (const entry of entries) {
    pathFor(entry.id)
  }
  return cache
}
