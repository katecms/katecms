import { createError, defineEventHandler, getRouterParam } from 'h3'
import { readPublicForm } from '../../utils/forms'

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'id') || ''
  if (!/^[1-9]\d*$/.test(raw)) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  const form = await readPublicForm(Number(raw))
  if (!form) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return form
})
