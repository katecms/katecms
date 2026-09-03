import type { MiraiCmsConfig } from './types'
import { defaults } from './defaults'

/** User config with built-in {@link defaults} filled in. User values win. */
export type MergedMiraiCmsConfig = typeof defaults & MiraiCmsConfig

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
}

/** Deep-merge `overlay` onto `base`. `undefined` keys are skipped; arrays are replaced. */
function mergeSkipUndefined(base: Record<string, unknown>, overlay: unknown): Record<string, unknown> {
  if (!isPlainObject(overlay)) {
    return { ...base }
  }
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    if (value === undefined) {
      continue
    }
    const current = base[key]
    result[key] = isPlainObject(current) && isPlainObject(value)
      ? mergeSkipUndefined(current, value)
      : value
  }
  return result
}

/** Merge user CMS config onto {@link defaults}. Nested objects merge; arrays replace. */
export function mergeMiraiCmsConfig(config: MiraiCmsConfig = {}): MergedMiraiCmsConfig {
  return mergeSkipUndefined(defaults as Record<string, unknown>, config) as unknown as MergedMiraiCmsConfig
}
