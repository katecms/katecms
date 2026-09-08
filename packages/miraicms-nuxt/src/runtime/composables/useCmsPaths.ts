import { useRuntimeConfig } from '#imports'
import { cmsRoutePath } from '../utils/cms-paths'

export function useCmsPaths() {
  const config = useRuntimeConfig().public.miraicms
  const admin = cmsRoutePath(config?.adminPath || 'admin')
  return {
    admin,
    media: `${admin}/media`,
    login: cmsRoutePath(config?.loginPath || 'login'),
    register: cmsRoutePath(config?.registerPath || 'register'),
  }
}
