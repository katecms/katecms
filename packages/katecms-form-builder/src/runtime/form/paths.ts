import { useRuntimeConfig } from '#imports'

export function useFormPaths() {
  const config = useRuntimeConfig().public.katecms
  const admin = `/${String(config?.adminPath || 'admin').replace(/^\/+|\/+$/g, '') || 'admin'}`
  return {
    list: `${admin}/forms`,
    mail: `${admin}/forms/mail`,
    edit: (id: number | string) => `${admin}/forms/${id}`,
    entries: (id: number | string) => `${admin}/forms/${id}/entries`,
    entry: (formId: number | string, submissionId: number | string) => `${admin}/forms/${formId}/entries/${submissionId}`,
  }
}
