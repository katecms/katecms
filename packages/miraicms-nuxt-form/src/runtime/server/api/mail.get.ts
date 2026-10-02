import { defineEventHandler } from 'h3'
import { requireUser } from 'miraicms-nuxt/server'
import { readMailSettings } from '../utils/mail'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return readMailSettings()
})
