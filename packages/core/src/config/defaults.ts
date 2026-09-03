import type { Blocks, Collections, Dictionaries, ImageSize, MiraiCmsConfig, Roles } from './types'

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
  collections: {} as Collections,
  dictionaries: {} as Dictionaries,
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
} satisfies MiraiCmsConfig
