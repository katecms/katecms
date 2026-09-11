<script setup lang="ts">
import { useHead } from '#imports'
import { onMounted, ref } from 'vue'
import { isImageMedia, RESERVED_SIZE_NAME } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'

useHead({ title: 'Media library' })

const rootClass = 'miraicms-media'

const POLL_MAX_ATTEMPTS = 60
const POLL_INTERVAL_MS = 2000

const items = ref<MediaItem[]>([])
const loading = ref(false)
const uploading = ref(false)
const saving = ref(false)
const regenerating = ref(false)
const error = ref<string | null>(null)
const notice = ref<{
  variant: 'success' | 'info' | 'warning' | 'danger'
  message: string
} | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const selected = ref<MediaItem | null>(null)
const editAlt = ref('')
const editCaption = ref('')

const altField = { type: 'text' as const, label: 'Alt text' }
const captionField = { type: 'textarea' as const, label: 'Caption', rows: 3 }

const FORMAT_ORDER: Record<string, number> = { avif: 0, webp: 1 }

function isProcessing(item: MediaItem): boolean {
  return item.variants_status === 'pending'
}

function errMessage(err: unknown, fallback: string): string {
  const e = err as { statusMessage?: string, data?: { message?: string, statusMessage?: string } }
  return e.data?.statusMessage || e.data?.message || e.statusMessage || fallback
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function pictureSources(item: MediaItem): MediaItem['variants'] {
  return item.variants
    .filter(variant => variant.size === RESERVED_SIZE_NAME)
    .sort((a, b) => (FORMAT_ORDER[a.format] ?? 9) - (FORMAT_ORDER[b.format] ?? 9))
}

function replaceItem(next: MediaItem) {
  items.value = items.value.map(item => (item.id === next.id ? next : item))
  if (selected.value?.id === next.id) {
    selected.value = next
  }
}

async function load(options?: { silent?: boolean }) {
  if (!options?.silent) {
    loading.value = true
    error.value = null
  }
  try {
    const res = await $fetch<{ media: MediaItem[] }>('/api/_miraicms/media')
    items.value = res.media
    if (selected.value) {
      selected.value = items.value.find(entry => entry.id === selected.value?.id) ?? selected.value
    }
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load the media library.')
  }
  finally {
    if (!options?.silent) {
      loading.value = false
    }
  }
}

function failedCount(ids: number[]): number {
  return ids.filter((id) => {
    return items.value.find(entry => entry.id === id)?.variants_status === 'failed'
  }).length
}

function showRegenNotice(ids: number[]) {
  const failed = failedCount(ids)
  if (failed && failed === ids.length) {
    notice.value = {
      variant: 'danger',
      message: ids.length === 1
        ? 'Could not regenerate this image.'
        : 'Could not regenerate image variants.',
    }
    return
  }
  if (failed) {
    notice.value = {
      variant: 'warning',
      message: failed === 1
        ? 'Regeneration finished. 1 image failed.'
        : `Regeneration finished. ${failed} images failed.`,
    }
    return
  }
  notice.value = {
    variant: 'success',
    message: 'Image variants regenerated.',
  }
}

function pollVariants(
  ids: number[],
  options: {
    onComplete?: (trackedIds: number[]) => void
    onTimeout?: () => void
    /** `0` keeps polling until nothing is pending. */
    maxAttempts?: number
  } = {},
): void {
  const tracked = ids.slice()
  const maxAttempts = options.maxAttempts ?? POLL_MAX_ATTEMPTS

  const tick = (remaining: number[], attempt: number) => {
    if (!remaining.length) {
      options.onComplete?.(tracked)
      return
    }
    if (maxAttempts > 0 && attempt >= maxAttempts) {
      options.onTimeout?.()
      return
    }
    setTimeout(async () => {
      await load({ silent: true })
      const next = remaining.filter((id) => {
        const item = items.value.find(entry => entry.id === id)
        return item?.variants_status === 'pending'
      })
      tick(next, attempt + 1)
    }, POLL_INTERVAL_MS)
  }

  tick(tracked, 0)
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length) {
    return
  }

  uploading.value = true
  error.value = null
  const pendingIds: number[] = []
  try {
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      const res = await $fetch<{ media: MediaItem }>('/api/_miraicms/media', {
        method: 'POST',
        body: form,
      })
      items.value = [res.media, ...items.value]
      if (res.media.variants_status === 'pending') {
        pendingIds.push(res.media.id)
      }
    }
  }
  catch (err) {
    error.value = errMessage(err, 'Could not upload the file.')
  }
  finally {
    uploading.value = false
    input.value = ''
  }

  pollVariants(pendingIds)
}

function openEditor(item: MediaItem) {
  selected.value = item
  editAlt.value = item.alt ?? ''
  editCaption.value = item.caption ?? ''
  error.value = null
}

function closeEditor() {
  selected.value = null
}

async function saveMeta() {
  if (!selected.value) {
    return
  }
  saving.value = true
  error.value = null
  try {
    const res = await $fetch<{ media: MediaItem }>(`/api/_miraicms/media/${selected.value.id}`, {
      method: 'PATCH',
      body: { alt: editAlt.value, caption: editCaption.value },
    })
    replaceItem(res.media)
  }
  catch (err) {
    error.value = errMessage(err, 'Could not save changes.')
  }
  finally {
    saving.value = false
  }
}

async function remove(item: MediaItem) {
  if (!confirm(`Delete “${item.filename}”?`)) {
    return
  }
  error.value = null
  try {
    await $fetch(`/api/_miraicms/media/${item.id}`, { method: 'DELETE' })
    items.value = items.value.filter(entry => entry.id !== item.id)
    if (selected.value?.id === item.id) {
      closeEditor()
    }
  }
  catch (err) {
    error.value = errMessage(err, 'Could not delete the file.')
  }
}

async function regenerateAll() {
  if (!confirm('Regenerate image variants for the whole library? This may take a while.')) {
    return
  }
  regenerating.value = true
  error.value = null
  notice.value = null
  try {
    const res = await $fetch<{ count: number }>('/api/_miraicms/media/regenerate', { method: 'POST' })
    await load({ silent: true })
    const pendingIds = items.value
      .filter(item => item.variants_status === 'pending')
      .map(item => item.id)
    if (!pendingIds.length) {
      notice.value = {
        variant: 'success',
        message: res.count ? 'Image variants regenerated.' : 'No images to regenerate.',
      }
      regenerating.value = false
      return
    }
    pollVariants(pendingIds, {
      maxAttempts: 0,
      onComplete: (ids) => {
        showRegenNotice(ids)
        regenerating.value = false
      },
    })
  }
  catch (err) {
    error.value = errMessage(err, 'Could not start regeneration.')
    regenerating.value = false
  }
}

async function regenerateOne(item: MediaItem) {
  error.value = null
  notice.value = null
  try {
    const res = await $fetch<{ media: MediaItem }>(`/api/_miraicms/media/${item.id}/regenerate`, {
      method: 'POST',
    })
    replaceItem(res.media)
    if (res.media.variants_status !== 'pending') {
      showRegenNotice([res.media.id])
      return
    }
    pollVariants([res.media.id], {
      maxAttempts: 0,
      onComplete: ids => showRegenNotice(ids),
    })
  }
  catch (err) {
    error.value = errMessage(err, 'Could not regenerate this image.')
  }
}

onMounted(async () => {
  await load()
  pollVariants(items.value.filter(item => item.variants_status === 'pending').map(item => item.id))
})
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__head`">
      <div :class="`${rootClass}__head-title`">
        Media library
      </div>
      <div :class="`${rootClass}__head-actions`">
        <input
          ref="fileInput"
          type="file"
          :class="`${rootClass}__file`"
          multiple
          @change="onFilesSelected"
        >
        <MiraiCmsUiButton
          tag="button"
          variant="secondary"
          :disabled="regenerating || !items.length"
          title="Regenerate image variants from the current media config"
          @click="regenerateAll"
        >
          {{ regenerating ? 'Regenerating…' : 'Regenerate' }}
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          :disabled="uploading"
          @click="fileInput?.click()"
        >
          {{ uploading ? 'Uploading…' : 'Upload files' }}
        </MiraiCmsUiButton>
      </div>
    </div>

    <MiraiCmsUiNotice
      v-if="notice"
      placement="fixed"
      :variant="notice.variant"
      :message="notice.message"
      @close="notice = null"
    />
    <MiraiCmsUiNotice
      v-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = null"
    />
    <MiraiCmsUiNotice
      v-if="loading"
      placement="static"
      variant="info"
      message="Loading…"
      :closable="false"
    />
    <MiraiCmsUiNotice
      v-else-if="!items.length && !error"
      placement="static"
      variant="info"
      message="No files yet. Upload the first one."
      :closable="false"
    />

    <div
      v-else-if="items.length"
      :class="`${rootClass}__grid`"
    >
      <div
        v-for="item in items"
        :key="item.id"
        :class="`${rootClass}__card`"
      >
        <button
          type="button"
          :class="`${rootClass}__thumb`"
          @click="openEditor(item)"
        >
          <picture v-if="isImageMedia(item)">
            <source
              v-for="variant in pictureSources(item)"
              :key="variant.format"
              :srcset="variant.url"
              :type="`image/${variant.format}`"
            >
            <img
              :src="item.url"
              :alt="item.alt || item.filename"
              loading="lazy"
            >
          </picture>
          <span
            v-else
            :class="`${rootClass}__ext`"
          >{{ item.mime_type }}</span>
          <span
            v-if="isProcessing(item)"
            :class="`${rootClass}__processing`"
          >
            <span :class="`${rootClass}__spinner`" />
            Processing…
          </span>
        </button>
        <div :class="`${rootClass}__meta`">
          <span
            :class="`${rootClass}__name`"
            :title="item.filename"
          >
            {{ item.filename }}
          </span>
          <span :class="`${rootClass}__sub`">
            {{ formatSize(item.filesize) }}
            <template v-if="item.width && item.height">
              · {{ item.width }}×{{ item.height }}
            </template>
          </span>
        </div>
        <MiraiCmsUiButton
          tag="button"
          :variant="['red', 'small']"
          @click="remove(item)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
          Delete
        </MiraiCmsUiButton>
      </div>
    </div>

    <div
      v-if="selected"
      :class="`${rootClass}__overlay`"
      @click.self="closeEditor"
    >
      <div :class="`${rootClass}__modal`">
        <div :class="`${rootClass}__modal-head`">
          <div :class="`${rootClass}__modal-title`">
            File details
          </div>
          <MiraiCmsUiButton
            tag="button"
            :variant="['tertiary', 'small', 'icon']"
            aria-label="Close"
            @click="closeEditor"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              fill="currentColor"
            >
              <path
                d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"
              />
            </svg>
          </MiraiCmsUiButton>
        </div>

        <div :class="`${rootClass}__modal-body`">
          <div :class="`${rootClass}__preview`">
            <picture v-if="isImageMedia(selected)">
              <source
                v-for="variant in pictureSources(selected)"
                :key="variant.format"
                :srcset="variant.url"
                :type="`image/${variant.format}`"
              >
              <img
                :src="selected.url"
                :alt="selected.alt || selected.filename"
              >
            </picture>
            <span
              v-else
              :class="`${rootClass}__ext`"
            >{{ selected.mime_type }}</span>
          </div>

          <div :class="`${rootClass}__side`">
            <div :class="`${rootClass}__details`">
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">Uploaded</div>
                <div :class="`${rootClass}__def`">{{ formatDate(selected.created_at) }}</div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">Author</div>
                <div :class="`${rootClass}__def`">{{ selected.uploaded_by_name || '—' }}</div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">File name</div>
                <div :class="`${rootClass}__def`">{{ selected.filename }}</div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">Type</div>
                <div :class="`${rootClass}__def`">{{ selected.mime_type }}</div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">Size</div>
                <div :class="`${rootClass}__def`">{{ formatSize(selected.filesize) }}</div>
              </div>
              <div
                v-if="selected.width && selected.height"
                :class="`${rootClass}__row`"
              >
                <div :class="`${rootClass}__term`">Dimensions</div>
                <div :class="`${rootClass}__def`">{{ selected.width }} × {{ selected.height }} px</div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">URL</div>
                <div :class="`${rootClass}__def`">
                  <a
                    :href="selected.url"
                    target="_blank"
                    rel="noopener"
                  >{{ selected.url }}</a>
                </div>
              </div>
              <div
                v-if="isImageMedia(selected) && selected.variants.length"
                :class="`${rootClass}__row`"
              >
                <div :class="`${rootClass}__term`">Variants</div>
                <div :class="`${rootClass}__def`">
                  <div :class="`${rootClass}__variants`">
                    <div
                      v-for="variant in selected.variants"
                      :key="variant.filename"
                    >
                      <a
                        :href="variant.url"
                        target="_blank"
                        rel="noopener"
                      >
                        {{ variant.format.toUpperCase() }}
                        · {{ variant.size }}
                        · {{ variant.width }}×{{ variant.height }}
                        · {{ formatSize(variant.filesize) }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form
              :class="`${rootClass}__form`"
              @submit.prevent="saveMeta"
            >
              <MiraiCmsFieldWrapper
                field-key="miraicms-media-alt"
                :field="altField"
              >
                <MiraiCmsInputControl
                  v-model="editAlt"
                  field-key="miraicms-media-alt"
                />
              </MiraiCmsFieldWrapper>

              <MiraiCmsTextareaField
                v-model="editCaption"
                field-key="miraicms-media-caption"
                :field="captionField"
              />

              <MiraiCmsUiButton
                tag="button"
                type="submit"
                :disabled="saving"
              >
                {{ saving ? 'Saving…' : 'Save' }}
              </MiraiCmsUiButton>
            </form>

            <MiraiCmsUiButton
              v-if="isImageMedia(selected)"
              tag="button"
              variant="secondary"
              :disabled="selected.variants_status === 'pending'"
              @click="regenerateOne(selected)"
            >
              {{ selected.variants_status === 'pending' ? 'Processing…' : 'Regenerate variants' }}
            </MiraiCmsUiButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-media';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: math-rem(16);

      &-title {
        font-size: math-rem(18);
        font-weight: 600;
      }

      &-actions {
        display: flex;
        gap: math-rem(8);
      }
    }

    &__file {
      display: none;
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(math-rem(160), 1fr));
      gap: math-rem(16);
    }

    &__card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
      box-shadow: $shadow-sm;

      :deep(.miraicms-btn) {
        width: calc(100% - #{math-rem(16)});
        margin: 0 math-rem(8) math-rem(8);
      }
    }

    &__thumb {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 4 / 3;
      padding: 0;
      overflow: hidden;
      border: none;
      background: $color-bg;
      cursor: pointer;

      picture {
        width: 100%;
        height: 100%;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &__processing {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: math-rem(6);
      background: rgba($color-ink, 0.55);
      color: $color-surface;
      font-size: math-rem(12);
      font-weight: 600;
    }

    &__spinner {
      width: math-rem(14);
      height: math-rem(14);
      border: 2px solid rgba($color-surface, 0.4);
      border-top-color: $color-surface;
      border-radius: 50%;
      animation: miraicms-media-spin 0.7s linear infinite;
    }

    @keyframes miraicms-media-spin {
      to {
        transform: rotate(360deg);
      }
    }

    &__ext {
      padding: 0 math-rem(8);
      color: $color-muted;
      font-size: math-rem(12);
      text-align: center;
      word-break: break-all;
    }

    &__meta {
      display: flex;
      flex-direction: column;
      gap: math-rem(2);
      min-width: 0;
      padding: math-rem(8) math-rem(10);
    }

    &__name {
      overflow: hidden;
      color: $color-ink;
      font-size: math-rem(13);
      font-weight: 600;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &__sub {
      color: $color-muted;
      font-size: math-rem(12);
    }

    &__overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: math-rem(24);
      background: rgba($color-ink, 0.45);
    }

    &__modal {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: math-rem(1400);
      max-height: 90vh;
      overflow: hidden;
      background: $color-surface;
      border-radius: $border-radius;
      box-shadow: $shadow-md;

      &-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: math-rem(14) math-rem(16);
        border-bottom: 1px solid $color-border;
      }

      &-title {
        margin: 0;
        font-size: math-rem(16);
        font-weight: 600;
        color: $color-ink;
      }

      &-body {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        gap: math-rem(20);
        padding: math-rem(16);
        overflow: auto;

        @media (max-width: 800px) {
          grid-template-columns: 1fr;
        }
      }
    }

    &__preview {
      min-height: math-rem(224);
      overflow: hidden;
      background: $color-bg;
      border-radius: $border-radius;

      picture {
        width: 100%;
        height: 100%;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    &__side {
      display: flex;
      flex-direction: column;
      gap: math-rem(16);
      min-width: 0;
    }

    &__details {
      display: flex;
      flex-direction: column;
      gap: math-rem(6);
      margin: 0;
      font-size: math-rem(13);
    }

    &__variants {
      display: flex;
      flex-direction: column;
      gap: math-rem(4);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: math-rem(12);
    }

    &__term {
      color: $color-muted;
    }

    &__def {
      margin: 0;
      color: $color-ink;
      word-break: break-word;
    }

    &__row {
      display: grid;
      grid-template-columns: math-rem(112) minmax(0, 1fr);
      gap: math-rem(8);

      a {
        color: $color-accent;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: math-rem(12);
      padding-top: math-rem(16);
      border-top: 1px solid $color-border;
    }
  }
}
</style>
