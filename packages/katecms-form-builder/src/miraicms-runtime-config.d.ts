import type { ResolvedKateCmsConfig } from '@katecms/core'

interface KateCmsPublicConfig {
  adminPath: string
  loginPath: string
  registerPath: string
  registration: boolean
  collections: Record<string, {
    labels: { name: string, singularName: string }
    icon: string
    public: boolean
    has_archive: boolean | string
  }>
  dictionaries: Record<string, {
    labels: { name: string, singularName: string }
    icon: string
  }>
  options: Record<string, {
    label: string
    icon: string
  }>
  form: {
    breakpoints: Array<{
      name: string
      label: string
      maxWidth: number | null
    }>
  }
}

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    katecms: ResolvedKateCmsConfig
  }
  interface PublicRuntimeConfig {
    katecms: KateCmsPublicConfig
  }
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    katecms: ResolvedKateCmsConfig
  }
  interface PublicRuntimeConfig {
    katecms: KateCmsPublicConfig
  }
}
