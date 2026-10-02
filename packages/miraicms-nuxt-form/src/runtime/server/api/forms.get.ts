import { defineEventHandler } from 'h3'
import { requireUser } from 'miraicms-nuxt/server'
import { listForms } from '../utils/forms'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return listForms()
})
