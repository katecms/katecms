import { defineEventHandler, getRouterParam } from 'h3'
import type { FormSubmissionDetail } from '../../../../form/model'
import { requireFormAccess } from '../../../utils/access'
import { missingForm, readFormSubmission } from '../../../utils/submissions'

export default defineEventHandler(async (event): Promise<FormSubmissionDetail> => {
  await requireFormAccess(event, 'read')
  const detail = await readFormSubmission(positiveId(getRouterParam(event, 'id')), positiveId(getRouterParam(event, 'submissionId')))
  if (!detail) {
    missingForm()
  }
  return detail
})

function positiveId(raw: string | undefined): number {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 0
}
