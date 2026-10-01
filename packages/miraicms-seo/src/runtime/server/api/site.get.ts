import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { requirePermission, requireUser } from 'miraicms-nuxt/server'
import { readSite } from '../utils/documents'
import type { SeoSite } from '../utils/documents'

export default defineEventHandler(async (event): Promise<SeoSite> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'options', 'read', useRuntimeConfig().miraicms?.roles ?? {})
  return readSite()
})
