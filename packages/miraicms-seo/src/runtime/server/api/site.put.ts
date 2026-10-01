import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { requirePermission, requireUser } from 'miraicms-nuxt/server'
import { writeSite } from '../utils/documents'
import type { SeoSite } from '../utils/documents'

export default defineEventHandler(async (event): Promise<SeoSite> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'options', 'update', useRuntimeConfig().miraicms?.roles ?? {})
  const body = await readBody<Partial<SeoSite>>(event)
  return writeSite({
    siteName: typeof body?.siteName === 'string' ? body.siteName : '',
    titleSeparator: typeof body?.titleSeparator === 'string' ? body.titleSeparator : '|',
    titleTemplate: typeof body?.titleTemplate === 'string' ? body.titleTemplate : '',
    description: typeof body?.description === 'string' ? body.description : '',
    noindex: body?.noindex === true,
  })
})
