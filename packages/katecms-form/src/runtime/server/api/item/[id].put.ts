import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireFormAccess } from '../../utils/access'
import { updateForm } from '../../utils/forms'

export default defineEventHandler(async (event) => {
  await requireFormAccess(event, 'update')
  return updateForm(routeId(event), await readBody(event))
})

function routeId(event: Parameters<typeof getRouterParam>[0]): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return id
}
