import { createReadStream, existsSync } from 'node:fs'
import { isAbsolute, join, resolve, sep } from 'node:path'
import {
  defineNuxtModule,
  createResolver,
  addServerPlugin,
  addServerHandler,
  addRouteMiddleware,
  addImports,
  extendPages,
} from '@nuxt/kit'
import type {
  KateCmsConfig,
  ResolvedKateCmsConfig,
} from '@katecms/core'
import {
  mergeKateCmsConfig,
  resolveKateCmsConfig,
} from '@katecms/core'
import { addAdminComponents } from './admin-components'
import { uploadResponseHeaders } from './runtime/server/utils/upload-headers'

function resolveModuleSqliteFilename(rootDir: string, filename: string): string {
  const value = filename.trim()
  if (value === ':memory:' || isAbsolute(value) || value.startsWith('file:')) {
    return value
  }
  return join(rootDir, value)
}

function toPublicNavIcon(icon: unknown): string {
  return typeof icon === 'string' ? icon.trim() : ''
}

function toPublicCollections(collections: ResolvedKateCmsConfig['collections']) {
  return Object.fromEntries(
    Object.entries(collections).map(([slug, def]) => [
      slug,
      {
        labels: {
          name: def.labels.name,
          singularName: def.labels.singularName ?? def.labels.name,
        },
        icon: toPublicNavIcon(def.icon),
        public: def.public !== false,
        has_archive: typeof def.has_archive === 'string' ? def.has_archive : def.has_archive === true,
      },
    ]),
  )
}

function toPublicDictionaries(dictionaries: ResolvedKateCmsConfig['dictionaries']) {
  return Object.fromEntries(
    Object.entries(dictionaries).map(([slug, def]) => [
      slug,
      {
        labels: {
          name: def.labels.name,
          singularName: def.labels.singularName ?? def.labels.name,
        },
        icon: toPublicNavIcon(def.icon),
      },
    ]),
  )
}

function toPublicOptions(options: ResolvedKateCmsConfig['options']) {
  return Object.fromEntries(
    Object.entries(options).map(([slug, def]) => [
      slug,
      {
        label: def.label,
        icon: toPublicNavIcon(def.icon),
      },
    ]),
  )
}

export default defineNuxtModule<KateCmsConfig>({
  meta: {
    name: 'katecms',
    configKey: 'katecms',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const existing = nuxt.options.runtimeConfig.katecms
    const existingDatabase = existing?.database
    const config = mergeKateCmsConfig({
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
    const resolved = resolveKateCmsConfig(config)

    for (const warning of resolved.warnings) {
      console.warn(`[KateCMS] ${warning}`)
    }

    nuxt.options.runtimeConfig.katecms = {
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
    nuxt.options.runtimeConfig.public.katecms = {
      ...nuxt.options.runtimeConfig.public.katecms,
      adminPath: resolved.adminPath,
      loginPath: resolved.loginPath,
      registerPath: resolved.registerPath,
      registration: resolved.registration,
      collections: toPublicCollections(resolved.collections),
      dictionaries: toPublicDictionaries(resolved.dictionaries),
      options: toPublicOptions(resolved.options),
      form: {
        breakpoints: resolved.form.breakpoints,
      },
    }

    addServerPlugin(resolver.resolve('./runtime/server/plugins/auto-migrate'))
    addServerHandler({
      middleware: true,
      handler: resolver.resolve('./runtime/server/middleware/admin-headers'),
    })

    const uploadsDir = join(nuxt.options.rootDir, 'public', 'uploads')
    nuxt.hook('nitro:config', (config) => {
      // PublicAssetDir has no ignore. From the server dir this becomes !uploads/** while copying public/.
      config.ignore = [...new Set([...(config.ignore ?? []), '../public/uploads/**'])]
    })
    nuxt.hook('vite:serverCreated', (server) => {
      const root = resolve(uploadsDir)
      server.middlewares.stack.unshift({
        route: '',
        handle(req: { url?: string }, res: { statusCode: number, setHeader: (name: string, value: string) => void, end: () => void }, next: () => void) {
          const raw = (req.url || '').split('?')[0] || ''
          if (!raw.startsWith('/uploads/')) {
            next()
            return
          }
          let key = ''
          try {
            key = decodeURIComponent(raw.slice('/uploads/'.length))
          }
          catch {
            res.statusCode = 404
            res.end()
            return
          }
          if (!key || key.split(/[/\\]/).some(part => part === '..' || part === '')) {
            res.statusCode = 404
            res.end()
            return
          }
          const file = resolve(root, key)
          const inside = file === root || file.startsWith(root + sep)
          if (!inside || !existsSync(file)) {
            next()
            return
          }
          for (const [name, value] of Object.entries(uploadResponseHeaders(key))) {
            res.setHeader(name, value)
          }
          createReadStream(file).pipe(res as unknown as NodeJS.WritableStream)
        },
      })
    })

    addServerHandler({
      route: '/api/_katecms/oembed',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/oembed.get'),
    })

    addServerHandler({
      route: '/api/_katecms/media',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/media/index.get'),
    })
    addServerHandler({
      route: '/api/_katecms/media',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/media/index.post'),
    })
    addServerHandler({
      route: '/api/_katecms/media/:id',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/media/[id].get'),
    })
    addServerHandler({
      route: '/api/_katecms/media/:id',
      method: 'patch',
      handler: resolver.resolve('./runtime/server/api/_katecms/media/[id].patch'),
    })
    addServerHandler({
      route: '/api/_katecms/media/:id',
      method: 'delete',
      handler: resolver.resolve('./runtime/server/api/_katecms/media/[id].delete'),
    })
    addServerHandler({
      route: '/api/_katecms/media/:id/regenerate',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/media/[id]/regenerate.post'),
    })
    addServerHandler({
      route: '/api/_katecms/media/regenerate',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/media/regenerate.post'),
    })
    addServerHandler({
      route: '/uploads/**',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/uploads/[...key].get'),
    })

    addServerHandler({
      route: '/api/_katecms/auth/state',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/auth/state.get'),
    })
    addServerHandler({
      route: '/api/_katecms/menu',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/menu.get'),
    })
    addServerHandler({
      route: '/api/_katecms/auth/login',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/auth/login.post'),
    })
    addServerHandler({
      route: '/api/_katecms/auth/register',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/auth/register.post'),
    })
    addServerHandler({
      route: '/api/_katecms/auth/logout',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/auth/logout.post'),
    })
    addServerHandler({
      route: '/api/_katecms/users',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/users.get'),
    })
    addServerHandler({
      route: '/api/_katecms/users',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/users.post'),
    })
    addServerHandler({
      route: '/api/_katecms/users/:id',
      method: 'patch',
      handler: resolver.resolve('./runtime/server/api/_katecms/users/[id].patch'),
    })
    addServerHandler({
      route: '/api/_katecms/users/:id',
      method: 'delete',
      handler: resolver.resolve('./runtime/server/api/_katecms/users/[id].delete'),
    })

    addServerHandler({
      route: '/api/_katecms/collections/:collection',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/collections/[collection].get'),
    })
    addServerHandler({
      route: '/api/_katecms/collections/:collection',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/collections/[collection].post'),
    })
    addServerHandler({
      route: '/api/_katecms/collections/:collection/:id/revisions',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/collections/[collection]/revisions.get'),
    })
    addServerHandler({
      route: '/api/_katecms/collections/:collection/:id/revisions/:revisionId',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/collections/[collection]/revisions/[revisionId].post'),
    })
    addServerHandler({
      route: '/api/_katecms/collections/:collection/:id',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/collections/[collection]/[id].get'),
    })
    addServerHandler({
      route: '/api/_katecms/collections/:collection/:id',
      method: 'patch',
      handler: resolver.resolve('./runtime/server/api/_katecms/collections/[collection]/[id].patch'),
    })
    addServerHandler({
      route: '/api/_katecms/collections/:collection/:id',
      method: 'delete',
      handler: resolver.resolve('./runtime/server/api/_katecms/collections/[collection]/[id].delete'),
    })
    addServerHandler({
      route: '/api/_katecms/dictionaries/:dictionary',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/dictionaries/[dictionary].get'),
    })
    addServerHandler({
      route: '/api/_katecms/dictionaries/:dictionary',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/_katecms/dictionaries/[dictionary].post'),
    })
    addServerHandler({
      route: '/api/_katecms/dictionaries/:dictionary/:id',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/dictionaries/[dictionary]/[id].get'),
    })
    addServerHandler({
      route: '/api/_katecms/dictionaries/:dictionary/:id',
      method: 'patch',
      handler: resolver.resolve('./runtime/server/api/_katecms/dictionaries/[dictionary]/[id].patch'),
    })
    addServerHandler({
      route: '/api/_katecms/dictionaries/:dictionary/:id',
      method: 'delete',
      handler: resolver.resolve('./runtime/server/api/_katecms/dictionaries/[dictionary]/[id].delete'),
    })
    addServerHandler({
      route: '/api/_katecms/options/:page',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/options/[page].get'),
    })
    addServerHandler({
      route: '/api/_katecms/options/:page',
      method: 'patch',
      handler: resolver.resolve('./runtime/server/api/_katecms/options/[page].patch'),
    })
    addServerHandler({
      route: '/api/_katecms/relation/entries',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/relation/entries.get'),
    })
    addServerHandler({
      route: '/api/_katecms/relation/terms',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/relation/terms.get'),
    })

    addServerHandler({
      route: '/api/_katecms/resolve',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/resolve.get'),
    })
    addServerHandler({
      route: '/api/_katecms/query',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/query.get'),
    })
    addServerHandler({
      route: '/api/_katecms/terms',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/_katecms/terms.get'),
    })

    addRouteMiddleware({
      name: 'katecms-auth-guard',
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
      {
        name: 'getCollection',
        from: resolver.resolve('./runtime/composables/getCollection'),
      },
      {
        name: 'getQueryCollection',
        from: resolver.resolve('./runtime/composables/getQueryCollection'),
      },
      {
        name: 'getTerms',
        from: resolver.resolve('./runtime/composables/getTerms'),
      },
      {
        name: 'getOptions',
        from: resolver.resolve('./runtime/composables/getOptions'),
      },
      {
        name: 'useKateCmsEntrySidebar',
        from: resolver.resolve('./runtime/composables/useKateCmsExtensions'),
      },
      {
        name: 'registerKateCmsEntrySidebarTab',
        from: resolver.resolve('./runtime/composables/useKateCmsExtensions'),
      },
      {
        name: 'useKateCmsTermPanels',
        from: resolver.resolve('./runtime/composables/useKateCmsExtensions'),
      },
      {
        name: 'useKateCmsMenuItems',
        from: resolver.resolve('./runtime/composables/useKateCmsExtensions'),
      },
    ])

    addAdminComponents({
      path: resolver.resolve('./runtime/internal'),
      prefix: 'KateCms',
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
            {
              name: 'admin-login',
              path: resolved.loginPath.replace(/^\/+|\/+$/g, ''),
              file: resolver.resolve('./runtime/pages/admin/login.vue'),
            },
            {
              name: 'admin-register',
              path: resolved.registerPath.replace(/^\/+|\/+$/g, ''),
              file: resolver.resolve('./runtime/pages/admin/register.vue'),
            },
            {
              name: 'admin-media',
              path: 'media',
              file: resolver.resolve('./runtime/pages/admin/media.vue'),
            },
            {
              name: 'admin-users',
              path: 'users',
              file: resolver.resolve('./runtime/pages/admin/users/index.vue'),
            },
            {
              name: 'admin-users-create',
              path: 'users/create',
              file: resolver.resolve('./runtime/pages/admin/users/create.vue'),
            },
            {
              name: 'admin-users-id',
              path: 'users/:id',
              file: resolver.resolve('./runtime/pages/admin/users/[id].vue'),
            },
            {
              name: 'admin-collections',
              path: 'collections/:collection',
              file: resolver.resolve('./runtime/pages/admin/collections/index.vue'),
            },
            {
              name: 'admin-collections-create',
              path: 'collections/:collection/create',
              file: resolver.resolve('./runtime/pages/admin/collections/create.vue'),
            },
            {
              name: 'admin-collections-id',
              path: 'collections/:collection/:id',
              file: resolver.resolve('./runtime/pages/admin/collections/[id].vue'),
            },
            {
              name: 'admin-dictionaries',
              path: 'dictionaries/:dictionary',
              file: resolver.resolve('./runtime/pages/admin/dictionaries/index.vue'),
            },
            {
              name: 'admin-dictionaries-id',
              path: 'dictionaries/:dictionary/:id',
              file: resolver.resolve('./runtime/pages/admin/dictionaries/[id].vue'),
            },
            {
              name: 'admin-options',
              path: 'options/:page',
              file: resolver.resolve('./runtime/pages/admin/options/[page].vue'),
            },
            // DEMO FIELDS
            {
              name: 'admin-demo-fields',
              path: 'demo-fields',
              file: resolver.resolve('./runtime/pages/admin/demo-fields.vue'),
            },
          ],
        },
      )
    })
  },
})

declare module '@nuxt/schema' {
  interface NuxtConfig {
    katecms?: KateCmsConfig
  }
  interface RuntimeConfig {
    katecms: ResolvedKateCmsConfig
  }
  interface PublicRuntimeConfig {
    katecms: {
      adminPath: string
      loginPath: string
      registerPath: string
      registration: boolean
      collections: Record<string, {
        labels: { name: string, singularName: string }
        icon: string
        public: boolean
        has_archive: boolean | string
      }>
      dictionaries: Record<string, {
        labels: { name: string, singularName: string }
        icon: string
      }>
      options: Record<string, {
        label: string
        icon: string
      }>
      form: {
        breakpoints: Array<{
          name: string
          label: string
          maxWidth: number | null
        }>
      }
    }
  }
}

declare module 'nuxt/schema' {
  interface NuxtConfig {
    katecms?: KateCmsConfig
  }
  interface RuntimeConfig {
    katecms: ResolvedKateCmsConfig
  }
  interface PublicRuntimeConfig {
    katecms: {
      adminPath: string
      loginPath: string
      registerPath: string
      registration: boolean
      collections: Record<string, {
        labels: { name: string, singularName: string }
        icon: string
        public: boolean
        has_archive: boolean | string
      }>
      dictionaries: Record<string, {
        labels: { name: string, singularName: string }
        icon: string
      }>
      options: Record<string, {
        label: string
        icon: string
      }>
      form: {
        breakpoints: Array<{
          name: string
          label: string
          maxWidth: number | null
        }>
      }
    }
  }
}
