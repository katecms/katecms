import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { sql } from 'kysely'
import { requireEntryPermission, requireUser } from 'katecms/server'
import { getSeoDb } from '../../utils/db'
import { writeEntrySeo } from '../../utils/documents'
import type { SeoEntry } from '../../utils/documents'

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export default defineEventHandler(async (event): Promise<SeoEntry> => {
  const actor = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid entry.' })
  }
  const row = await sql<{ type: string, author_id: number | null }>`
    SELECT type, author_id FROM collections WHERE id = ${id}
  `.execute(getSeoDb())
  const entry = row.rows[0]
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found.' })
  }
  requireEntryPermission(
    actor,
    'collections',
    'update',
    { authorId: entry.author_id },
    useRuntimeConfig().katecms?.roles ?? {},
    entry.type,
  )
  const body = await readBody<Partial<SeoEntry>>(event)
  return writeEntrySeo(id, {
    title: text(body?.title),
    description: text(body?.description),
    canonical: text(body?.canonical),
    image: text(body?.image),
    noindex: body?.noindex === true,
    nofollow: body?.nofollow === true,
  })
})
