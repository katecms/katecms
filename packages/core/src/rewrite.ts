import type { CollectionDefinition, Collections } from './config'

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

export type CollectionRouteMatch
  = | (CollectionPathMatch & { kind: 'entry' })
    | { kind: 'archive', collectionSlug: string }

/** Default `true`: omitted `public` still exposes the collection. */
export function isCollectionPublic(def: Pick<CollectionDefinition, 'public'>): boolean {
  return def.public !== false
}

/** `true` or a non-empty slug string enables the archive. */
export function collectionHasArchive(
  def: Pick<CollectionDefinition, 'has_archive'>,
): boolean {
  if (def.has_archive === true) {
    return true
  }
  return typeof def.has_archive === 'string' && def.has_archive.trim() !== ''
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
 * Public archive URL for a collection, or `null` when archives are off.
 *
 * `has_archive: true` uses {@link buildArchivePath}. A string is used as the
 * permalink slug (`'typepage'` → `/typepage`).
 */
export function resolveArchivePath(
  def: Pick<CollectionDefinition, 'rewrite' | 'has_archive'>,
  collectionSlug: string,
): string | null {
  if (!collectionHasArchive(def)) {
    return null
  }
  if (typeof def.has_archive === 'string') {
    return normalizePublicPath(def.has_archive.trim())
  }
  return buildArchivePath(def.rewrite, collectionSlug)
}

function publicCollections(collections: Collections): Collections {
  return Object.fromEntries(
    Object.entries(collections).filter(([, def]) => isCollectionPublic(def)),
  )
}

/**
 * Match an exact archive path for a public collection with `has_archive`.
 * Longer archive paths win; equal length keeps config object order.
 */
export function matchCollectionArchive(
  collections: Collections,
  path: string,
): { collectionSlug: string } | null {
  const normalized = normalizePublicPath(path)
  const candidates = Object.entries(collections)
    .map(([slug, def]) => {
      if (!isCollectionPublic(def)) {
        return null
      }
      const archive = resolveArchivePath(def, slug)
      return archive ? { slug, archive } : null
    })
    .filter((item): item is { slug: string, archive: string } => item != null)
    .sort((a, b) => b.archive.length - a.archive.length)

  for (const { slug, archive } of candidates) {
    if (archive === normalized) {
      return { collectionSlug: slug }
    }
  }
  return null
}

/**
 * Match a public frontend path to a collection entry or archive.
 * Non-public collections are skipped. Entry rewrites win over archives.
 */
export function matchPublicCollectionRoute(
  collections: Collections,
  path: string,
): CollectionRouteMatch | null {
  const visible = publicCollections(collections)
  const entry = matchCollectionPath(visible, path)
  if (entry) {
    return { kind: 'entry', ...entry }
  }
  const archive = matchCollectionArchive(visible, path)
  if (archive) {
    return { kind: 'archive', collectionSlug: archive.collectionSlug }
  }
  return null
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
