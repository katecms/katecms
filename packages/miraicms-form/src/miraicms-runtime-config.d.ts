import type { ResolvedMiraiCmsConfig } from '@miraicms/core'

interface MiraiCmsPublicConfig {
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
}

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    miraicms: ResolvedMiraiCmsConfig
    miraicmsForm: {
      uploadDir: string
      maxFileBytes: number
    }
  }
  interface PublicRuntimeConfig {
    miraicms: MiraiCmsPublicConfig
  }
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    miraicms: ResolvedMiraiCmsConfig
    miraicmsForm: {
      uploadDir: string
      maxFileBytes: number
    }
  }
  interface PublicRuntimeConfig {
    miraicms: MiraiCmsPublicConfig
  }
}
