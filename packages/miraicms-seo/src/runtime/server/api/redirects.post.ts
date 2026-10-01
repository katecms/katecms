import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { requirePermission, requireUser } from 'miraicms-nuxt/server'
import { listRedirects, readRedirectStatus, saveRedirect } from '../utils/redirects'
import type { SeoRedirect } from '../../types'

function fail(error: unknown): never {
  const message = error instanceof Error ? error.message : 'Could not save the redirect.'
  throw createError({
    statusCode: message === 'Redirect not found.' ? 404 : 422,
    statusMessage: message,
  })
}

export default defineEventHandler(async (event): Promise<SeoRedirect[]> => {
  const actor = await requireUser(event)
  requirePermission(actor, 'options', 'update', useRuntimeConfig().miraicms?.roles ?? {})
  const body = await readBody<{ from?: unknown, to?: unknown, statusCode?: unknown }>(event)
  const statusCode = readRedirectStatus(body?.statusCode ?? 301)
  if (!statusCode) {
    throw createError({ statusCode: 422, statusMessage: 'Choose a redirect type.' })
  }
  try {
    await saveRedirect({
      from: typeof body?.from === 'string' ? body.from : '',
      to: typeof body?.to === 'string' ? body.to : '',
      statusCode,
    })
  }
  catch (error) {
    fail(error)
  }
  return listRedirects()
})
