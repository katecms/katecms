/**
 * Browser-safe subset of the core package.
 *
 * Vite/Nuxt client builds resolve `@miraicms/core` here (package.json
 * `"browser"` export). Database, media runtime, indexes apply, and password hashing
 * stay on the Node entry (`src/index.ts`). Media DTOs (`MediaItem`, …) are safe
 * to share with the client and are re-exported here.
 */
export * from './config'
export * from './permissions'
export {
  EMAIL_RE,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validatePassword,
} from './auth/account'
export type {
  ValidationFailure,
  ValidationResult,
  ValidationSuccess,
} from './auth/account'
export type { AuthState, SafeUser } from './auth/types'
export * from './fields'
export * from './rewrite'
export * from './blocks'
export * from './text'
export * from './oembed'
export type {
  GalleryFieldValue,
  ImageDimensions,
  MediaFieldValue,
  MediaItem,
  MediaVariant,
  MediaVariantsStatus,
  StoredMediaVariant,
} from './media/types'
export { isImageMedia, isMediaItem } from './media/types'
