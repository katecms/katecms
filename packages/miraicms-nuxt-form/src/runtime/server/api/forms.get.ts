import { defineEventHandler } from 'h3'
import { requireFormAccess } from '../utils/access'
import { listForms } from '../utils/forms'

export default defineEventHandler(async (event) => {
  await requireFormAccess(event, 'read')
  return listForms()
})
