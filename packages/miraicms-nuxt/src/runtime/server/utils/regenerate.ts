import {
  hasImageWork,
  isProcessableImage,
  regenerateVariants,
  updateMedia,
} from '@miraicms/core'
import type { StoredMediaVariant } from '@miraicms/core'
import { getDb } from './db'
import { getMediaConfig, getMediaStorage } from './media'

export interface RegenerateTarget {
  id: number
  filename: string
  mime_type: string
  variants: StoredMediaVariant[]
}

/**
 * Rebuild one item's variants from the current media config and persist
 * `ready` / `none` / `failed`. Safe to run after the HTTP response.
 */
export async function regenerateMedia(target: RegenerateTarget): Promise<void> {
  const { id, filename, mime_type: mimeType, variants: oldVariants } = target
  if (!isProcessableImage(mimeType)) {
    return
  }

  const storage = getMediaStorage()
  const config = getMediaConfig()
  const willGenerate = hasImageWork(config)

  try {
    let variants: StoredMediaVariant[] = []
    if (willGenerate) {
      variants = await regenerateVariants({
        storage,
        key: filename,
        mimeType,
        oldVariants,
        config,
      })
    }
    else {
      await Promise.all(oldVariants.map(variant => storage.delete(variant.filename).catch(() => {})))
    }

    await updateMedia(getDb(), id, {
      variants,
      variants_status: willGenerate ? 'ready' : 'none',
    })
  }
  catch (error) {
    console.error('[miraicms] failed to regenerate image variants', error)
    await updateMedia(getDb(), id, { variants_status: 'failed' }).catch(() => {})
  }
}
