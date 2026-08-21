import { join } from 'node:path'
import {
  defineNuxtModule,
  createResolver,
  addServerPlugin,
} from '@nuxt/kit'

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miraicms',
    configKey: 'miraicms',
  },
  defaults: {},
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.miraicmsSqliteFilename = join(
      nuxt.options.rootDir,
      'data',
      'miraicms.db',
    )

    addServerPlugin(resolver.resolve('./runtime/server/plugins/auto-migrate'))
  },
})
