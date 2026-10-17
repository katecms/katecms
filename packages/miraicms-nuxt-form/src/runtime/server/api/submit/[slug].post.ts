import { createError, defineEventHandler, getRouterParam } from 'h3'
import { submitForm } from '../../utils/forms'

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'slug') || ''
  if (!/^[1-9]\d*$/.test(raw)) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return submitForm(event, Number(raw))
})
