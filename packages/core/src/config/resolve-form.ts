import type { FormBreakpointConfig, FormConfig, ResolvedFormBreakpoint, ResolvedFormConfig } from './types'
import { defaults } from './defaults'

const BREAKPOINT_NAME = /^[a-z][a-z0-9-]{0,31}$/
const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024

export interface ResolveFormResult {
  form: ResolvedFormConfig
  warnings: string[]
}

function defaultBreakpoints(): ResolvedFormBreakpoint[] {
  return defaults.form.breakpoints.map(item => ({
    name: item.name,
    label: item.label,
    maxWidth: item.maxWidth,
  }))
}

function breakpointLabel(name: string, label: string | undefined): string {
  const text = label?.trim()
  if (text) {
    return text
  }
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function resolveBreakpoints(input: FormBreakpointConfig[] | undefined, warnings: string[]): ResolvedFormBreakpoint[] {
  if (!input?.length) {
    if (input) {
      warnings.push('miraicms.form.breakpoints is empty. Using phone, tablet, and desktop.')
    }
    return defaultBreakpoints()
  }
  const seen = new Set<string>()
  const next: ResolvedFormBreakpoint[] = []
  for (const item of input) {
    const name = typeof item?.name === 'string' ? item.name.trim().toLowerCase() : ''
    if (!BREAKPOINT_NAME.test(name)) {
      warnings.push(`Ignoring form breakpoint "${item?.name ?? ''}". Use a short lowercase name such as "desktop".`)
      continue
    }
    if (seen.has(name)) {
      warnings.push(`Ignoring duplicate form breakpoint "${name}".`)
      continue
    }
    seen.add(name)
    let maxWidth: number | null = null
    if (item.maxWidth != null && item.maxWidth !== 0) {
      const width = Number(item.maxWidth)
      if (Number.isFinite(width) && width > 0) {
        maxWidth = Math.round(width)
      }
      else {
        warnings.push(`Form breakpoint "${name}" has an invalid maxWidth. Using the full stage.`)
      }
    }
    next.push({
      name,
      label: breakpointLabel(name, item.label),
      maxWidth,
    })
  }
  if (!next.length) {
    warnings.push('No usable form breakpoints were configured. Using phone, tablet, and desktop.')
    return defaultBreakpoints()
  }
  return next
}

/** Normalise `miraicms.form`. */
export function resolveFormConfig(form: FormConfig | undefined): ResolveFormResult {
  const warnings: string[] = []
  const uploadDir = typeof form?.uploadDir === 'string' ? form.uploadDir.trim() : ''
  const rawMax = form?.maxFileBytes
  const maxFileBytes = typeof rawMax === 'number' && Number.isFinite(rawMax) && rawMax > 0
    ? Math.floor(rawMax)
    : DEFAULT_MAX_FILE_BYTES
  if (rawMax != null && maxFileBytes === DEFAULT_MAX_FILE_BYTES && rawMax !== DEFAULT_MAX_FILE_BYTES) {
    warnings.push('miraicms.form.maxFileBytes must be a positive number. Using 10MB.')
  }
  return {
    form: {
      uploadDir,
      maxFileBytes,
      breakpoints: resolveBreakpoints(form?.breakpoints, warnings),
    },
    warnings,
  }
}
