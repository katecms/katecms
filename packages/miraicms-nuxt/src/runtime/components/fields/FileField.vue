<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Field, MediaItem } from '@miraicms/core'

type FileFieldConfig = Extract<Field, { type: 'file' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: FileFieldConfig
}>(), {
  field: () => ({ type: 'file', label: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-file-field'
const returnFormat = computed(() => props.field?.returnFormat || 'array')
const libraryEnabled = computed(() => props.field?.library !== 'uploadedTo')

const mimeTokens = computed(() =>
  (props.field?.mimeTypes || '')
    .split(/[\s,]+/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean),
)

const acceptAttr = computed(() => {
  if (!mimeTokens.value.length) {
    return undefined
  }
  return mimeTokens.value.map(t => (t.includes('/') ? t : `.${t.replace(/^\./, '')}`)).join(',')
})

const selected = ref<MediaItem | null>(null)
const hasValue = computed(() => selected.value !== null)

function isImage(item: MediaItem): boolean {
  return item.mime_type?.startsWith('image/') ?? false
}

function thumbUrl(item: MediaItem) {
  const variant = item.variants?.find(v => v.size === 'thumbnail')
  return variant ? variant.url : item.url
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

function fileLabel(item: MediaItem): string {
  return item.filename || item.url.split('/').pop() || 'File'
}

function matchesMime(mime: string, filename: string): boolean {
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

function applySelection(item: MediaItem | null) {
  selected.value = item
  if (!item) {
    model.value = returnFormat.value === 'array' ? undefined : ''
    return
  }
  if (returnFormat.value === 'url') {
    model.value = item.url
  }
  else if (returnFormat.value === 'id') {
    model.value = item.id
  }
  else {
    model.value = item
  }
}

function validateBasic(mime: string, filename: string, sizeBytes: number): string | null {
  const field = props.field
  if (!matchesMime(mime, filename)) {
    return `Invalid file type. Allowed: ${field?.mimeTypes}.`
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

const open = ref(false)
const library = ref<MediaItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const uploading = ref(false)
const processing = ref(false)

async function fetchLibrary() {
  loading.value = true
  error.value = null
  try {
    const data = await $fetch<{ media: MediaItem[] }>('/api/_miraicms/media')
    library.value = data.media.filter(item => matchesMime(item.mime_type, item.filename))
  }
  catch {
    error.value = 'Could not load the media library.'
  }
  finally {
    loading.value = false
  }
}

function openModal() {
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
  const data = await $fetch<{ media: MediaItem }>('/api/_miraicms/media', {
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
      const data = await $fetch<{ media: MediaItem }>(`/api/_miraicms/media/${item.id}`)
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

async function finalize(item: MediaItem) {
  library.value.unshift(item)
  if (returnFormat.value === 'array' && item.variants_status === 'pending') {
    processing.value = true
    try {
      const ready = await waitUntilReady(item)
      const index = library.value.findIndex(m => m.id === ready.id)
      if (index >= 0) {
        library.value[index] = ready
      }
      applySelection(ready)
    }
    finally {
      processing.value = false
    }
  }
  else {
    applySelection(item)
  }
  open.value = false
}

function choose(item: MediaItem) {
  error.value = null
  applySelection(item)
  closeModal()
}

const fileInput = ref<HTMLInputElement>()

function triggerUpload() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  error.value = null

  const basicError = validateBasic(file.type, file.name, file.size)
  if (basicError) {
    error.value = basicError
    return
  }

  uploading.value = true
  try {
    const item = await uploadFile(file, file.name)
    await finalize(item)
  }
  catch {
    error.value = 'Could not upload the file.'
  }
  finally {
    uploading.value = false
  }
}

function remove() {
  applySelection(null)
}

function isMediaItem(value: unknown): value is MediaItem {
  return typeof value === 'object' && value !== null && 'url' in value
}

async function restoreFromModel() {
  const value = model.value
  if (value === undefined || value === null || value === '') {
    return
  }
  if (isMediaItem(value)) {
    selected.value = value
    return
  }
  if (typeof value === 'string') {
    selected.value = { url: value } as MediaItem
    return
  }
  if (typeof value === 'number') {
    try {
      const data = await $fetch<{ media: MediaItem }>(`/api/_miraicms/media/${value}`)
      selected.value = data.media
    }
    catch {
      // Keep the model value without a preview.
    }
  }
}

onMounted(restoreFromModel)
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div :class="`${rootClass}__control`">
        <div
          v-if="hasValue && selected"
          :class="`${rootClass}__preview`"
        >
          <img
            v-if="isImage(selected)"
            :src="thumbUrl(selected)"
            :alt="selected.alt || ''"
            :class="`${rootClass}__image`"
          >
          <div
            v-else
            :class="`${rootClass}__file`"
          >
            <span :class="`${rootClass}__file-icon`">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M304 112L192 112C183.2 112 176 119.2 176 128L176 512C176 520.8 183.2 528 192 528L448 528C456.8 528 464 520.8 464 512L464 272L376 272C336.2 272 304 239.8 304 200L304 112zM444.1 224L352 131.9L352 200C352 213.3 362.7 224 376 224L444.1 224zM128 128C128 92.7 156.7 64 192 64L325.5 64C342.5 64 358.8 70.7 370.8 82.7L493.3 205.3C505.3 217.3 512 233.6 512 250.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128z"
                />
              </svg>
            </span>
            <a
              :href="selected.url"
              target="_blank"
              rel="noopener noreferrer"
              :class="`${rootClass}__file-name`"
            >
              {{ fileLabel(selected) }}
            </a>
            <span
              v-if="selected.filesize"
              :class="`${rootClass}__file-meta`"
            >
              {{ formatSize(selected.filesize) }}
            </span>
          </div>
          <div :class="`${rootClass}__actions`">
            <MiraiCmsUiButton
              tag="button"
              :variant="['action', 'min']"
              @click="openModal"
            >
              Replace
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              tag="button"
              :variant="['remove', 'min']"
              @click="remove"
            >
              Remove
            </MiraiCmsUiButton>
          </div>
        </div>

        <MiraiCmsUiButton
          v-else
          tag="button"
          @click="openModal"
        >
          Add File
        </MiraiCmsUiButton>
      </div>

      <input
        :id="fieldKey"
        ref="fileInput"
        type="file"
        :accept="acceptAttr"
        hidden
        @change="onFileChange"
      >

      <MiraiCmsMediaLibraryModal
        :open="open"
        media-kind="file"
        :library-enabled="libraryEnabled"
        :library="library"
        :selected-id="selected?.id"
        :loading="loading"
        :error="error"
        :uploading="uploading"
        :processing="processing"
        @close="closeModal"
        @choose="choose"
        @upload="triggerUpload"
      />
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-file-field';

#{$root} {
  &__control {
    max-width: 100%;
  }

  &__preview {
    position: relative;
    width: 400px;
    height: auto;
    max-height: 400px;
    max-width: 100%;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    overflow: hidden;
    background-color: $color-bg;

    &:hover {
      #{$root} {
        &__actions {
          opacity: 1;
          visibility: visible;
        }
      }
    }
  }

  &__image {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 400px;
    object-fit: contain;
  }

  &__file {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: math-rem(6);
    padding: math-rem(20);
  }

  &__file-icon {
    display: block;
    width: 30px;
    height: 30px;

    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: $color-muted;
    }
  }

  &__file-name {
    color: $color-accent;
    text-decoration: none;
    word-break: break-all;

    &:hover {
      text-decoration: underline;
    }
  }

  &__file-meta {
    font-size: math-rem(12);
    color: $color-muted;
  }

  &__actions {
    position: absolute;
    right: math-rem(8);
    top: math-rem(8);
    display: flex;
    gap: math-rem(6);
    opacity: 0;
    visibility: hidden;
    transition: opacity .2s, visibility .2s;
  }
}
</style>
