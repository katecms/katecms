import { defineEventHandler, readBody } from 'h3'
import { requireUser } from 'miraicms-nuxt/server'
import { createForm } from '../utils/forms'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readBody<{ name?: string }>(event)
  return createForm(typeof body?.name === 'string' ? body.name : '')
})
