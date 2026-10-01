import { createError, defineEventHandler, getRouterParam } from 'h3'
import { readPublicForm } from '../../utils/forms'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const form = await readPublicForm(slug)
  if (!form) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return form
})
