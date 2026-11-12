import { defineEventHandler, readBody } from 'h3'
import { requireFormAccess } from '../../utils/access'
import { sendTestMail } from '../../utils/mail'

export default defineEventHandler(async (event) => {
  await requireFormAccess(event, 'update')
  const body = await readBody<{ to?: string }>(event)
  await sendTestMail(typeof body?.to === 'string' ? body.to : '')
  return { ok: true }
})
