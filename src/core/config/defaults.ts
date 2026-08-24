import type { MiraiCmsConfig } from './types'

export const defaults: MiraiCmsConfig = {
  adminPath: 'admin',
  loginPath: 'login',
  registerPath: 'register',
  collections: {},
  taxonomies: {},
  blocks: {},
  roles: {},
  media: {
    maxFileSize: 10,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'video/mp4',
    ],
    avif: false,
    webp: false,
    imageSizes: [],
    maxInputPixels: 50_000_000,
  },
}
