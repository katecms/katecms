import { useRuntimeConfig } from '#imports'

export function useFormPaths() {
  const config = useRuntimeConfig().public.miraicms
  const admin = `/${String(config?.adminPath || 'admin').replace(/^\/+|\/+$/g, '') || 'admin'}`
  return {
    list: `${admin}/forms`,
    mail: `${admin}/forms/mail`,
    edit: (id: number | string) => `${admin}/forms/${id}`,
  }
}
