import type { Blocks, Collections, Dictionaries, ImageSize, MiraiCmsConfig, OptionPages, Roles } from './types'

/**
 * Built-in CMS defaults.
 *
 * Database is SQLite at `data/miraicms.db`. For PostgreSQL 15+:
 * `{ driver: 'postgres', url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms' }`.
 */
export const defaults = {
  adminPath: 'admin',
  loginPath: 'login',
  registerPath: 'register',
  registration: false,
  collections: {} as Collections,
  dictionaries: {} as Dictionaries,
  options: {} as OptionPages,
  blocks: {} as Blocks,
  roles: {} as Roles,
  database: {
    sqliteFilename: 'data/miraicms.db',
  },
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
    avif: false as boolean,
    webp: false as boolean,
    imageSizes: [] as ImageSize[],
    maxInputPixels: 50_000_000,
  },
  form: {
    uploadDir: '',
    maxFileBytes: 10 * 1024 * 1024,
    breakpoints: [
      { name: 'phone', label: 'Phone', maxWidth: 390 },
      { name: 'tablet', label: 'Tablet', maxWidth: 768 },
      { name: 'desktop', label: 'Desktop', maxWidth: null },
    ],
  },
} satisfies MiraiCmsConfig
