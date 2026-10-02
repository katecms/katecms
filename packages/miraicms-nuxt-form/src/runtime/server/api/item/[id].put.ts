import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireUser } from 'miraicms-nuxt/server'
import { updateForm } from '../../utils/forms'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return updateForm(routeId(event), await readBody(event))
})

function routeId(event: Parameters<typeof getRouterParam>[0]): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return id
}
