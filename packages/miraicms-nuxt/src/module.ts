import { isAbsolute, join } from 'node:path'
import {
  defineNuxtModule,
  createResolver,
  addServerPlugin,
  addServerHandler,
  addRouteMiddleware,
  addImports,
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
      media: {
        ...resolved.media,
        dir: join(nuxt.options.rootDir, 'public', 'uploads'),
      },
    }

    nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {}
    nuxt.options.runtimeConfig.public.miraicms = {
      ...nuxt.options.runtimeConfig.public.miraicms,
      adminPath: resolved.adminPath,
      loginPath: resolved.loginPath,
      registerPath: resolved.registerPath,
    }

    addServerPlugin(resolver.resolve('./runtime/server/plugins/auto-migrate'))

    addServerHandler({
      route: '/api/_miraicms/oembed',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_miraicms/oembed.get'),
    })

    addServerHandler({
      route: '/api/_miraicms/media',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_miraicms/media/index.get'),
    })
    addServerHandler({
      route: '/api/_miraicms/media',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_miraicms/media/index.post'),
    })
    addServerHandler({
      route: '/api/_miraicms/media/:id',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_miraicms/media/[id].get'),
    })
    addServerHandler({
      route: '/uploads/**',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/uploads/[...key].get'),
    })

    addServerHandler({
      route: '/api/_miraicms/auth/state',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_miraicms/auth/state.get'),
    })
    addServerHandler({
      route: '/api/_miraicms/auth/login',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_miraicms/auth/login.post'),
    })
    addServerHandler({
      route: '/api/_miraicms/auth/register',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_miraicms/auth/register.post'),
    })
    addServerHandler({
      route: '/api/_miraicms/auth/logout',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_miraicms/auth/logout.post'),
    })

    addRouteMiddleware({
      name: 'miraicms-auth-guard',
      path: resolver.resolve('./runtime/middleware/auth-guard'),
      global: true,
    })

    addImports([
      {
        name: 'useAuth',
        from: resolver.resolve('./runtime/composables/useAuth'),
      },
      {
        name: 'useCmsPaths',
        from: resolver.resolve('./runtime/composables/useCmsPaths'),
      },
    ])

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
          path: `/${resolved.adminPath}`,
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
        {
          name: 'login',
          path: `/${resolved.loginPath}`,
          file: resolver.resolve('./runtime/pages/login.vue'),
          meta: {
            layout: false,
          },
        },
        {
          name: 'register',
          path: `/${resolved.registerPath}`,
          file: resolver.resolve('./runtime/pages/register.vue'),
          meta: {
            layout: false,
          },
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
  interface PublicRuntimeConfig {
    miraicms: {
      adminPath: string
      loginPath: string
      registerPath: string
    }
  }
}

declare module 'nuxt/schema' {
  interface NuxtConfig {
    miraicms?: MiraiCmsConfig
  }
  interface RuntimeConfig {
    miraicms: ResolvedMiraiCmsConfig
  }
  interface PublicRuntimeConfig {
    miraicms: {
      adminPath: string
      loginPath: string
      registerPath: string
    }
  }
}
