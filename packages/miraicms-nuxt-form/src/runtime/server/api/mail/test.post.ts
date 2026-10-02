import { defineEventHandler, readBody } from 'h3'
import { requireUser } from 'miraicms-nuxt/server'
import { sendTestMail } from '../../utils/mail'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readBody<{ to?: string }>(event)
  await sendTestMail(typeof body?.to === 'string' ? body.to : '')
  return { ok: true }
})
