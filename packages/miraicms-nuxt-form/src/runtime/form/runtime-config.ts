import { useRuntimeConfig } from '#imports'
import { setFormBreakpoints } from './model'

export interface ClientFormBreakpoint {
  name: string
  label: string
  maxWidth: number | null
}

const FALLBACK_BREAKPOINTS: ClientFormBreakpoint[] = [
  { name: 'phone', label: 'Phone', maxWidth: 390 },
  { name: 'tablet', label: 'Tablet', maxWidth: 768 },
  { name: 'desktop', label: 'Desktop', maxWidth: null },
]

/** Apply `miraicms.form.breakpoints` and return the list used by the builder. */
export function clientFormBreakpoints(): ClientFormBreakpoint[] {
  const items = useRuntimeConfig().public.miraicms?.form?.breakpoints
  if (!Array.isArray(items) || !items.length) {
    setFormBreakpoints(FALLBACK_BREAKPOINTS.map(item => item.name))
    return FALLBACK_BREAKPOINTS
  }
  const next = items.flatMap((item) => {
    const name = typeof item?.name === 'string' ? item.name.trim().toLowerCase() : ''
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(name)) {
      return []
    }
    const width = Number(item.maxWidth)
    return [{
      name,
      label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : name,
      maxWidth: Number.isFinite(width) && width > 0 ? Math.round(width) : null,
    }]
  })
  if (!next.length) {
    setFormBreakpoints(FALLBACK_BREAKPOINTS.map(item => item.name))
    return FALLBACK_BREAKPOINTS
  }
  setFormBreakpoints(next.map(item => item.name))
  return next
}
