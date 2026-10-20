import { appendResponseHeader, defineEventHandler, getRequestURL, setResponseHeader } from 'h3'
import { useRuntimeConfig } from '#imports'
import { isCmsAdminPath } from '../../utils/cms-paths'

/** Keep the admin shell out of foreign frames and stop MIME sniffing. */
export default defineEventHandler((event) => {
  const adminPath = String(useRuntimeConfig().miraicms?.adminPath || 'admin')
  const path = getRequestURL(event).pathname
  if (!isCmsAdminPath(path, adminPath)) {
    return
  }
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  appendResponseHeader(event, 'Content-Security-Policy', 'frame-ancestors \'none\'')
})
