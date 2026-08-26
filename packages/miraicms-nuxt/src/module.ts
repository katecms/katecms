import { createRequire } from 'node:module'
import { dirname, isAbsolute, join } from 'node:path'
import {
  defineNuxtModule,
  createResolver,
  addServerPlugin,
} from '@nuxt/kit'
import type { DatabaseConfig, ResolvedDatabaseConfig } from '@miraicms/core'
import { resolveDatabaseConfig } from '@miraicms/core'

export type {
  DatabaseConfig,
  DatabaseDriver,
  ResolvedDatabaseConfig,
} from '@miraicms/core'

export interface ModuleOptions {
  /**
   * Database connection. Default is SQLite at `<rootDir>/data/miraicms.db`.
   *
   * `url` is overridable at runtime via `NUXT_MIRAICMS_DATABASE_URL`.
   * `DATABASE_URL` is read only when `driver` is `'postgres'`.
   *
   * @example
   * { driver: 'postgres', url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms' }
   */
  database?: DatabaseConfig
}

function resolveModuleSqliteFilename(rootDir: string, filename: string): string {
  const value = filename.trim()
  if (value === ':memory:' || isAbsolute(value) || value.startsWith('file:')) {
    return value
  }
  return join(rootDir, value)
}

const moduleRequire = createRequire(import.meta.url)

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miraicms-nuxt',
    configKey: 'miraicms',
  },
  defaults: {},
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const existing = nuxt.options.runtimeConfig.miraicms
    const existingDatabase = existing?.database
    const { database, warnings } = resolveDatabaseConfig({
      driver: options.database?.driver
        ?? (existingDatabase?.driver === 'postgres' || existingDatabase?.driver === 'sqlite'
          ? existingDatabase.driver
          : undefined),
      url: options.database?.url ?? existingDatabase?.url,
      sqliteFilename: options.database?.sqliteFilename ?? existingDatabase?.sqliteFilename,
    })

    for (const warning of warnings) {
      console.warn(`[MiraiCMS] ${warning}`)
    }

    nuxt.options.runtimeConfig.miraicms = {
      ...existing,
      database: {
        driver: database.driver,
        url: database.url,
        sqliteFilename: resolveModuleSqliteFilename(
          nuxt.options.rootDir,
          database.sqliteFilename,
        ),
      },
    }

    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.alias ||= {}
      nitroConfig.alias['@miraicms/core'] = join(
        dirname(moduleRequire.resolve('@miraicms/core/package.json')),
        'dist/index.mjs',
      )
      nitroConfig.externals ||= {}
      const extra = ['@miraicms/core', 'better-sqlite3', 'pg', 'sharp', 'kysely']
      const current = nitroConfig.externals.external
      nitroConfig.externals.external = [
        ...(Array.isArray(current) ? current : current ? [current] : []),
        ...extra,
      ]
    })

    addServerPlugin(resolver.resolve('./runtime/server/plugins/auto-migrate'))
  },
})

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    miraicms: {
      database: ResolvedDatabaseConfig
    }
  }
}
