import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { requirePermission, requireUser } from 'miraicms-nuxt/server'
import { listRedirects, readRedirectStatus, saveRedirect } from '../utils/redirects'
import type { SeoRedirect } from '../../types'

export default defineEventHandler(async (event): Promise<SeoRedirect[]> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'options', 'update', useRuntimeConfig().miraicms?.roles ?? {})
  const body = await readBody<{ id?: unknown, from?: unknown, to?: unknown, statusCode?: unknown }>(event)
  const id = Number(body?.id)
  const statusCode = readRedirectStatus(body?.statusCode)
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid redirect.' })
  }
  if (!statusCode) {
    throw createError({ statusCode: 422, statusMessage: 'Choose a redirect type.' })
  }
  try {
    await saveRedirect({
      id,
      from: typeof body?.from === 'string' ? body.from : '',
      to: typeof body?.to === 'string' ? body.to : '',
      statusCode,
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save the redirect.'
    throw createError({
      statusCode: message === 'Redirect not found.' ? 404 : 422,
      statusMessage: message,
    })
  }
  return listRedirects()
})