import { createError, defineEventHandler, getRequestURL, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'
import { isTerminalStatus, resolveRedirect } from '../utils/redirects'

function isSkippedPath(path: string, adminPath: string): boolean {
  if (!path || path === '/') {
    return true
  }
  const admin = `/${adminPath}`
  return path === admin
    || path.startsWith(`${admin}/`)
    || path.startsWith('/api/')
    || path.startsWith('/_nuxt')
    || path.startsWith('/__nuxt')
    || path === '/favicon.ico'
    || path === '/robots.txt'
    || path === '/sitemap.xml'
}

/** Answer public redirects before the page renders. */
export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') {
    return
  }
  const adminPath = String(useRuntimeConfig().miraicms?.adminPath || 'admin')
    .replace(/^\/+|\/+$/g, '') || 'admin'
  const path = getRequestURL(event).pathname
  if (isSkippedPath(path, adminPath)) {
    return
  }
  let found
  try {
    found = await resolveRedirect(path)
  }
  catch {
    return
  }
  if (!found) {
    return
  }
  if (isTerminalStatus(found.statusCode)) {
    throw createError({
      statusCode: found.statusCode,
      statusMessage: found.statusCode === 410 ? 'Gone' : 'Unavailable For Legal Reasons',
    })
  }
  return sendRedirect(event, found.to, found.statusCode)
})
