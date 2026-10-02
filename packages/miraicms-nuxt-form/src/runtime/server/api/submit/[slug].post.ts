import { createError, defineEventHandler, getRouterParam } from 'h3'
import { submitForm } from '../../utils/forms'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return submitForm(event, slug)
})
