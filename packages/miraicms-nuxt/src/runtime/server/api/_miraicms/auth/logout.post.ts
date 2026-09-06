import { defineEventHandler } from 'h3'
import { clearUserSession } from '../../../utils/session'

export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await clearUserSession(event)
  return { ok: true }
})
