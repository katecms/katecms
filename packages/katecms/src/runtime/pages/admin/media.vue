<script setup lang="ts">
import { useHead } from '#imports'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isImageMedia, RESERVED_SIZE_NAME } from '@katecms/core'
import type { MediaItem } from '@katecms/core'
import {
  defaultMediaLibraryFilters,
  localUtcOffsetMinutes,
  mediaFiltersActive,
  mediaLibraryQuery,
  mediaMatchesFilters,
  monthKey,
  normalizeMediaLibraryFilters,
} from '../../utils/media-library-query'
import type { MediaLibraryFilterState, MediaLibraryPage } from '../../utils/media-library-query'

useHead({ title: 'Media library' })

const rootClass = 'katecms-media'

const POLL_MAX_ATTEMPTS = 60
const POLL_INTERVAL_MS = 2000
const PAGE_SIZE = 40

const items = ref<MediaItem[]>([])
const total = ref(0)
const fetched = ref(0)
const months = ref<string[]>([])
const filters = ref<MediaLibraryFilterState>(defaultMediaLibraryFilters())
const loading = ref(false)
const loadingMore = ref(false)
const uploading = ref(false)
const saving = ref(false)
const regenerating = ref(false)
const deleting = ref(false)
const markedIds = ref<number[]>([])
const error = ref<string | null>(null)
const notice = ref<{
  variant: 'success' | 'info' | 'warning' | 'danger'
  message: string
} | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
let loadObserver: IntersectionObserver | null = null

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

const hasMore = computed(() => fetched.value < total.value)
const filtersActive = computed(() => mediaFiltersActive(filters.value))
const markedCount = computed(() => markedIds.value.length)
let requestId = 0

function rememberMonth(iso: string) {
  const key = monthKey(iso, localUtcOffsetMinutes())
  if (!key || months.value.includes(key)) {
    return
  }
  months.value = [...months.value, key].sort((a, b) => b.localeCompare(a))
}

async function fetchPage(offset: number) {
  return $fetch<MediaLibraryPage<MediaItem>>('/api/_katecms/media', {
    query: mediaLibraryQuery(filters.value, { limit: PAGE_SIZE, offset }),
  })
}

async function load(options?: { silent?: boolean }) {
  const id = ++requestId
    if (!options?.silent) {
      loading.value = true
      error.value = null
      items.value = []
      fetched.value = 0
      markedIds.value = []
    }
  try {
    const res = await fetchPage(0)
    if (id !== requestId) {
      return
    }
    total.value = res.total
    fetched.value = res.media.length
    months.value = res.months
    items.value = res.media
    pruneMarked()
    if (selected.value) {
      selected.value = items.value.find(entry => entry.id === selected.value?.id) ?? selected.value
    }
    pollVariants(res.media.filter(item => item.variants_status === 'pending').map(item => item.id))
  }
  catch (err) {
    if (id === requestId) {
      error.value = errMessage(err, 'Could not load the media library.')
    }
  }
  finally {
    if (id === requestId && !options?.silent) {
      loading.value = false
    }
  }
}

async function onLibraryFilters(next: MediaLibraryFilterState) {
  filters.value = normalizeMediaLibraryFilters(next)
  await load()
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) {
    return
  }
  const id = requestId
  loadingMore.value = true
  try {
    const res = await fetchPage(fetched.value)
    if (id !== requestId) {
      return
    }
    total.value = res.total
    if (!res.media.length) {
      fetched.value = total.value
      return
    }
    fetched.value += res.media.length
    const seen = new Set(items.value.map(item => item.id))
    const next = res.media.filter(item => !seen.has(item.id))
    if (!next.length && fetched.value >= total.value) {
      return
    }
    items.value = [...items.value, ...next]
    pruneMarked()
    pollVariants(next.filter(item => item.variants_status === 'pending').map(item => item.id))
  }
  catch (err) {
    if (id === requestId) {
      error.value = errMessage(err, 'Could not load more files.')
    }
  }
  finally {
    loadingMore.value = false
  }
  void nextTick(() => {
    const root = scroller.value
    const target = sentinel.value
    if (!root || !target || !hasMore.value || loadingMore.value) {
      return
    }
    const rootRect = root.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (targetRect.top <= rootRect.bottom + 240) {
      void loadMore()
    }
  })
}

function stopLoadObserver() {
  loadObserver?.disconnect()
  loadObserver = null
}

function startLoadObserver() {
  stopLoadObserver()
  const root = scroller.value
  const target = sentinel.value
  if (!root || !target || !hasMore.value) {
    return
  }
  loadObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      void loadMore()
    }
  }, { root, rootMargin: '240px' })
  loadObserver.observe(target)
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
  let resort = false
  try {
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      const res = await $fetch<{ media: MediaItem }>('/api/_katecms/media', {
        method: 'POST',
        body: form,
      })
      if (mediaMatchesFilters(res.media, { ...filters.value, month: 'all' })) {
        rememberMonth(res.media.created_at)
      }
      if (mediaMatchesFilters(res.media, filters.value)) {
        if (filters.value.sort === 'date-desc') {
          items.value = [res.media, ...items.value.filter(entry => entry.id !== res.media.id)]
          total.value += 1
        }
        else {
          resort = true
        }
      }
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

  if (resort) {
    await load({ silent: true })
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
    const res = await $fetch<{ media: MediaItem }>(`/api/_katecms/media/${selected.value.id}`, {
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

function isMarked(id: number): boolean {
  return markedIds.value.includes(id)
}

function toggleMarked(id: number) {
  markedIds.value = isMarked(id)
    ? markedIds.value.filter(entry => entry !== id)
    : [...markedIds.value, id]
}

function pruneMarked() {
  const visible = new Set(items.value.map(item => item.id))
  markedIds.value = markedIds.value.filter(id => visible.has(id))
}

function dropDeleted(ids: number[]) {
  if (!ids.length) {
    return
  }
  const removed = new Set(ids)
  items.value = items.value.filter(entry => !removed.has(entry.id))
  markedIds.value = markedIds.value.filter(id => !removed.has(id))
  total.value = Math.max(0, total.value - ids.length)
  fetched.value = Math.max(0, fetched.value - ids.length)
  if (selected.value && removed.has(selected.value.id)) {
    closeEditor()
  }
}

async function remove(item: MediaItem) {
  if (!confirm(`Delete “${item.filename}”?`)) {
    return
  }
  error.value = null
  try {
    await $fetch(`/api/_katecms/media/${item.id}`, { method: 'DELETE' })
    dropDeleted([item.id])
  }
  catch (err) {
    error.value = errMessage(err, 'Could not delete the file.')
  }
}

async function removeMarked() {
  const ids = markedIds.value.slice()
  if (!ids.length || deleting.value) {
    return
  }
  const label = ids.length === 1 ? 'Delete 1 file?' : `Delete ${ids.length} files?`
  if (!confirm(label)) {
    return
  }
  deleting.value = true
  error.value = null
  const failed: number[] = []
  await Promise.all(ids.map(async (id) => {
    try {
      await $fetch(`/api/_katecms/media/${id}`, { method: 'DELETE' })
    }
    catch {
      failed.push(id)
    }
  }))
  const failedSet = new Set(failed)
  dropDeleted(ids.filter(id => !failedSet.has(id)))
  if (failed.length) {
    error.value = failed.length === 1
      ? 'Could not delete 1 file.'
      : `Could not delete ${failed.length} files.`
  }
  deleting.value = false
  if (!items.value.length && hasMore.value) {
    await load()
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
    const res = await $fetch<{ count: number }>('/api/_katecms/media/regenerate', { method: 'POST' })
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
    const res = await $fetch<{ media: MediaItem }>(`/api/_katecms/media/${item.id}/regenerate`, {
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
})
onBeforeUnmount(stopLoadObserver)
watch([scroller, sentinel, hasMore], () => {
  void nextTick(startLoadObserver)
})
</script>

<template>
  <div :class="rootClass">
    <KateCmsAdminHeader
      title="Media library"
      :count="total === 1 ? '1 item' : `${total} items`"
    >
      <input
        ref="fileInput"
        type="file"
        :class="`${rootClass}__file`"
        multiple
        @change="onFilesSelected"
      >
      <KateCmsUiButton
        v-if="markedCount"
        tag="button"
        variant="red"
        :disabled="deleting"
        @click="removeMarked"
      >
        {{ deleting ? 'Deleting…' : `Delete selected (${markedCount})` }}
      </KateCmsUiButton>
      <KateCmsUiButton
        tag="button"
        variant="secondary"
        :disabled="regenerating || !items.length"
        title="Regenerate image variants from the current media config"
        @click="regenerateAll"
      >
        {{ regenerating ? 'Regenerating…' : 'Regenerate' }}
      </KateCmsUiButton>
      <KateCmsUiButton
        tag="button"
        :disabled="uploading"
        @click="fileInput?.click()"
      >
        {{ uploading ? 'Uploading…' : 'Upload files' }}
      </KateCmsUiButton>
    </KateCmsAdminHeader>

    <KateCmsMediaLibraryFilters
      :filters="filters"
      :months="months"
      id-prefix="library"
      :class="`${rootClass}__filters`"
      @update:filters="onLibraryFilters"
    />

    <KateCmsUiNotice
      v-if="notice"
      placement="fixed"
      :variant="notice.variant"
      :message="notice.message"
      @close="notice = null"
    />
    <KateCmsUiNotice
      v-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = null"
    />
    <KateCmsUiNotice
      v-if="loading"
      placement="static"
      variant="info"
      message="Loading…"
      :closable="false"
    />
    <KateCmsUiNotice
      v-else-if="!items.length && !error"
      placement="static"
      variant="info"
      :message="filtersActive ? 'No files match.' : 'No files yet. Upload the first one.'"
      :closable="false"
    />

    <div
      v-else-if="items.length"
      ref="scroller"
      :class="`${rootClass}__scroller`"
    >
      <div :class="`${rootClass}__grid`">
        <div
          v-for="item in items"
          :key="item.id"
          :class="[`${rootClass}__card`, { 'is-marked': isMarked(item.id) }]"
        >
          <label :class="`${rootClass}__check`">
            <input
              type="checkbox"
              :checked="isMarked(item.id)"
              :aria-label="`Select ${item.filename}`"
              @change="toggleMarked(item.id)"
            >
          </label>
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
          <KateCmsUiButton
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
          </KateCmsUiButton>
        </div>
      </div>
      <div
        v-if="hasMore"
        ref="sentinel"
        :class="`${rootClass}__more`"
      >
        {{ loadingMore ? 'Loading…' : '' }}
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
          <KateCmsUiButton
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
          </KateCmsUiButton>
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
                <div :class="`${rootClass}__term`">
                  Uploaded
                </div>
                <div :class="`${rootClass}__def`">
                  {{ formatDate(selected.created_at) }}
                </div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">
                  Author
                </div>
                <div :class="`${rootClass}__def`">
                  {{ selected.uploaded_by_name || '—' }}
                </div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">
                  File name
                </div>
                <div :class="`${rootClass}__def`">
                  {{ selected.filename }}
                </div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">
                  Type
                </div>
                <div :class="`${rootClass}__def`">
                  {{ selected.mime_type }}
                </div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">
                  Size
                </div>
                <div :class="`${rootClass}__def`">
                  {{ formatSize(selected.filesize) }}
                </div>
              </div>
              <div
                v-if="selected.width && selected.height"
                :class="`${rootClass}__row`"
              >
                <div :class="`${rootClass}__term`">
                  Dimensions
                </div>
                <div :class="`${rootClass}__def`">
                  {{ selected.width }} × {{ selected.height }} px
                </div>
              </div>
              <div :class="`${rootClass}__row`">
                <div :class="`${rootClass}__term`">
                  URL
                </div>
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
                <div :class="`${rootClass}__term`">
                  Variants
                </div>
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
              <KateCmsFieldWrapper
                field-key="katecms-media-alt"
                :field="altField"
              >
                <KateCmsInputControl
                  v-model="editAlt"
                  field-key="katecms-media-alt"
                />
              </KateCmsFieldWrapper>

              <KateCmsTextareaField
                v-model="editCaption"
                field-key="katecms-media-caption"
                :field="captionField"
              />

              <KateCmsUiButton
                tag="button"
                type="submit"
                :disabled="saving"
              >
                {{ saving ? 'Saving…' : 'Save' }}
              </KateCmsUiButton>
            </form>

            <KateCmsUiButton
              v-if="isImageMedia(selected)"
              tag="button"
              variant="secondary"
              :disabled="selected.variants_status === 'pending'"
              @click="regenerateOne(selected)"
            >
              {{ selected.variants_status === 'pending' ? 'Processing…' : 'Regenerate variants' }}
            </KateCmsUiButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-media';

@include katecms-wrapper {
  #{$root} {
    display: flex;
    flex: 1;
    flex-direction: column;
    //gap: math-rem(16);
    min-height: 0;
    overflow: hidden;
    padding: 0 math-rem(8);

    &__file {
      display: none;
    }

    &__filters {
      position: relative;
      z-index: 2;
      margin-bottom: math-rem(8);
    }

    &__scroller {
      flex: 1;
      min-height: 0;
      padding: 0 0 math-rem(8);
      overflow: auto;
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(math-rem(160), 1fr));
      gap: math-rem(16);
      align-content: start;
    }

    &__more {
      min-height: math-rem(32);
      padding: math-rem(8) 0;
      color: $color-muted;
      font-size: math-rem(13);
      text-align: center;
    }

    &__card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
      box-shadow: $shadow-sm;

      &.is-marked {
        border-color: $color-accent;
        box-shadow: 0 0 0 1px $color-accent;
      }

      :deep(.katecms-btn) {
        width: calc(100% - #{math-rem(16)});
        margin: 0 math-rem(8) math-rem(8);
      }
    }

    &__check {
      position: absolute;
      z-index: 1;
      top: math-rem(8);
      left: math-rem(8);
      display: flex;
      align-items: center;
      justify-content: center;
      width: math-rem(28);
      height: math-rem(28);
      margin: 0;
      border-radius: $border-radius;
      background: color-alpha($color-surface, 0.92);
      box-shadow: $shadow-sm;
      cursor: pointer;

      input {
        width: math-rem(16);
        height: math-rem(16);
        margin: 0;
        accent-color: $color-accent;
        cursor: pointer;
      }
    }

    &__thumb {
      position: relative;
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 100%;
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
      background: $color-overlay;
      color: $color-on-accent;
      font-size: math-rem(12);
      font-weight: 600;
    }

    &__spinner {
      width: math-rem(14);
      height: math-rem(14);
      border: 2px solid color-alpha($color-on-accent, 0.4);
      border-top-color: $color-on-accent;
      border-radius: 50%;
      animation: katecms-media-spin 0.7s linear infinite;
    }

    @keyframes katecms-media-spin {
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
      background: $color-overlay;
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
