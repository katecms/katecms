import { describe, expect, it } from 'vitest'
import { resolveDatabaseTarget } from '../src'

describe('resolveDatabaseTarget', () => {
  it('defaults to SQLite when driver and url are empty', () => {
    expect(resolveDatabaseTarget({
      sqliteFilename: '/data/miraicms.db',
    })).toEqual({
      driver: 'sqlite',
      filename: '/data/miraicms.db',
    })
  })

  it('selects Postgres when url is set and driver is omitted', () => {
    expect(resolveDatabaseTarget({
      url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
      sqliteFilename: '/data/miraicms.db',
    })).toEqual({
      driver: 'postgres',
      url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
    })
  })

  it('keeps SQLite when driver is sqlite even if url is set', () => {
    expect(resolveDatabaseTarget({
      driver: 'sqlite',
      url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
      sqliteFilename: '/data/miraicms.db',
    })).toEqual({
      driver: 'sqlite',
      filename: '/data/miraicms.db',
    })
  })

  it('uses a caller-merged url when driver is postgres', () => {
    expect(resolveDatabaseTarget({
      driver: 'postgres',
      url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
    })).toEqual({
      driver: 'postgres',
      url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
    })
  })

  it('ignores blank url and driver', () => {
    expect(resolveDatabaseTarget({
      driver: '  ',
      url: '  ',
      sqliteFilename: '  ./data/miraicms.db  ',
    })).toEqual({
      driver: 'sqlite',
      filename: './data/miraicms.db',
    })
  })

  it('throws when postgres is selected without a url', () => {
    expect(() => resolveDatabaseTarget({ driver: 'postgres' })).toThrow(
      '[MiraiCMS] Postgres is selected but no connection URL was provided.',
    )
  })

  it('throws when sqlite is selected without a filename', () => {
    expect(() => resolveDatabaseTarget({ driver: 'sqlite' })).toThrow(
      '[MiraiCMS] SQLite is selected but no filename was provided.',
    )
  })

  it('throws on an unknown driver', () => {
    expect(() => resolveDatabaseTarget({
      driver: 'mysql',
      sqliteFilename: '/data/miraicms.db',
    })).toThrow('[MiraiCMS] Unknown database driver "mysql". Use "postgres" or "sqlite".')
  })
})
