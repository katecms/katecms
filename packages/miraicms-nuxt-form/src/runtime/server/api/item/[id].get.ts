import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireUser } from 'miraicms-nuxt/server'
import { readForm } from '../../utils/forms'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const form = await readForm(routeId(event))
  if (!form) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return form
})

function routeId(event: Parameters<typeof getRouterParam>[0]): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return id
}
