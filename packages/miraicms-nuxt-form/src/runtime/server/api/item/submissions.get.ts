import { defineEventHandler, getRouterParam } from 'h3'
import { requireFormAccess } from '../../utils/access'
import { listFormSubmissions, missingForm } from '../../utils/submissions'
import type { FormSubmissionListItem } from '../../../form/model'

export default defineEventHandler(async (event): Promise<{ submissions: FormSubmissionListItem[], total: number }> => {
  await requireFormAccess(event, 'read')
  const formId = positiveId(getRouterParam(event, 'id'))
  const result = await listFormSubmissions(formId)
  if (!result) {
    missingForm()
  }
  return result
})

function positiveId(raw: string | undefined): number {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 0
}
