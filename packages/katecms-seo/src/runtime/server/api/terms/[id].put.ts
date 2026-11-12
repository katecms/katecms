import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { sql } from 'kysely'
import { requirePermission, requireUser } from 'katecms/server'
import { getSeoDb } from '../../utils/db'
import { writeTermSeo } from '../../utils/documents'
import type { SeoEntry } from '../../../types'

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export default defineEventHandler(async (event): Promise<SeoEntry> => {
  const actor = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid term.' })
  }
  const row = await sql<{ type: string }>`
    SELECT type FROM dictionaries WHERE id = ${id}
  `.execute(getSeoDb())
  const term = row.rows[0]
  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Term not found.' })
  }
  requirePermission(actor, 'dictionaries', 'update', useRuntimeConfig().katecms?.roles ?? {}, term.type)
  const body = await readBody<Partial<SeoEntry>>(event)
  return writeTermSeo(id, {
    title: text(body?.title),
    description: text(body?.description),
    canonical: text(body?.canonical),
    image: text(body?.image),
    noindex: body?.noindex === true,
    nofollow: body?.nofollow === true,
  })
})
