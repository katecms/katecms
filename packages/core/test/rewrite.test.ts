import { describe, expect, it } from 'vitest'
import {
  buildPublicPath,
  buildSlugPathMap,
  matchCollectionPath,
  normalizePublicPath,
} from '../src'

const collections = {
  pages: {
    labels: { name: 'Pages' },
    hierarchical: true,
    rewrite: '/info/%name%',
  },
  posts: {
    labels: { name: 'Posts' },
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
