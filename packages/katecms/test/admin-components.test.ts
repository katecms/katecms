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
    expect(isAdminConsumerId('E:/katecms/packages/katecms/src/runtime/pages/admin/register.vue')).toBe(true)
    expect(isAdminConsumerId('E:/katecms/packages/katecms-form-builder/src/runtime/builder/FormBuilder.vue?vue&type=script')).toBe(true)
    expect(isAdminConsumerId('E:/katecms/packages/katecms-seo/dist/runtime/pages/admin/seo.vue')).toBe(true)
    expect(isAdminConsumerId('E:/app/node_modules/katecms/dist/runtime/internal/fields/TextField.vue')).toBe(true)
    expect(isAdminConsumerId('E:/katecms/playground/pages/index.vue')).toBe(false)
    expect(isAdminConsumerId('E:/katecms/packages/katecms/src/module.ts')).toBe(false)
  })

  it('maps each widget file to one KateCms tag', () => {
    const components = loadAdminComponents(internalDir, 'KateCms')
    expect(components.get('KateCmsTextField')).toMatch(/fields[/\\]TextField\.vue$/)
    expect(components.get('KateCmsFieldWrapper')).toMatch(/parts[/\\]FieldWrapper\.vue$/)
    expect(components.get('KateCmsUiButton')).toMatch(/ui[/\\]UiButton\.vue$/)
    expect(components.has('KateCmsForm')).toBe(false)
  })

  it('rewrites compiled component calls to direct imports', () => {
    const file = resolve(internalDir, 'fields/TextField.vue')
    const components = new Map([
      ['KateCmsTextField', file],
      ['KateCmsFieldWrapper', resolve(internalDir, 'parts/FieldWrapper.vue')],
    ])
    const code = [
      'import { resolveComponent as _resolveComponent } from "vue"',
      'const _component_KateCmsFieldWrapper = _resolveComponent("KateCmsFieldWrapper")',
      'const _component_KateCmsTextField = _resolveComponent("KateCmsTextField")',
    ].join('\n')
    const rewritten = rewriteAdminComponents(code, components, file, 'KateCms')
    expect(rewritten?.code).toContain('import __mirai_KateCmsFieldWrapper from')
    expect(rewritten?.code).toContain('FieldWrapper.vue')
    expect(rewritten?.code).not.toContain('_resolveComponent("KateCmsFieldWrapper")')
    expect(rewritten?.code).toContain('_resolveComponent("KateCmsTextField")')
  })

  it('leaves host-only names untouched', () => {
    const components = new Map([['KateCmsTextField', resolve(internalDir, 'fields/TextField.vue')]])
    const code = 'const field = _resolveComponent("KateCmsForm")'
    expect(rewriteAdminComponents(code, components, 'E:/app/pages/index.vue', 'KateCms')).toBeNull()
  })
})
