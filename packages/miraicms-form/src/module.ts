import {
  addComponentsDir,
  addPlugin,
  addServerHandler,
  addServerPlugin,
  createResolver,
  defineNuxtModule,
  extendPages,
} from '@nuxt/kit'

export interface ModuleOptions {
  /** Absolute directory for files submitted through forms. */
  uploadDir?: string
  /** Largest accepted upload, in bytes. */
  maxFileBytes?: number
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miraicms-form',
    configKey: 'miraicmsForm',
  },
  defaults: {
    uploadDir: '',
    maxFileBytes: 10 * 1024 * 1024,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const adminPath = String(nuxt.options.runtimeConfig.miraicms?.adminPath || 'admin')
      .replace(/^\/+|\/+$/g, '') || 'admin'

    nuxt.options.runtimeConfig.miraicmsForm = {
      uploadDir: options.uploadDir?.trim() || '',
      maxFileBytes: options.maxFileBytes && options.maxFileBytes > 0
        ? options.maxFileBytes
        : 10 * 1024 * 1024,
    }

    addPlugin(resolver.resolve('./runtime/plugin'))
    addServerPlugin(resolver.resolve('./runtime/server/plugins/migrate'))
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      prefix: 'Mirai',
      pathPrefix: false,
    })

    addServerHandler({
      route: '/api/_miraicms/forms',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/forms.get'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/forms.post'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms/item/:id',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/item/[id].get'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms/item/:id',
      method: 'put',
      handler: resolver.resolve('./runtime/server/api/item/[id].put'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms/item/:id',
      method: 'delete',
      handler: resolver.resolve('./runtime/server/api/item/[id].delete'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms/view/:slug',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/view/[slug].get'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms/submit/:slug',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/submit/[slug].post'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms/mail',
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/mail.get'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms/mail',
      method: 'put',
      handler: resolver.resolve('./runtime/server/api/mail.put'),
    })
    addServerHandler({
      route: '/api/_miraicms/forms/mail/test',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/mail/test.post'),
    })

    extendPages((pages) => {
      const admin = pages.find(page => page.name === 'admin' || page.path === `/${adminPath}`)
      admin?.children?.push(
        {
          name: 'admin-forms',
          path: 'forms',
          file: resolver.resolve('./runtime/pages/admin/forms/index.vue'),
        },
        {
          name: 'admin-forms-mail',
          path: 'forms/mail',
          file: resolver.resolve('./runtime/pages/admin/forms/mail.vue'),
        },
        {
          name: 'admin-forms-id',
          path: 'forms/:id(\\d+)',
          file: resolver.resolve('./runtime/pages/admin/forms/[id].vue'),
        },
      )
    })
  },
})
