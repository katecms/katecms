import { useRuntimeConfig } from '#imports'
import { cmsRoutePath } from '../utils/cms-paths'

export function useCmsPaths() {
  const config = useRuntimeConfig().public.miraicms
  return {
    admin: cmsRoutePath(config?.adminPath || 'admin'),
    login: cmsRoutePath(config?.loginPath || 'login'),
    register: cmsRoutePath(config?.registerPath || 'register'),
  }
}
