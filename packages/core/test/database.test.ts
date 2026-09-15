import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sql } from 'kysely'
import { afterEach, describe, expect, it } from 'vitest'
import {
  countCollections,
  countCollectionStatuses,
  createCollection,
  createDictionary,
  createSqliteDb,
  createUser,
  deleteOption,
  deleteTrashedCollections,
  deleteUser,
  findCollectionBySlugPath,
  findDictionaryByTypeAndSlug,
  findOption,
  findUserByEmail,
  hasAnyUser,
  listOptions,
  listUsers,
  toSafeUser,
  linkCollectionDictionary,
  flattenCollectionTree,
  listCollectionParentOptions,
  listCollections,
  listCollectionsByDictionary,
  listDictionariesByCollection,
  loadCollectionSlugPath,
  migrateSqlite,
  setCollectionDictionaries,
  setOption,
  unlinkCollectionDictionary,
  updateCollection,
  updateUser,
  validateCollectionParent,
} from '../src'
import { SCHEMA_SQL as postgresSchemaSql } from '../src/database/migrations/postgres/schema'
import { SCHEMA_SQL as sqliteSchemaSql } from '../src/database/migrations/sqlite/schema'

const require = createRequire(import.meta.url)
const BetterSqlite = require('better-sqlite3') as new (file: string) => {
  exec: (sql: string) => unknown
  prepare: (sql: string) => { all: (...params: unknown[]) => unknown, run: (...params: unknown[]) => unknown }
  close: () => void
}

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
})

async function memoryDb() {
  const sqlite = new BetterSqlite(':memory:')
  await migrateSqlite({ database: sqlite })
  const db = createSqliteDb({ database: sqlite })
  return {
    db,
    sqlite,
    async close() {
      await db.destroy()
      sqlite.close()
    },
  }
}

describe('database layer', () => {
  it('keeps .sql copies identical to schema.ts', () => {
    const sqliteSql = readFileSync(
      new URL('../src/database/migrations/sqlite/sqlite.sql', import.meta.url),
      'utf8',
    )
    const postgresSql = readFileSync(
      new URL('../src/database/migrations/postgres/postgres.sql', import.meta.url),
      'utf8',
    )
    expect(sqliteSql.replaceAll('\r\n', '\n')).toBe(sqliteSchemaSql.replaceAll('\r\n', '\n'))
    expect(postgresSql.replaceAll('\r\n', '\n')).toBe(postgresSchemaSql.replaceAll('\r\n', '\n'))
  })

  it('round-trips JSON primitives on SQLite', async () => {
    const { db, close } = await memoryDb()
    try {
      expect(await setOption(db, 'flag', false)).toMatchObject({ value: false })
      expect(await setOption(db, 'count', 42)).toMatchObject({ value: 42 })
      expect(await setOption(db, 'title', 'Mirai')).toMatchObject({ value: 'Mirai' })
      expect(await setOption(db, 'site', { name: 'Mirai' })).toMatchObject({ value: { name: 'Mirai' } })
      expect(await findOption(db, 'site')).toMatchObject({ key: 'site', value: { name: 'Mirai' } })
      expect(await setOption(db, 'site', { name: 'CMS' })).toMatchObject({ value: { name: 'CMS' } })
      const listed = await listOptions(db)
      expect(listed.map(row => row.key)).toEqual(['count', 'flag', 'site', 'title'])
      expect(await deleteOption(db, 'title')).toBe(true)
      expect(await findOption(db, 'title')).toBeUndefined()
    }
    finally {
      await close()
    }
  })

  it('trims email on update and type+slug on dictionary lookup', async () => {
    const { db, close } = await memoryDb()
    try {
      const user = await createUser(db, {
        email: 'Ada@example.com',
        password_hash: 'hash',
      })
      await updateUser(db, user.id, { email: '  Ada@example.com  ' })
      const found = await findUserByEmail(db, 'ada@example.com')
      expect(found?.email).toBe('ada@example.com')

      await createDictionary(db, {
        type: 'category',
        slug: 'news',
        title: 'News',
      })
      const term = await findDictionaryByTypeAndSlug(db, '  category  ', '  news  ')
      expect(term?.slug).toBe('news')
    }
    finally {
      await close()
    }
  })

  it('sets published_at only when it is empty', async () => {
    const { db, close } = await memoryDb()
    try {
      const user = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'hash',
      })
      const page = await createCollection(db, {
        type: 'page',
        slug: 'about',
        title: 'About',
        status: 'published',
        author_id: user.id,
      })
      const firstPublishedAt = page.published_at
      expect(firstPublishedAt).toBeInstanceOf(Date)

      await new Promise(resolve => setTimeout(resolve, 20))
      const again = await updateCollection(db, page.id, { status: 'published', title: 'About us' })
      expect(again?.published_at).toEqual(firstPublishedAt)
    }
    finally {
      await close()
    }
  })

  it('hides trash from listCollectionsByDictionary unless includeTrash', async () => {
    const { db, close } = await memoryDb()
    try {
      const user = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'hash',
      })
      const page = await createCollection(db, {
        type: 'page',
        slug: 'about',
        title: 'About',
        author_id: user.id,
      })
      const category = await createDictionary(db, {
        type: 'category',
        slug: 'news',
        title: 'News',
      })
      await linkCollectionDictionary(db, page.id, category.id)
      await updateCollection(db, page.id, { status: 'trash' })

      expect(await listCollectionsByDictionary(db, category.id)).toHaveLength(0)
      expect(await listCollectionsByDictionary(db, category.id, { includeTrash: true })).toHaveLength(1)
      expect(await unlinkCollectionDictionary(db, page.id, category.id)).toBe(true)
      expect(await unlinkCollectionDictionary(db, page.id, category.id)).toBe(false)
    }
    finally {
      await close()
    }
  })

  it('allows several terms of the same dictionary type on one entry', async () => {
    const { db, close } = await memoryDb()
    try {
      const page = await createCollection(db, {
        type: 'page',
        slug: 'about',
        title: 'About',
      })
      const news = await createDictionary(db, {
        type: 'category',
        slug: 'news',
        title: 'News',
      })
      const sport = await createDictionary(db, {
        type: 'category',
        slug: 'sport',
        title: 'Sport',
      })
      const region = await createDictionary(db, {
        type: 'region',
        slug: 'eu',
        title: 'Europe',
      })

      await setCollectionDictionaries(db, page.id, [news.id, sport.id, region.id, news.id])
      const linked = await listDictionariesByCollection(db, page.id)
      expect(linked.map(term => term.slug).sort()).toEqual(['eu', 'news', 'sport'])

      await setCollectionDictionaries(db, page.id, [sport.id])
      expect((await listDictionariesByCollection(db, page.id)).map(term => term.slug)).toEqual(['sport'])

      await setCollectionDictionaries(db, page.id, [])
      expect(await listDictionariesByCollection(db, page.id)).toEqual([])
    }
    finally {
      await close()
    }
  })

  it('deletes a user and rejects id 0', async () => {
    const { db, sqlite, close } = await memoryDb()
    try {
      const user = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'hash',
      })
      const removed = await deleteUser(db, user.id)
      expect(removed?.id).toBe(user.id)
      expect(await findUserByEmail(db, 'ada@example.com')).toBeUndefined()

      expect(() => {
        sqlite.prepare('INSERT INTO users (id, email, password_hash) VALUES (0, ?, ?)').run('zero@x.test', 'hash')
      }).toThrow()
    }
    finally {
      await close()
    }
  })

  it('refuses to delete the last owner', async () => {
    const { db, close } = await memoryDb()
    try {
      const owner = await createUser(db, {
        email: 'owner@example.com',
        password_hash: 'hash',
        role: 'owner',
      })
      await expect(deleteUser(db, owner.id)).rejects.toThrow(/last owner/)

      const other = await createUser(db, {
        email: 'owner2@example.com',
        password_hash: 'hash',
        role: 'owner',
      })
      await expect(deleteUser(db, owner.id)).resolves.toMatchObject({ id: owner.id })
      await expect(deleteUser(db, other.id)).rejects.toThrow(/last owner/)
      await expect(updateUser(db, other.id, { role: 'admin' })).rejects.toThrow(/last owner/)
    }
    finally {
      await close()
    }
  })

  it('rejects duplicate dictionary slugs among siblings', async () => {
    const { db, close } = await memoryDb()
    try {
      await createDictionary(db, { type: 'category', slug: 'news', title: 'News' })
      await expect(createDictionary(db, {
        type: 'category',
        slug: 'news',
        title: 'News 2',
      })).rejects.toThrow()

      const parent = await createDictionary(db, { type: 'category', slug: 'topics', title: 'Topics' })
      await createDictionary(db, {
        type: 'category',
        slug: 'news',
        title: 'Child news',
        parent_id: parent.id,
      })
    }
    finally {
      await close()
    }
  })

  it('reports whether any user exists and omits the hash from SafeUser', async () => {
    const { db, close } = await memoryDb()
    try {
      expect(await hasAnyUser(db)).toBe(false)
      const user = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'secret-hash',
        role: 'owner',
      })
      expect(await hasAnyUser(db)).toBe(true)
      expect(toSafeUser(user)).toEqual({
        id: user.id,
        email: 'ada@example.com',
        name: null,
        avatar: null,
        role: 'owner',
      })
      expect(toSafeUser(user)).not.toHaveProperty('password_hash')
    }
    finally {
      await close()
    }
  })

  it('pages user lists', async () => {
    const { db, close } = await memoryDb()
    try {
      await createUser(db, { email: 'a@example.com', password_hash: 'hash' })
      await createUser(db, { email: 'b@example.com', password_hash: 'hash' })
      await createUser(db, { email: 'c@example.com', password_hash: 'hash' })
      const page = await listUsers(db, { limit: 2, offset: 1 })
      expect(page).toHaveLength(2)
      expect(page.map(user => user.email)).toEqual(['b@example.com', 'c@example.com'])
    }
    finally {
      await close()
    }
  })

  it('enables WAL and busy_timeout on file databases', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'miraicms-'))
    tempDirs.push(dir)
    const file = join(dir, 'miraicms.db')
    await migrateSqlite(file)
    const db = createSqliteDb(file)
    try {
      const timeout = await sql<{ timeout: number }>`PRAGMA busy_timeout`.execute(db)
      expect(Number(timeout.rows[0]?.timeout)).toBe(5000)
      const mode = await sql<{ journal_mode: string }>`PRAGMA journal_mode`.execute(db)
      expect(mode.rows[0]?.journal_mode.toLowerCase()).toBe('wal')
    }
    finally {
      await db.destroy()
    }
  })

  it('filters, searches and pages collection lists', async () => {
    const { db, close } = await memoryDb()
    try {
      const user = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'hash',
      })
      await createCollection(db, {
        type: 'page',
        slug: 'about',
        title: 'About us',
        status: 'published',
        author_id: user.id,
      })
      await createCollection(db, {
        type: 'page',
        slug: 'draft-notes',
        title: 'Notes',
        status: 'draft',
        author_id: user.id,
      })
      const trashed = await createCollection(db, {
        type: 'page',
        slug: 'old',
        title: 'Old page',
        status: 'draft',
        author_id: user.id,
      })
      await updateCollection(db, trashed.id, { status: 'trash' })

      const active = await listCollections(db, 'page')
      expect(active.map(row => row.slug).sort()).toEqual(['about', 'draft-notes'])
      expect(await countCollections(db, 'page')).toBe(2)
      expect(await countCollections(db, 'page', { status: 'trash' })).toBe(1)
      expect(await countCollectionStatuses(db, 'page')).toEqual({
        all: 2,
        published: 1,
        draft: 1,
        trash: 1,
      })

      const found = await listCollections(db, 'page', { search: 'ABOUT' })
      expect(found).toHaveLength(1)
      expect(found[0]?.slug).toBe('about')

      const page = await listCollections(db, 'page', { limit: 1, offset: 1 })
      expect(page).toHaveLength(1)

      expect(await deleteTrashedCollections(db, 'page')).toBe(1)
      expect(await countCollections(db, 'page', { status: 'trash' })).toBe(0)
      expect(await countCollections(db, 'page')).toBe(2)
    }
    finally {
      await close()
    }
  })

  it('flattens collection rows as a parent/child tree', () => {
    const rows = [
      { id: 3, parent_id: 1 },
      { id: 1, parent_id: null },
      { id: 2, parent_id: 1 },
      { id: 4, parent_id: 2 },
      { id: 5, parent_id: 99 },
    ]
    expect(flattenCollectionTree(rows).map(node => [node.row.id, node.depth])).toEqual([
      [1, 0],
      [3, 1],
      [2, 1],
      [4, 2],
      [5, 0],
    ])
  })

  it('resolves hierarchical slug paths and parent options', async () => {
    const { db, close } = await memoryDb()
    try {
      const user = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'hash',
      })
      const parent = await createCollection(db, {
        type: 'page',
        slug: 'about',
        title: 'About',
        status: 'published',
        author_id: user.id,
      })
      const child = await createCollection(db, {
        type: 'page',
        slug: 'team',
        title: 'Team',
        status: 'published',
        author_id: user.id,
        parent_id: parent.id,
      })
      const draft = await createCollection(db, {
        type: 'page',
        slug: 'secret',
        title: 'Secret',
        status: 'draft',
        author_id: user.id,
        parent_id: parent.id,
      })

      expect(await loadCollectionSlugPath(db, 'page', child.id)).toBe('about/team')
      expect(await findCollectionBySlugPath(db, 'page', ['about', 'team'])).toMatchObject({ id: child.id })
      expect(await findCollectionBySlugPath(db, 'page', ['about', 'secret'], ['published'])).toBeUndefined()
      expect(await findCollectionBySlugPath(db, 'page', ['about', 'secret'])).toMatchObject({ id: draft.id })

      const listed = flattenCollectionTree(await listCollections(db, 'page'))
      expect(listed.map(node => [node.row.slug, node.depth])).toEqual([
        ['about', 0],
        ['secret', 1],
        ['team', 1],
      ])

      const options = await listCollectionParentOptions(db, 'page', child.id)
      expect(options.map(option => [option.slugPath, option.depth])).toEqual([
        ['about', 0],
        ['about/secret', 1],
      ])

      expect(await validateCollectionParent(db, 'page', parent.id, parent.id)).toEqual({
        ok: false,
        error: 'An entry cannot be its own parent.',
      })
      expect(await validateCollectionParent(db, 'page', parent.id, child.id)).toEqual({ ok: true })
      expect(await validateCollectionParent(db, 'page', null)).toEqual({ ok: true })
      expect(await validateCollectionParent(db, 'page', child.id, parent.id)).toEqual({
        ok: false,
        error: 'Cannot set a descendant as parent.',
      })
    }
    finally {
      await close()
    }
  })
})
