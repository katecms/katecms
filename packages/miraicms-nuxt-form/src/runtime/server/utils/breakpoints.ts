import { useRuntimeConfig } from '#imports'
import { setFormBreakpoints } from '../../form/model'

/** Point the form model at `miraicms.form.breakpoints` before reading or writing layouts. */
export function applyServerFormBreakpoints() {
  const items = useRuntimeConfig().miraicms?.form?.breakpoints
  if (!Array.isArray(items) || !items.length) {
    return
  }
  setFormBreakpoints(items.map(item => item.name))
}
