import { useRuntimeConfig } from '#imports'
import { cmsRoutePath } from '../utils/cms-paths'

export function useCmsPaths() {
  const config = useRuntimeConfig().public.miraicms
  const admin = cmsRoutePath(config?.adminPath || 'admin')
  return {
    admin,
    media: `${admin}/media`,
    users: `${admin}/users`,
    user: (id: number | string) => `${admin}/users/${id}`,
    demoFields: `${admin}/demo-fields`,
    collection: (slug: string) => `${admin}/collections/${encodeURIComponent(slug)}`,
    collectionCreate: (slug: string) => `${admin}/collections/${encodeURIComponent(slug)}/create`,
    collectionEntry: (slug: string, id: number | string) =>
      `${admin}/collections/${encodeURIComponent(slug)}/${id}`,
    dictionary: (slug: string) => `${admin}/dictionaries/${encodeURIComponent(slug)}`,
    dictionaryTerm: (slug: string, id: number | string) =>
      `${admin}/dictionaries/${encodeURIComponent(slug)}/${id}`,
    option: (slug: string) => `${admin}/options/${encodeURIComponent(slug)}`,
    login: cmsRoutePath(config?.loginPath || 'login'),
    register: cmsRoutePath(config?.registerPath || 'register'),
  }
}
