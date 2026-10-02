import { defineEventHandler, readBody } from 'h3'
import { requireUser } from 'miraicms-nuxt/server'
import { writeMailSettings } from '../utils/mail'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return writeMailSettings(await readBody(event))
})
