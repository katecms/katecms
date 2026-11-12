import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { requirePermission, requireUser } from 'katecms/server'
import { listRedirects } from '../utils/redirects'
import type { SeoRedirect } from '../../types'

export default defineEventHandler(async (event): Promise<SeoRedirect[]> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'options', 'read', useRuntimeConfig().katecms?.roles ?? {})
  return listRedirects()
})
