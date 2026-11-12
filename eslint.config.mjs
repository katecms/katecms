// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    tooling: true,
    stylistic: true,
  },
  dirs: {
    src: [
      './playground',
      './packages/miraicms-nuxt',
      './packages/core',
    ],
  },
})
  .append({
    rules: {
      'vue/no-v-html': 'off',
    },
  })
  .append({
    files: [
      'packages/miraicms-nuxt/src/runtime/pages/**/*.vue',
      'playground/pages/**/*.vue',
    ],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  })
