import { defineEventHandler, getQuery, getRequestURL } from 'h3'
import { buildHead, existingTerm, publishedEntry, readEntrySeo, readSite, readTermSeo } from '../utils/documents'
import type { SeoHead } from '../utils/documents'

function readString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}

export default defineEventHandler(async (event): Promise<SeoHead> => {
  const query = getQuery(event)
  const entryId = Number(readString(query.entryId))
  const termId = Number(readString(query.termId))
  const fallbackTitle = readString(query.title).slice(0, 200)
  const path = readString(query.path) || '/'
  const isArchive = readString(query.archive) === '1'
  const site = await readSite()
  const published = Number.isInteger(entryId) && entryId > 0
    ? await publishedEntry(entryId)
    : undefined
  const term = !published && Number.isInteger(termId) && termId > 0
    ? await existingTerm(termId)
    : undefined
  const entry = published
    ? await readEntrySeo(entryId)
    : term
      ? await readTermSeo(termId)
      : null

  return buildHead({
    site,
    entry,
    fallbackTitle: fallbackTitle || published?.title || term?.title || site.siteName,
    path,
    origin: getRequestURL(event).origin,
    isArchive,
  })
})
