<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Field, MediaItem } from '@katecms/core'
import { isMediaItem } from '@katecms/core'
import { useMediaLibrary } from '../../composables/useMediaLibrary'
import type { MediaLibraryFilterState } from '../../utils/media-library-query'

type GalleryFieldConfig = Extract<Field, { type: 'gallery' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: GalleryFieldConfig
}>(), {
  field: () => ({ type: 'gallery', label: '' }),
})

const model = defineModel<unknown>({ default: () => [] })

const rootClass = 'katecms-gallery-field'
const returnFormat = computed(() => props.field?.returnFormat || 'array')
const insertMode = computed(() => props.field?.insert || 'append')
const previewSize = computed(() => props.field?.previewSize || 'thumbnail')
const libraryEnabled = computed(() => props.field?.library !== 'uploadedTo')

const minCount = computed(() => props.field?.min ?? 0)
const maxCount = computed(() => props.field?.max)

const items = ref<MediaItem[]>([])

const count = computed(() => items.value.length)
const canAdd = computed(() => maxCount.value == null || count.value < maxCount.value)
const remainingSlots = computed(() =>
  maxCount.value == null ? Infinity : Math.max(0, maxCount.value - count.value),
)

const mimeTokens = computed(() =>
  (props.field?.mimeTypes || '')
    .split(/[\s,]+/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean),
)

const acceptAttr = computed(() => {
  if (!mimeTokens.value.length) {
    return 'image/*'
  }
  return mimeTokens.value.map(t => (t.includes('/') ? t : `.${t.replace(/^\./, '')}`)).join(',')
})

const selectedIds = computed(() =>
  items.value.map(item => item.id).filter((id): id is number => typeof id === 'number'),
)

function previewUrl(item: MediaItem): string {
  const size = previewSize.value
  const variant = item.variants?.find(v => v.size === size)
    || (size !== 'thumbnail' ? item.variants?.find(v => v.size === 'thumbnail') : undefined)
  return variant?.url || item.url
}

function syncModel() {
  if (returnFormat.value === 'url') {
    model.value = items.value.map(item => item.url)
  }
  else if (returnFormat.value === 'id') {
    model.value = items.value.map(item => item.id)
  }
  else {
    model.value = items.value.map(item => ({ ...item }))
  }
}

function hasItem(item: MediaItem): boolean {
  if (typeof item.id === 'number') {
    return items.value.some(existing => existing.id === item.id)
  }
  return items.value.some(existing => existing.url === item.url)
}

function addItems(newItems: MediaItem[]) {
  const unique = newItems.filter(item => !hasItem(item))
  const limited = unique.slice(0, remainingSlots.value)
  if (!limited.length) {
    return
  }
  if (insertMode.value === 'prepend') {
    items.value = [...limited, ...items.value]
  }
  else {
    items.value = [...items.value, ...limited]
  }
  syncModel()
}

function removeAt(index: number) {
  items.value = items.value.filter((_, i) => i !== index)
  syncModel()
}

function clearAll() {
  items.value = []
  syncModel()
}

function readImageSize(blob: Blob): Promise<{ width: number, height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load error'))
    }
    img.src = url
  })
}

function matchesMime(mime: string, filename: string): boolean {
  if (!mime.startsWith('image/')) {
    return false
  }
  if (!mimeTokens.value.length) {
    return true
  }
  const subtype = mime.split('/')[1] || ''
  const name = filename.toLowerCase()
  return mimeTokens.value.some((token) => {
    if (token.includes('/')) {
      return token.endsWith('/*') ? mime.startsWith(token.slice(0, -1)) : mime === token
    }
    return subtype === token || name.endsWith(`.${token}`)
  })
}

function validateBasic(mime: string, filename: string, sizeBytes: number): string | null {
  const field = props.field
  if (!matchesMime(mime, filename)) {
    return field?.mimeTypes
      ? `Invalid file type. Allowed: ${field.mimeTypes}.`
      : 'Only image files are allowed.'
  }
  const mb = sizeBytes / (1024 * 1024)
  if (field?.maxSize && mb > field.maxSize) {
    return `File is larger than ${field.maxSize} MB.`
  }
  if (field?.minSize && mb < field.minSize) {
    return `File is smaller than ${field.minSize} MB.`
  }
  return null
}

function validateDimensions(width: number, height: number): string | null {
  const field = props.field
  if (field?.minWidth && width < field.minWidth) {
    return `Width is less than ${field.minWidth}px.`
  }
  if (field?.minHeight && height < field.minHeight) {
    return `Height is less than ${field.minHeight}px.`
  }
  if (field?.maxWidth && width > field.maxWidth) {
    return `Width is greater than ${field.maxWidth}px.`
  }
  if (field?.maxHeight && height > field.maxHeight) {
    return `Height is greater than ${field.maxHeight}px.`
  }
  return null
}

function maxReachedMessage() {
  return maxCount.value != null ? `Maximum images: ${maxCount.value}.` : null
}

const open = ref(false)
const {
  items: library,
  loading,
  loadingMore,
  hasMore,
  filters,
  months,
  load: loadLibrary,
  loadMore,
  applyFilters,
  prepend: prependLibrary,
  replace: replaceLibrary,
} = useMediaLibrary(() => item => matchesMime(item.mime_type, item.filename), { baseType: 'image' })
const error = ref<string | null>(null)
const uploading = ref(false)
const processing = ref(false)

async function fetchLibrary() {
  error.value = null
  try {
    await loadLibrary({ resetFilters: true })
  }
  catch {
    error.value = 'Could not load the media library.'
  }
}

async function onLibraryFilters(next: MediaLibraryFilterState) {
  error.value = null
  try {
    await applyFilters(next)
  }
  catch {
    error.value = 'Could not load the media library.'
  }
}

async function onLoadMore() {
  try {
    await loadMore()
  }
  catch {
    error.value = 'Could not load more files.'
  }
}

function openModal() {
  if (!canAdd.value) {
    error.value = maxReachedMessage()
    return
  }
  open.value = true
  error.value = null
  if (libraryEnabled.value) {
    fetchLibrary()
  }
}

function closeModal() {
  if (processing.value) {
    return
  }
  open.value = false
}

async function uploadFile(file: File | Blob, filename: string): Promise<MediaItem> {
  const form = new FormData()
  form.append('file', file, filename)
  const data = await $fetch<{ media: MediaItem }>('/api/_katecms/media', {
    method: 'POST',
    body: form,
  })
  return data.media
}

async function waitUntilReady(item: MediaItem): Promise<MediaItem> {
  if (item.variants_status !== 'pending') {
    return item
  }
  const maxAttempts = 60
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    try {
      const data = await $fetch<{ media: MediaItem }>(`/api/_katecms/media/${item.id}`)
      if (data.media.variants_status !== 'pending') {
        return data.media
      }
    }
    catch {
      // Keep polling on a temporary error.
    }
  }
  return item
}

async function finalizeItems(newItems: MediaItem[]) {
  for (const item of newItems) {
    if (!library.value.some(m => m.id === item.id)) {
      prependLibrary(item)
    }
  }

  let readyItems = newItems
  if (returnFormat.value === 'array') {
    const pending = newItems.filter(item => item.variants_status === 'pending')
    if (pending.length) {
      processing.value = true
      try {
        readyItems = await Promise.all(
          newItems.map(async (item) => {
            if (item.variants_status !== 'pending') {
              return item
            }
            const ready = await waitUntilReady(item)
            replaceLibrary(ready)
            return ready
          }),
        )
      }
      finally {
        processing.value = false
      }
    }
  }

  addItems(readyItems)
  open.value = false
}

function onConfirm(selected: MediaItem[]) {
  error.value = null
  const invalid = selected.find(item => validateDimensions(item.width ?? 0, item.height ?? 0))
  if (invalid) {
    error.value = validateDimensions(invalid.width ?? 0, invalid.height ?? 0)
    return
  }
  finalizeItems(selected)
}

const fileInput = ref<HTMLInputElement>()

function triggerUpload() {
  if (!canAdd.value) {
    error.value = maxReachedMessage()
    return
  }
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) {
    return
  }
  error.value = null

  const toUpload = files.slice(0, remainingSlots.value)
  if (!toUpload.length) {
    error.value = maxReachedMessage()
    return
  }

  const uploaded: MediaItem[] = []
  uploading.value = true
  try {
    for (const file of toUpload) {
      const basicError = validateBasic(file.type, file.name, file.size)
      if (basicError) {
        error.value = basicError
        continue
      }
      try {
        const size = await readImageSize(file)
        const dimError = validateDimensions(size.width, size.height)
        if (dimError) {
          error.value = dimError
          continue
        }
      }
      catch {
        error.value = 'Could not read the image.'
        continue
      }
      try {
        const item = await uploadFile(file, file.name)
        uploaded.push(item)
      }
      catch {
        error.value = 'Could not upload the file.'
      }
    }
    if (uploaded.length) {
      await finalizeItems(uploaded)
    }
  }
  finally {
    uploading.value = false
  }
}

const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (dragIndex.value === null || dragIndex.value === index) {
    dropIndex.value = null
    return
  }
  dropIndex.value = index
}

function onDragLeave(index: number) {
  if (dropIndex.value === index) {
    dropIndex.value = null
  }
}

function onDrop(index: number, event: DragEvent) {
  event.preventDefault()
  const from = dragIndex.value
  dragIndex.value = null
  dropIndex.value = null
  if (from === null || from === index) {
    return
  }
  const next = [...items.value]
  const [moved] = next.splice(from, 1)
  if (!moved) {
    return
  }
  next.splice(index, 0, moved)
  items.value = next
  syncModel()
}

function onDragEnd() {
  dragIndex.value = null
  dropIndex.value = null
}

async function restoreFromModel() {
  const value = model.value
  if (!Array.isArray(value) || !value.length) {
    items.value = []
    return
  }

  if (value.every(isMediaItem)) {
    items.value = value as MediaItem[]
    return
  }

  if (value.every(v => typeof v === 'string')) {
    items.value = (value as string[]).map(url => ({ url } as MediaItem))
    return
  }

  if (value.every(v => typeof v === 'number')) {
    try {
      const rows = await Promise.all((value as number[]).map(async (id) => {
        try {
          const data = await $fetch<{ media: MediaItem }>(`/api/_katecms/media/${id}`)
          return data.media
        }
        catch {
          return null
        }
      }))
      items.value = rows.filter((item): item is MediaItem => item != null)
    }
    catch {
      // Keep the model value without a preview.
    }
  }
}

onMounted(restoreFromModel)
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div
        v-if="items.length"
        :class="`${rootClass}__grid`"
      >
        <div
          v-for="(item, index) in items"
          :key="item.id ?? `${item.url}-${index}`"
          :class="[
            `${rootClass}__item`,
            {
              'is-dragging': dragIndex === index,
              'is-drop-target': dropIndex === index,
            },
          ]"
          draggable="true"
          @dragstart="onDragStart(index, $event)"
          @dragover="onDragOver(index, $event)"
          @dragleave="onDragLeave(index)"
          @drop="onDrop(index, $event)"
          @dragend="onDragEnd"
        >
          <img
            :src="previewUrl(item)"
            :alt="item.alt || ''"
            :class="`${rootClass}__image`"
          >
          <div
            :class="`${rootClass}__remove`"
            @mousedown.stop
            @dragstart.stop.prevent
          >
            <KateCmsUiButton
              tag="button"
              :variant="['red', 'small', 'icon']"
              aria-label="Remove image"
              title="Remove"
              @click.stop="removeAt(index)"
            >
              <svg
                data-v-6c98a35a=""
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                fill="currentColor"
              ><path
                data-v-6c98a35a=""
                d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"
              /></svg>
            </KateCmsUiButton>
          </div>
        </div>
      </div>

      <div :class="`${rootClass}__toolbar`">
        <KateCmsUiButton
          tag="button"
          :disabled="!canAdd"
          @click="openModal"
        >
          Add Images
        </KateCmsUiButton>

        <KateCmsUiButton
          v-if="items.length"
          tag="button"
          variant="red"
          @click="clearAll"
        >
          Clear
        </KateCmsUiButton>

        <span
          v-if="maxCount != null || minCount > 0"
          :class="`${rootClass}__counter`"
        >
          {{ count }}{{ maxCount != null ? ` / ${maxCount}` : '' }}
          <template v-if="minCount > 0">
            (min {{ minCount }})
          </template>
        </span>
      </div>

      <div
        v-if="error && !open"
        :class="`${rootClass}__error`"
      >
        {{ error }}
      </div>

      <input
        :id="fieldKey"
        ref="fileInput"
        type="file"
        :accept="acceptAttr"
        multiple
        hidden
        @change="onFileChange"
      >

      <KateCmsMediaLibraryModal
        :open="open"
        media-kind="image"
        multiple
        :library-enabled="libraryEnabled"
        :library="library"
        :selected-ids="selectedIds"
        :loading="loading"
        :loading-more="loadingMore"
        :has-more="hasMore"
        :filters="filters"
        :months="months"
        :error="error"
        :uploading="uploading"
        :processing="processing"
        @close="closeModal"
        @confirm="onConfirm"
        @upload="triggerUpload"
        @load-more="onLoadMore"
        @update:filters="onLibraryFilters"
      />
    </div>
  </KateCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-gallery-field';

#{$root} {
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: math-rem(8);
    margin-bottom: math-rem(12);
    padding: math-rem(8);
    border: 1px solid $color-border;
    border-radius: $border-radius;
  }

  &__item {
    position: relative;
    aspect-ratio: 1 / 1;
    border: 2px solid $color-border;
    border-radius: $border-radius;
    overflow: hidden;
    background-color: $color-bg;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    &.is-dragging {
      opacity: .45;
    }

    &.is-drop-target {
      border-color: $color-accent;
    }

    &:hover {
      #{$root}__remove {
        opacity: 1;
        visibility: visible;
      }
    }
  }

  &__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  &__remove {
    position: absolute;
    top: math-rem(6);
    right: math-rem(6);
    opacity: 0;
    visibility: hidden;
    transition: opacity .2s, visibility .2s;
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: math-rem(8);
  }

  &__counter {
    font-size: math-rem(12);
    color: $color-muted;
  }

  &__error {
    margin-top: math-rem(8);
    color: $color-danger;
    font-size: math-rem(13);
  }
}
</style>
