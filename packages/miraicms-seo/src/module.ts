import {
  addComponentsDir,
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
    name: 'miraicms-seo',
    configKey: 'miraicmsSeo',
  },
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const adminPath = String(nuxt.options.runtimeConfig.miraicms?.adminPath || 'admin')
      .replace(/^\/+|\/+$/g, '') || 'admin'

    addPlugin(resolver.resolve('./runtime/plugin'))
    addServerPlugin(resolver.resolve('./runtime/server/plugins/migrate'))
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      prefix: 'Mirai',
      pathPrefix: false,
    })
    addImports([
      {
        name: 'useMiraiSeoHead',
        from: resolver.resolve('./runtime/composables/useMiraiSeoHead'),
      },
    ])

    addServerHandler({
      route: '/api/_miraicms/seo/site',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/site.get'),
    })
    addServerHandler({
      route: '/api/_miraicms/seo/site',
      method: 'put',
      handler: resolver.resolve('./runtime/server/api/site.put'),
    })
    addServerHandler({
      route: '/api/_miraicms/seo/entries/:id',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/entries/[id].get'),
    })
    addServerHandler({
      route: '/api/_miraicms/seo/entries/:id',
      method: 'put',
      handler: resolver.resolve('./runtime/server/api/entries/[id].put'),
    })
    addServerHandler({
      route: '/api/_miraicms/seo/head',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/head.get'),
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
