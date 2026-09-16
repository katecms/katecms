import { describe, expect, it } from 'vitest'
import {
  buildPublicPath,
  buildArchivePath,
  buildSlugPathMap,
  collectionHasArchive,
  isCollectionPublic,
  matchCollectionArchive,
  matchCollectionPath,
  matchPublicCollectionRoute,
  normalizePublicPath,
  resolveArchivePath,
} from '../src'

const collections = {
  pages: {
    labels: { name: 'Pages' },
    hierarchical: true,
    rewrite: '/info/%name%',
    has_archive: true,
  },
  posts: {
    labels: { name: 'Posts' },
  },
  products: {
    labels: { name: 'Products' },
    has_archive: 'catalog',
  },
  internal: {
    labels: { name: 'Internal' },
    public: false,
    has_archive: true,
  },
}

describe('normalizePublicPath', () => {
  it('strips query/hash and trailing slash', () => {
    expect(normalizePublicPath('info/about/?x=1#h')).toBe('/info/about')
    expect(normalizePublicPath('/')).toBe('/')
  })
})

describe('matchCollectionPath', () => {
  it('matches hierarchical rewrite over the default flat pattern', () => {
    expect(matchCollectionPath(collections, '/info/about/team')).toEqual({
      collectionSlug: 'pages',
      segments: ['about', 'team'],
      slugPath: 'about/team',
    })
    expect(matchCollectionPath(collections, '/posts/hello')).toEqual({
      collectionSlug: 'posts',
      segments: ['hello'],
      slugPath: 'hello',
    })
    expect(matchCollectionPath(collections, '/posts/a/b')).toBeNull()
  })
})

describe('buildPublicPath', () => {
  it('fills %name% from rewrite or the default pattern', () => {
    expect(buildPublicPath('/info/%name%', 'pages', 'about/team')).toBe('/info/about/team')
    expect(buildPublicPath(undefined, 'posts', 'hello')).toBe('/posts/hello')
  })
})

describe('buildArchivePath', () => {
  it('strips %name% from rewrite', () => {
    expect(buildArchivePath('/info/%name%', 'pages')).toBe('/info')
    expect(buildArchivePath(undefined, 'posts')).toBe('/posts')
    expect(buildArchivePath('/%name%', 'pages')).toBe('/')
  })
})

describe('resolveArchivePath', () => {
  it('returns null when archives are off', () => {
    expect(resolveArchivePath({}, 'posts')).toBeNull()
    expect(resolveArchivePath({ has_archive: false }, 'posts')).toBeNull()
    expect(resolveArchivePath({ has_archive: '  ' }, 'posts')).toBeNull()
  })

  it('uses the rewrite prefix when has_archive is true', () => {
    expect(resolveArchivePath({ rewrite: '/info/%name%', has_archive: true }, 'pages')).toBe('/info')
    expect(resolveArchivePath({ has_archive: true }, 'posts')).toBe('/posts')
  })

  it('uses a custom slug string as the archive permalink', () => {
    expect(resolveArchivePath({ rewrite: '/type/%name%', has_archive: 'typepage' }, 'type')).toBe('/typepage')
    expect(resolveArchivePath({ has_archive: '/catalog/' }, 'products')).toBe('/catalog')
  })
})

describe('isCollectionPublic / collectionHasArchive', () => {
  it('defaults public to true and archive to false', () => {
    expect(isCollectionPublic({})).toBe(true)
    expect(isCollectionPublic({ public: false })).toBe(false)
    expect(collectionHasArchive({})).toBe(false)
    expect(collectionHasArchive({ has_archive: true })).toBe(true)
    expect(collectionHasArchive({ has_archive: 'news' })).toBe(true)
  })
})

describe('matchPublicCollectionRoute', () => {
  it('matches an entry rewrite before an archive of the same prefix', () => {
    expect(matchPublicCollectionRoute(collections, '/info/about/team')).toEqual({
      kind: 'entry',
      collectionSlug: 'pages',
      segments: ['about', 'team'],
      slugPath: 'about/team',
    })
    expect(matchPublicCollectionRoute(collections, '/info')).toEqual({
      kind: 'archive',
      collectionSlug: 'pages',
    })
  })

  it('uses a custom has_archive slug and ignores private collections', () => {
    expect(matchCollectionArchive(collections, '/catalog')).toEqual({
      collectionSlug: 'products',
    })
    expect(matchPublicCollectionRoute(collections, '/catalog')).toEqual({
      kind: 'archive',
      collectionSlug: 'products',
    })
    expect(matchPublicCollectionRoute(collections, '/products/widget')).toEqual({
      kind: 'entry',
      collectionSlug: 'products',
      segments: ['widget'],
      slugPath: 'widget',
    })
    expect(matchCollectionArchive(collections, '/internal')).toBeNull()
    expect(matchPublicCollectionRoute(collections, '/internal/secret')).toBeNull()
    expect(matchPublicCollectionRoute(collections, '/internal')).toBeNull()
    expect(matchCollectionPath(collections, '/internal/secret')).toEqual({
      collectionSlug: 'internal',
      segments: ['secret'],
      slugPath: 'secret',
    })
  })

  it('does not treat a rewrite prefix as an archive when has_archive is off', () => {
    expect(matchPublicCollectionRoute(collections, '/posts')).toBeNull()
    expect(matchPublicCollectionRoute(collections, '/posts/hello')).toEqual({
      kind: 'entry',
      collectionSlug: 'posts',
      segments: ['hello'],
      slugPath: 'hello',
    })
  })
})

describe('buildSlugPathMap', () => {
  it('joins ancestors and survives cycles', () => {
    const paths = buildSlugPathMap([
      { id: 1, slug: 'parent', parent_id: null },
      { id: 2, slug: 'child', parent_id: 1 },
      { id: 3, slug: 'loop-a', parent_id: 4 },
      { id: 4, slug: 'loop-b', parent_id: 3 },
    ])
    expect(paths.get(1)).toBe('parent')
    expect(paths.get(2)).toBe('parent/child')
    expect(paths.get(3)).toContain('loop-a')
    expect(paths.get(4)).toContain('loop-b')
    expect(paths.get(3)!.split('/').length).toBeLessThanOrEqual(3)
    expect(paths.get(4)!.split('/').length).toBeLessThanOrEqual(3)
  })
})
