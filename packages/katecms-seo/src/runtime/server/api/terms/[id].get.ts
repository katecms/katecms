import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { sql } from 'kysely'
import { requirePermission, requireUser } from 'katecms/server'
import { getSeoDb } from '../../utils/db'
import { termEditorPayload } from '../../utils/editor'
import type { SeoEditorPayload } from '../../../types'

export default defineEventHandler(async (event): Promise<SeoEditorPayload> => {
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
  requirePermission(actor, 'dictionaries', 'read', useRuntimeConfig().katecms?.roles ?? {}, term.type)
  const payload = await termEditorPayload(id)
  if (!payload) {
    throw createError({ statusCode: 404, statusMessage: 'Term not found.' })
  }
  return payload
})
