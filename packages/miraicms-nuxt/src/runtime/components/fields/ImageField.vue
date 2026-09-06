<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Field, MediaItem } from '@miraicms/core'
import { isMediaItem } from '@miraicms/core'

type ImageFieldConfig = Extract<Field, { type: 'image' }>
type CropSource = { kind: 'library', item: MediaItem } | { kind: 'file', file: File }

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: ImageFieldConfig
}>(), {
  field: () => ({ type: 'image', label: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-image-field'
const returnFormat = computed(() => props.field?.returnFormat || 'array')
const libraryEnabled = computed(() => props.field?.library !== 'uploadedTo')

const cropEnabled = computed(() => {
  const crop = props.field?.cropType
  return crop === true || (Array.isArray(crop) && !!crop[0] && !!crop[1])
})

const cropAspect = computed<number | undefined>(() => {
  const crop = props.field?.cropType
  return Array.isArray(crop) && crop[0] && crop[1] ? crop[0] / crop[1] : undefined
})

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

const selected = ref<MediaItem | null>(null)
const previewUrl = computed(() => (selected.value ? selected.value.url : ''))
const hasValue = computed(() => selected.value !== null)

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
  if (cropping.value) {
    cancelCrop()
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

const cropping = ref(false)
const cropSrc = ref('')
let cropObjectUrl: string | null = null
let cropOutName = 'image.png'
let cropOutMime = 'image/png'
let cropSource: CropSource | null = null

function beginCrop(src: string, filename: string, mime: string) {
  cropSrc.value = src
  cropOutName = filename
  cropOutMime = mime
  cropping.value = true
}

function revokeCropUrl() {
  if (cropObjectUrl) {
    URL.revokeObjectURL(cropObjectUrl)
    cropObjectUrl = null
  }
}

function cancelCrop() {
  cropping.value = false
  cropSrc.value = ''
  revokeCropUrl()
}

async function onCropConfirm(blob: Blob | null) {
  cropping.value = false
  revokeCropUrl()
  const source = cropSource
  cropSource = null
  error.value = null

  if (blob === null) {
    if (!source) {
      cropSrc.value = ''
      return
    }
    if (source.kind === 'library') {
      const dimError = validateDimensions(source.item.width ?? 0, source.item.height ?? 0)
      if (dimError) {
        error.value = dimError
        cropSrc.value = ''
        return
      }
      applySelection(source.item)
      closeModal()
      cropSrc.value = ''
      return
    }
    uploading.value = true
    try {
      const size = await readImageSize(source.file)
      const dimError = validateDimensions(size.width, size.height)
      if (dimError) {
        error.value = dimError
        return
      }
      const item = await uploadFile(source.file, source.file.name)
      await finalize(item)
    }
    catch {
      error.value = 'Could not upload the file.'
    }
    finally {
      uploading.value = false
      cropSrc.value = ''
    }
    return
  }

  uploading.value = true
  try {
    const size = await readImageSize(blob)
    const dimError = validateDimensions(size.width, size.height)
    if (dimError) {
      error.value = dimError
      return
    }
    const item = await uploadFile(blob, cropOutName)
    await finalize(item)
  }
  catch {
    error.value = 'Could not save the cropped image.'
  }
  finally {
    uploading.value = false
    cropSrc.value = ''
  }
}

async function choose(item: MediaItem) {
  error.value = null
  if (cropEnabled.value) {
    cropSource = { kind: 'library', item }
    beginCrop(item.url, item.filename, item.mime_type)
    return
  }
  const dimError = validateDimensions(item.width ?? 0, item.height ?? 0)
  if (dimError) {
    error.value = dimError
    return
  }
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

  if (cropEnabled.value) {
    revokeCropUrl()
    cropObjectUrl = URL.createObjectURL(file)
    cropSource = { kind: 'file', file }
    beginCrop(cropObjectUrl, file.name, file.type)
    return
  }

  try {
    const size = await readImageSize(file)
    const dimError = validateDimensions(size.width, size.height)
    if (dimError) {
      error.value = dimError
      return
    }
  }
  catch {
    error.value = 'Could not read the image.'
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
onBeforeUnmount(revokeCropUrl)
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
          v-if="hasValue"
          :class="`${rootClass}__preview`"
        >
          <img
            :src="previewUrl"
            :alt="selected?.alt || ''"
            :class="`${rootClass}__image`"
          >
          <div :class="`${rootClass}__actions`">
            <MiraiCmsUiButton
              tag="button"
              :variant="['secondary', 'small']"
              @click="openModal"
            >
              Replace
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              tag="button"
              :variant="['red', 'small']"
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
          Add Image
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
        media-kind="image"
        :library-enabled="libraryEnabled"
        :library="library"
        :selected-id="selected?.id"
        :loading="loading"
        :error="error"
        :uploading="uploading"
        :processing="processing"
        :cropping="cropping"
        @close="closeModal"
        @choose="choose"
        @upload="triggerUpload"
      >
        <MiraiCmsImageCropper
          :src="cropSrc"
          :aspect="cropAspect"
          :mime="cropOutMime"
          @confirm="onCropConfirm"
          @cancel="cancelCrop"
        />
      </MiraiCmsMediaLibraryModal>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-image-field';

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
