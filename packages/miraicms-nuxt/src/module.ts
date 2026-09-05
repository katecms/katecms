import { isAbsolute, join } from 'node:path'
import {
  defineNuxtModule,
  createResolver,
  addServerPlugin,
  extendPages,
  addComponentsDir,
} from '@nuxt/kit'
import type {
  MiraiCmsConfig,
  ResolvedMiraiCmsConfig,
} from '@miraicms/core'
import {
  mergeMiraiCmsConfig,
  resolveMiraiCmsConfig,
} from '@miraicms/core'

function resolveModuleSqliteFilename(rootDir: string, filename: string): string {
  const value = filename.trim()
  if (value === ':memory:' || isAbsolute(value) || value.startsWith('file:')) {
    return value
  }
  return join(rootDir, value)
}

export default defineNuxtModule<MiraiCmsConfig>({
  meta: {
    name: 'miraicms-nuxt',
    configKey: 'miraicms',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const existing = nuxt.options.runtimeConfig.miraicms
    const existingDatabase = existing?.database
    const config = mergeMiraiCmsConfig({
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
    const resolved = resolveMiraiCmsConfig(config)

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

    addServerPlugin(resolver.resolve('./runtime/server/plugins/auto-migrate'))

    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      prefix: 'MiraiCms',
      pathPrefix: false,
    })

    // Pages
    extendPages((pages) => {
      pages.push(
        {
          name: 'admin',
          path: `/${config.adminPath}`,
          file: resolver.resolve('./runtime/pages/index.vue'),
          meta: {
            layout: false,
          },
          children: [
            {
              name: 'admin-index',
              path: '',
              file: resolver.resolve('./runtime/pages/admin/index.vue'),
            },
            // {
            //   name: 'admin-media',
            //   path: 'media',
            //   file: resolver.resolve('./runtime/pages/admin/media.vue'),
            // },
            // // Users
            // {
            //   name: 'admin-users',
            //   path: 'users',
            //   file: resolver.resolve('./runtime/pages/admin/users/index.vue'),
            // },
            // {
            //   name: 'admin-users-create',
            //   path: 'users/create',
            //   file: resolver.resolve('./runtime/pages/admin/users/create.vue'),
            // },
            // {
            //   name: 'admin-users-id',
            //   path: 'users/:id',
            //   file: resolver.resolve('./runtime/pages/admin/users/[id].vue'),
            // },
            // // Collections (slug from nuxtcms.config.ts)
            // {
            //   name: 'admin-collections',
            //   path: 'collections/:collection',
            //   file: resolver.resolve('./runtime/pages/admin/collections/index.vue'),
            // },
            // {
            //   name: 'admin-collections-create',
            //   path: 'collections/:collection/create',
            //   file: resolver.resolve('./runtime/pages/admin/collections/create.vue'),
            // },
            // {
            //   name: 'admin-collections-id',
            //   path: 'collections/:collection/:id',
            //   file: resolver.resolve('./runtime/pages/admin/collections/[id].vue'),
            // },
            // {
            //   name: 'admin-taxonomy',
            //   path: 'taxonomies/:taxonomy',
            //   file: resolver.resolve('./runtime/pages/admin/[taxonomy].vue'),
            // },
          ],
        },
      )
    })
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
