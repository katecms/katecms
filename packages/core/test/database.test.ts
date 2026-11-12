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
  queryCollections,
  queryTerms,
  countQueryCollections,
  fieldsQueryUsesRegexp,
  parseFieldsQuery,
  setCollectionDictionaries,
  setOption,
  unlinkCollectionDictionary,
  updateCollection,
  updateUser,
  validateCollectionParent,
  isUniqueConstraintError,
} from '../src'
import { SCHEMA_SQL as postgresSchemaSql } from '../src/database/migrations/postgres/schema'
import { SCHEMA_SQL as sqliteSchemaSql } from '../src/database/migrations/sqlite/schema'

describe('isUniqueConstraintError', () => {
  it('accepts unique violations and rejects other SQLite constraints', () => {
    expect(isUniqueConstraintError({ code: '23505' })).toBe(true)
    expect(isUniqueConstraintError({ code: 'SQLITE_CONSTRAINT_UNIQUE' })).toBe(true)
    expect(isUniqueConstraintError({
      code: 'SQLITE_CONSTRAINT',
      message: 'UNIQUE constraint failed: users.email',
    })).toBe(true)
    expect(isUniqueConstraintError({
      message: 'duplicate key value violates unique constraint "users_email_unique"',
    })).toBe(true)

    expect(isUniqueConstraintError({
      code: 'SQLITE_CONSTRAINT',
      message: 'CHECK constraint failed: collections',
    })).toBe(false)
    expect(isUniqueConstraintError({
      code: 'SQLITE_CONSTRAINT_CHECK',
      message: 'collections: slug must be unique among siblings',
    })).toBe(false)
    expect(isUniqueConstraintError({
      code: 'SQLITE_CONSTRAINT_FOREIGNKEY',
      message: 'FOREIGN KEY constraint failed: unique parent',
    })).toBe(false)
    expect(isUniqueConstraintError({
      code: 'SQLITE_CONSTRAINT_NOTNULL',
      message: 'NOT NULL constraint failed: users.email is unique',
    })).toBe(false)
    expect(isUniqueConstraintError({ message: 'something unique happened' })).toBe(false)
    expect(isUniqueConstraintError(null)).toBe(false)
  })
})

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
      expect(user.session_version).toBe(0)
      const renamed = await updateUser(db, user.id, { email: '  Ada@example.com  ' })
      expect(renamed?.session_version).toBe(0)
      const rehashed = await updateUser(db, user.id, { password_hash: 'next' })
      expect(rehashed?.session_version).toBe(1)
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
    const dir = mkdtempSync(join(tmpdir(), 'katecms-'))
    tempDirs.push(dir)
    const file = join(dir, 'katecms.db')
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

  it('queries collections with filters, dictionaries, order and paging', async () => {
    const { db, close } = await memoryDb()
    try {
      const ada = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'hash',
      })
      const bob = await createUser(db, {
        email: 'bob@example.com',
        password_hash: 'hash',
      })
      const about = await createCollection(db, {
        type: 'page',
        slug: 'about',
        title: 'About',
        status: 'published',
        author_id: ada.id,
        menu_order: 2,
      })
      const team = await createCollection(db, {
        type: 'page',
        slug: 'team',
        title: 'Team',
        status: 'published',
        author_id: ada.id,
        parent_id: about.id,
        menu_order: 1,
      })
      const notes = await createCollection(db, {
        type: 'page',
        slug: 'notes',
        title: 'Notes',
        status: 'draft',
        author_id: bob.id,
      })
      const post = await createCollection(db, {
        type: 'post',
        slug: 'hello',
        title: 'Hello',
        status: 'published',
        author_id: bob.id,
      })
      const trashed = await createCollection(db, {
        type: 'page',
        slug: 'old',
        title: 'Old',
        status: 'draft',
        author_id: ada.id,
      })
      await updateCollection(db, trashed.id, { status: 'trash' })

      const news = await createDictionary(db, {
        type: 'category',
        slug: 'news',
        title: 'News',
      })
      const featured = await createDictionary(db, {
        type: 'category',
        slug: 'featured',
        title: 'Featured',
      })
      await linkCollectionDictionary(db, about.id, news.id)
      await linkCollectionDictionary(db, about.id, featured.id)
      await linkCollectionDictionary(db, team.id, news.id)
      await linkCollectionDictionary(db, post.id, featured.id)

      expect(await queryCollections(db, { types: [] })).toEqual([])
      expect(await countQueryCollections(db, { types: [] })).toBe(0)

      const mixed = await queryCollections(db, { types: ['page', 'post'] })
      expect(mixed.map(row => row.slug).sort()).toEqual(['about', 'hello', 'notes', 'team'])
      expect(await countQueryCollections(db, { types: ['page', 'post'] })).toBe(4)

      const published = await queryCollections(db, {
        types: ['page'],
        statuses: ['published'],
      })
      expect(published.map(row => row.slug).sort()).toEqual(['about', 'team'])

      const found = await queryCollections(db, { types: ['page'], search: 'ABOUT' })
      expect(found).toHaveLength(1)
      expect(found[0]?.slug).toBe('about')

      expect(await queryCollections(db, { types: ['page'], includeIds: [team.id] })).toMatchObject([{ slug: 'team' }])
      expect(await queryCollections(db, { types: ['page'], includeIds: [] })).toEqual([])
      expect(
        (await queryCollections(db, { types: ['page'], excludeIds: [about.id] })).map(row => row.slug).sort(),
      ).toEqual(['notes', 'team'])
      expect(await queryCollections(db, { types: ['page'], title: 'About' })).toMatchObject([{ slug: 'about' }])
      expect(await queryCollections(db, { types: ['page', 'post'], slugs: ['hello', 'missing'] })).toMatchObject([
        { slug: 'hello' },
      ])

      expect(await queryCollections(db, { types: ['page'], parentId: null })).toHaveLength(2)
      expect(await queryCollections(db, { types: ['page'], parentId: about.id })).toMatchObject([{ slug: 'team' }])
      expect(
        (await queryCollections(db, { types: ['page'], parentIds: [about.id] })).map(row => row.slug),
      ).toEqual(['team'])
      expect(
        (await queryCollections(db, { types: ['page'], excludeParentIds: [about.id] })).map(row => row.slug).sort(),
      ).toEqual(['about', 'notes'])
      expect(
        (await queryCollections(db, {
          types: ['page'],
          includeIds: [team.id, about.id],
          orderBy: 'includeIds',
        })).map(row => row.slug),
      ).toEqual(['team', 'about'])
      expect(
        (await queryCollections(db, {
          types: ['page'],
          includeIds: [about.id, team.id],
          orderBy: 'includeIds',
        })).map(row => row.slug),
      ).toEqual(['about', 'team'])
      expect(
        (await queryCollections(db, {
          types: ['page'],
          includeIds: [about.id, team.id],
          orderBy: 'includeIds',
          order: 'desc',
        })).map(row => row.slug),
      ).toEqual(['team', 'about'])
      expect(await queryCollections(db, { types: ['page'], authorIn: [bob.id] })).toMatchObject([{ slug: 'notes' }])
      expect(
        (await queryCollections(db, { types: ['page'], authorNotIn: [ada.id] })).map(row => row.slug),
      ).toEqual(['notes'])
      expect(await queryCollections(db, { types: ['page', 'post'], slug: ['hello', 'missing'] })).toMatchObject([
        { slug: 'hello' },
      ])

      const orTerms = await queryCollections(db, {
        types: ['page', 'post'],
        dictionaryQuery: {
          queries: [{
            dictionary: 'category',
            field: 'id',
            terms: [news.id, featured.id],
          }],
        },
      })
      expect(orTerms.map(row => row.slug).sort()).toEqual(['about', 'hello', 'team'])
      const andTerms = await queryCollections(db, {
        types: ['page', 'post'],
        dictionaryQuery: {
          queries: [{
            dictionary: 'category',
            terms: [news.id, featured.id],
            operator: 'AND',
          }],
        },
      })
      expect(andTerms.map(row => row.slug)).toEqual(['about'])

      expect(
        (await queryCollections(db, {
          types: ['page', 'post'],
          dictionaryQuery: {
            queries: [{ dictionary: 'category', field: 'slug', terms: 'featured' }],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['about', 'hello'])
      expect(
        (await queryCollections(db, {
          types: ['page', 'post'],
          dictionaryQuery: {
            queries: [{ dictionary: 'category', field: 'name', terms: 'News' }],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['about', 'team'])
      expect(
        (await queryCollections(db, {
          types: ['page', 'post'],
          dictionaryQuery: {
            queries: [{ dictionary: 'category', field: 'slug', terms: 'featured', operator: 'NOT IN' }],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['notes', 'team'])
      expect(
        (await queryCollections(db, {
          types: ['page', 'post'],
          dictionaryQuery: {
            queries: [{ dictionary: 'category', operator: 'EXISTS' }],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['about', 'hello', 'team'])
      expect(
        (await queryCollections(db, {
          types: ['page', 'post'],
          dictionaryQuery: {
            queries: [{ dictionary: 'category', operator: 'NOT EXISTS' }],
          },
        })).map(row => row.slug),
      ).toEqual(['notes'])
      expect(
        (await queryCollections(db, {
          types: ['page', 'post'],
          dictionaryQuery: {
            relation: 'AND',
            queries: [
              { dictionary: 'category', field: 'slug', terms: 'news' },
              { dictionary: 'category', field: 'slug', terms: 'featured' },
            ],
          },
        })).map(row => row.slug),
      ).toEqual(['about'])

      const local = await createDictionary(db, {
        type: 'category',
        slug: 'local',
        title: 'Local',
        parent_id: news.id,
      })
      await linkCollectionDictionary(db, notes.id, local.id)
      expect(
        (await queryCollections(db, {
          types: ['page', 'post'],
          dictionaryQuery: {
            queries: [{ dictionary: 'category', field: 'slug', terms: 'news' }],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['about', 'notes', 'team'])
      expect(
        (await queryCollections(db, {
          types: ['page', 'post'],
          dictionaryQuery: {
            queries: [{
              dictionary: 'category',
              field: 'slug',
              terms: 'news',
              includeChildren: false,
            }],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['about', 'team'])

      const ordered = await queryCollections(db, {
        types: ['page'],
        statuses: ['published'],
        orderBy: 'title',
        order: 'asc',
      })
      expect(ordered.map(row => row.slug)).toEqual(['about', 'team'])

      const page = await queryCollections(db, {
        types: ['page', 'post'],
        orderBy: 'slug',
        order: 'asc',
        limit: 2,
        offset: 1,
      })
      expect(page.map(row => row.slug)).toEqual(['hello', 'notes'])

      const jobs = await createCollection(db, {
        type: 'page',
        slug: 'jobs',
        title: 'Jobs',
        status: 'published',
        author_id: ada.id,
        parent_id: notes.id,
      })
      expect(
        (await queryCollections(db, {
          types: ['page'],
          parentIds: [about.id, notes.id],
          orderBy: 'slug',
          order: 'asc',
        })).map(row => row.slug),
      ).toEqual(['jobs', 'team'])
      expect(jobs.slug).toBe('jobs')
    }
    finally {
      await close()
    }
  })

  it('detects regexp field filters', () => {
    expect(fieldsQueryUsesRegexp(undefined)).toBe(false)
    expect(fieldsQueryUsesRegexp(parseFieldsQuery({
      queries: [{ key: 'color', value: 'red' }],
    }))).toBe(false)
    expect(fieldsQueryUsesRegexp(parseFieldsQuery({
      queries: [{ key: 'sku', compare: 'regexp', value: '^bar' }],
    }))).toBe(true)
    expect(fieldsQueryUsesRegexp({
      queries: [{ key: '^col', compareKey: 'not regexp', compare: 'EXISTS' }],
    })).toBe(true)
  })

  it('filters collections by fieldsQuery', async () => {
    const { db, close } = await memoryDb()
    try {
      const ada = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'hash',
      })
      await createCollection(db, {
        type: 'post',
        slug: 'red-cheap',
        title: 'Red cheap',
        status: 'published',
        author_id: ada.id,
        fields: { color: 'red', price: 10, sku: 'bar_is' },
      })
      await createCollection(db, {
        type: 'post',
        slug: 'blue-dear',
        title: 'Blue dear',
        status: 'published',
        author_id: ada.id,
        fields: { color: 'blue', price: 50, seo: { title: 'Hello' } },
      })
      await createCollection(db, {
        type: 'post',
        slug: 'no-color',
        title: 'No color',
        status: 'published',
        author_id: ada.id,
        fields: { price: 10 },
      })

      expect(parseFieldsQuery({
        queries: [{ key: 'color', value: 'red' }],
      })).toMatchObject({
        relation: 'AND',
        queries: [{
          key: 'color',
          compareKey: '=',
          compare: '=',
          type: 'TEXT',
          value: 'red',
        }],
      })

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: { queries: [{ key: 'color', value: 'red' }] },
        })).map(row => row.slug),
      ).toEqual(['red-cheap'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: { queries: [{ key: 'color', compare: 'EXISTS' }] },
        })).map(row => row.slug).sort(),
      ).toEqual(['blue-dear', 'red-cheap'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: {
            queries: [{ key: 'color', compare: 'NOT EXISTS' }],
          },
        })).map(row => row.slug),
      ).toEqual(['no-color'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: {
            queries: [{ key: 'price', compare: '>=', value: 50, type: 'NUMERIC' }],
          },
        })).map(row => row.slug),
      ).toEqual(['blue-dear'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: { queries: [{ key: 'seo.title', value: 'Hello' }] },
        })).map(row => row.slug),
      ).toEqual(['blue-dear'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: {
            relation: 'OR',
            queries: [
              { key: 'color', value: 'red' },
              { key: 'color', value: 'blue' },
            ],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['blue-dear', 'red-cheap'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: { queries: [{ key: 'sku', compare: 'REGEXP', value: '^bar' }] },
        })).map(row => row.slug),
      ).toEqual(['red-cheap'])

      const oversizedPattern = `^bar${'.{0}'.repeat(50)}`
      expect(oversizedPattern.length).toBeGreaterThan(200)
      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: { queries: [{ key: 'sku', compare: 'REGEXP', value: oversizedPattern }] },
        })).map(row => row.slug),
      ).toEqual([])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: { queries: [{ key: 'color', compare: 'LIKE', value: 'lu' }] },
        })).map(row => row.slug),
      ).toEqual(['blue-dear'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: {
            queries: [{ key: 'price', compare: 'BETWEEN', value: [5, 25], type: 'NUMERIC' }],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['no-color', 'red-cheap'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: {
            queries: [{ key: '^col', compareKey: 'REGEXP', compare: 'EXISTS' }],
          },
        })).map(row => row.slug).sort(),
      ).toEqual(['blue-dear', 'red-cheap'])

      expect(
        (await queryCollections(db, {
          types: ['post'],
          fieldsQuery: {
            queries: [{ key: ['color', 'sku'], value: 'red' }],
          },
        })).map(row => row.slug),
      ).toEqual(['red-cheap'])
    }
    finally {
      await close()
    }
  })

  it('lists dictionary terms with queryTerms', async () => {
    const { db, close } = await memoryDb()
    try {
      const ada = await createUser(db, {
        email: 'ada@example.com',
        password_hash: 'hash',
      })
      const page = await createCollection(db, {
        type: 'page',
        slug: 'about',
        title: 'About',
        status: 'published',
        author_id: ada.id,
      })
      const draft = await createCollection(db, {
        type: 'page',
        slug: 'draft',
        title: 'Draft',
        status: 'draft',
        author_id: ada.id,
      })
      const post = await createCollection(db, {
        type: 'post',
        slug: 'hello',
        title: 'Hello',
        status: 'published',
        author_id: ada.id,
      })
      const design = await createDictionary(db, {
        type: 'services',
        slug: 'design',
        title: 'Design',
      })
      const web = await createDictionary(db, {
        type: 'services',
        slug: 'web',
        title: 'Web',
        parent_id: design.id,
      })
      await createDictionary(db, {
        type: 'services',
        slug: 'blank',
        title: 'Blank',
        parent_id: design.id,
      })
      const unused = await createDictionary(db, {
        type: 'services',
        slug: 'unused',
        title: 'Unused',
      })
      const red = await createDictionary(db, {
        type: 'services',
        slug: 'red',
        title: 'Red',
        fields: { color: 'red', rank: 2 },
      })
      const news = await createDictionary(db, {
        type: 'categories',
        slug: 'news',
        title: 'News',
      })
      await linkCollectionDictionary(db, page.id, web.id)
      await linkCollectionDictionary(db, page.id, red.id)
      await linkCollectionDictionary(db, draft.id, unused.id)
      await linkCollectionDictionary(db, post.id, news.id)

      const listed = await queryTerms(db, { dictionaries: ['services'] })
      expect(listed.total).toBe(3)
      expect(listed.terms.map(term => term.slug)).toEqual(['design', 'red', 'web'])
      expect(listed.terms.map(term => term.count)).toEqual([0, 1, 1])
      expect(listed.terms.find(term => term.slug === 'web')?.slugPath).toBe('design/web')

      const padded = await queryTerms(db, {
        dictionaries: ['services'],
        padCounts: true,
        parentId: 0,
      })
      expect(padded.terms.map(term => [term.slug, term.count])).toEqual([
        ['design', 1],
        ['red', 1],
      ])

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          hideEmpty: false,
          childOf: design.id,
          orderBy: 'slug',
        })).terms.map(term => term.slug),
      ).toEqual(['blank', 'web'])

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          hideEmpty: false,
          childless: true,
          orderBy: 'slug',
        })).terms.map(term => term.slug),
      ).toEqual(['blank', 'red', 'unused', 'web'])

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          hideEmpty: false,
          excludeTreeIds: [design.id],
          orderBy: 'slug',
        })).terms.map(term => term.slug),
      ).toEqual(['red', 'unused'])

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          includeIds: [red.id, web.id],
          orderBy: 'includeIds',
        })).terms.map(term => term.slug),
      ).toEqual(['red', 'web'])

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          search: 'WEB',
        })).terms.map(term => term.slug),
      ).toEqual(['web'])

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          fieldsQuery: { queries: [{ key: 'color', value: 'red' }] },
        })).terms.map(term => term.slug),
      ).toEqual(['red'])

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          orderBy: 'field',
          orderByField: { key: 'rank', type: 'NUMERIC' },
          order: 'desc',
          hideEmpty: false,
        })).terms[0]?.slug,
      ).toBe('red')

      const ids = await queryTerms(db, {
        dictionaries: ['services'],
        return: 'ids',
        perPage: 1,
        offset: 1,
      })
      expect(ids.total).toBe(3)
      expect(ids.ids).toEqual([red.id])
      expect(ids.terms).toEqual([])

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          return: 'count',
          perPage: 1,
        })).total,
      ).toBe(3)

      expect(
        (await queryTerms(db, {
          dictionaries: ['services'],
          countTypes: ['post'],
        })).total,
      ).toBe(0)

      const parents = await queryTerms(db, {
        dictionaries: ['services'],
        return: 'idParent',
        includeIds: [web.id],
      })
      expect(parents.map).toEqual({ [String(web.id)]: design.id })
    }
    finally {
      await close()
    }
  })
})
