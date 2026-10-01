import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { sql } from 'kysely'
import { requirePermission, requireUser } from 'miraicms-nuxt/server'
import { getSeoDb } from '../../utils/db'
import { readEntrySeo } from '../../utils/documents'
import type { SeoEntry } from '../../utils/documents'

export default defineEventHandler(async (event): Promise<SeoEntry> => {
  const actor = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid entry.' })
  }
  const row = await sql<{ type: string }>`
    SELECT type FROM collections WHERE id = ${id}
  `.execute(getSeoDb())
  const entry = row.rows[0]
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found.' })
  }
  requirePermission(actor, 'collections', 'read', useRuntimeConfig().miraicms?.roles ?? {}, entry.type)
  return readEntrySeo(id)
})
