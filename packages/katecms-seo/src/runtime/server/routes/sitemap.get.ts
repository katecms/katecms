import { defineEventHandler, getRequestURL, setHeader } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { CollectionDefinition } from '@katecms/core'
import { sitemapUrls } from '../utils/documents'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default defineEventHandler(async (event) => {
  const origin = getRequestURL(event).origin
  const collections = (useRuntimeConfig().katecms?.collections ?? {}) as Record<string, CollectionDefinition>
  const urls = await sitemapUrls(origin, collections)
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(url => [
      '  <url>',
      `    <loc>${escapeXml(url.loc)}</loc>`,
      `    <lastmod>${escapeXml(url.lastmod)}</lastmod>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
  ].join('\n')
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
