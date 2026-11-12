import {
  addImports,
  addPlugin,
  addServerHandler,
  addServerPlugin,
  createResolver,
  defineNuxtModule,
  extendPages,
} from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'katecms-seo',
    configKey: 'katecmsSeo',
  },
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const adminPath = String(nuxt.options.runtimeConfig.katecms?.adminPath || 'admin')
      .replace(/^\/+|\/+$/g, '') || 'admin'

    addPlugin(resolver.resolve('./runtime/plugin'))
    addServerPlugin(resolver.resolve('./runtime/server/plugins/migrate'))
    addImports([
      {
        name: 'useMiraiSeoHead',
        from: resolver.resolve('./runtime/composables/useMiraiSeoHead'),
      },
    ])
    addServerHandler({
      middleware: true,
      handler: resolver.resolve('./runtime/server/middleware/redirect'),
    })

    addServerHandler({
      route: '/api/_katecms/seo/site',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/site.get'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/site',
      method: 'put',
      handler: resolver.resolve('./runtime/server/api/site.put'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/entries/:id',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/entries/[id].get'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/entries/:id',
      method: 'put',
      handler: resolver.resolve('./runtime/server/api/entries/[id].put'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/head',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/head.get'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/redirect',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/redirect.get'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/redirects',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/redirects.get'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/redirects',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/redirects.post'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/redirects',
      method: 'patch',
      handler: resolver.resolve('./runtime/server/api/redirects.patch'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/redirects',
      method: 'delete',
      handler: resolver.resolve('./runtime/server/api/redirects.delete'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/terms/:id',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/terms/[id].get'),
    })
    addServerHandler({
      route: '/api/_katecms/seo/terms/:id',
      method: 'put',
      handler: resolver.resolve('./runtime/server/api/terms/[id].put'),
    })
    addServerHandler({
      route: '/sitemap.xml',
      method: 'get',
      handler: resolver.resolve('./runtime/server/routes/sitemap.get'),
    })
    addServerHandler({
      route: '/robots.txt',
      method: 'get',
      handler: resolver.resolve('./runtime/server/routes/robots.get'),
    })

    extendPages((pages) => {
      const admin = pages.find(page => page.name === 'admin' || page.path === `/${adminPath}`)
      admin?.children?.push({
        name: 'admin-seo',
        path: 'seo',
        file: resolver.resolve('./runtime/pages/admin/seo.vue'),
      })
    })
  },
})
