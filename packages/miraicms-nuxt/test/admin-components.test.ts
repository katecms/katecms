import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  isAdminConsumerId,
  loadAdminComponents,
  rewriteAdminComponents,
} from '../src/admin-components'

const internalDir = fileURLToPath(new URL('../src/runtime/internal', import.meta.url))

describe('admin component resolution', () => {
  it('keeps admin tags inside the cms packages', () => {
    expect(isAdminConsumerId('E:/miraicms/packages/miraicms-nuxt/src/runtime/pages/admin/register.vue')).toBe(true)
    expect(isAdminConsumerId('E:/miraicms/packages/miraicms-nuxt-form/src/runtime/builder/FormBuilder.vue?vue&type=script')).toBe(true)
    expect(isAdminConsumerId('E:/miraicms/packages/miraicms-nuxt-seo/dist/runtime/pages/admin/seo.vue')).toBe(true)
    expect(isAdminConsumerId('E:/app/node_modules/miraicms-nuxt/dist/runtime/internal/fields/TextField.vue')).toBe(true)
    expect(isAdminConsumerId('E:/miraicms/playground-nuxt/pages/index.vue')).toBe(false)
    expect(isAdminConsumerId('E:/miraicms/packages/miraicms-nuxt/src/module.ts')).toBe(false)
  })

  it('maps each widget file to one MiraiCms tag', () => {
    const components = loadAdminComponents(internalDir, 'MiraiCms')
    expect(components.get('MiraiCmsTextField')).toMatch(/fields[/\\]TextField\.vue$/)
    expect(components.get('MiraiCmsFieldWrapper')).toMatch(/parts[/\\]FieldWrapper\.vue$/)
    expect(components.get('MiraiCmsUiButton')).toMatch(/ui[/\\]UiButton\.vue$/)
    expect(components.has('MiraiCmsForm')).toBe(false)
  })

  it('rewrites compiled component calls to direct imports', () => {
    const file = resolve(internalDir, 'fields/TextField.vue')
    const components = new Map([
      ['MiraiCmsTextField', file],
      ['MiraiCmsFieldWrapper', resolve(internalDir, 'parts/FieldWrapper.vue')],
    ])
    const code = [
      'import { resolveComponent as _resolveComponent } from "vue"',
      'const _component_MiraiCmsFieldWrapper = _resolveComponent("MiraiCmsFieldWrapper")',
      'const _component_MiraiCmsTextField = _resolveComponent("MiraiCmsTextField")',
    ].join('\n')
    const rewritten = rewriteAdminComponents(code, components, file, 'MiraiCms')
    expect(rewritten?.code).toContain('import __mirai_MiraiCmsFieldWrapper from')
    expect(rewritten?.code).toContain('FieldWrapper.vue')
    expect(rewritten?.code).not.toContain('_resolveComponent("MiraiCmsFieldWrapper")')
    expect(rewritten?.code).toContain('_resolveComponent("MiraiCmsTextField")')
  })

  it('leaves host-only names untouched', () => {
    const components = new Map([['MiraiCmsTextField', resolve(internalDir, 'fields/TextField.vue')]])
    const code = 'const field = _resolveComponent("MiraiCmsForm")'
    expect(rewriteAdminComponents(code, components, 'E:/app/pages/index.vue', 'MiraiCms')).toBeNull()
  })
})
