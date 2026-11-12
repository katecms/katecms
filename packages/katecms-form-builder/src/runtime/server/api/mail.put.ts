import { defineEventHandler, readBody } from 'h3'
import { requireFormAccess } from '../utils/access'
import { writeMailSettings } from '../utils/mail'

export default defineEventHandler(async (event) => {
  await requireFormAccess(event, 'update')
  return writeMailSettings(await readBody(event))
})
