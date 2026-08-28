import { createRequire } from 'node:module'
import { dirname, isAbsolute, join } from 'node:path'
import {
  defineNuxtModule,
  createResolver,
  addServerPlugin,
} from '@nuxt/kit'
import type {
  MiraiCmsConfig,
  ResolvedMiraiCmsConfig,
} from '@miraicms/core'
import { resolveMiraiCmsConfig } from '@miraicms/core'

function resolveModuleSqliteFilename(rootDir: string, filename: string): string {
  const value = filename.trim()
  if (value === ':memory:' || isAbsolute(value) || value.startsWith('file:')) {
    return value
  }
  return join(rootDir, value)
}

const moduleRequire = createRequire(import.meta.url)

export default defineNuxtModule<MiraiCmsConfig>({
  meta: {
    name: 'miraicms-nuxt',
    configKey: 'miraicms',
  },
  defaults: {},
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const existing = nuxt.options.runtimeConfig.miraicms
    const existingDatabase = existing?.database
    const resolved = resolveMiraiCmsConfig({
      ...options,
      database: {
        driver: options.database?.driver
          ?? (existingDatabase?.driver === 'postgres' || existingDatabase?.driver === 'sqlite'
            ? existingDatabase.driver
            : undefined),
        url: options.database?.url ?? existingDatabase?.url,
        sqliteFilename: options.database?.sqliteFilename ?? existingDatabase?.sqliteFilename,
      },
    })

    for (const warning of resolved.warnings) {
      console.warn(`[MiraiCMS] ${warning}`)
    }

    nuxt.options.runtimeConfig.miraicms = {
      ...existing,
      ...resolved,
      database: {
        ...resolved.database,
        sqliteFilename: resolveModuleSqliteFilename(
          nuxt.options.rootDir,
          resolved.database.sqliteFilename,
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

declare module '@nuxt/schema' {
  interface NuxtConfig {
    miraicms?: MiraiCmsConfig
  }
  interface RuntimeConfig {
    miraicms: ResolvedMiraiCmsConfig
  }
}

declare module 'nuxt/schema' {
  interface NuxtConfig {
    miraicms?: MiraiCmsConfig
  }
  interface RuntimeConfig {
    miraicms: ResolvedMiraiCmsConfig
  }
}
