import { defineEventHandler, getRequestURL, setHeader } from 'h3'
import { readSite } from '../utils/documents'

export default defineEventHandler(async (event) => {
  const origin = getRequestURL(event).origin
  const site = await readSite()
  const lines = [
    'User-agent: *',
    site.noindex ? 'Disallow: /' : 'Allow: /',
    `Sitemap: ${origin}/sitemap.xml`,
  ]
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return `${lines.join('\n')}\n`
})
