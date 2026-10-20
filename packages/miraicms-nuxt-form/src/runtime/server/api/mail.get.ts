import { defineEventHandler } from 'h3'
import { requireFormAccess } from '../utils/access'
import { readMailSettings } from '../utils/mail'

export default defineEventHandler(async (event) => {
  await requireFormAccess(event, 'read')
  return readMailSettings()
})
