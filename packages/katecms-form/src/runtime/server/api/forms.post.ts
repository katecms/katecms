import { defineEventHandler, readBody } from 'h3'
import { requireFormAccess } from '../utils/access'
import { createForm } from '../utils/forms'

export default defineEventHandler(async (event) => {
  await requireFormAccess(event, 'create')
  const body = await readBody<{ name?: string }>(event)
  return createForm(typeof body?.name === 'string' ? body.name : '')
})
