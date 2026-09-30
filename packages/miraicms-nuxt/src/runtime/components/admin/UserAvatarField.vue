<script setup lang="ts">
import { computed, ref } from 'vue'
import { $fetch } from '#imports'
import { isImageMedia } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { avatarSrc } from '../../utils/admin-users'
import { useMediaLibrary } from '../../composables/useMediaLibrary'

/** Bound avatar media item (`null` when cleared / not set). */
const model = defineModel<MediaItem | null>({ default: null })

const rootClass = 'miraicms-user-avatar-field'

const open = ref(false)
const {
  items: library,
  loading,
  loadingMore,
  hasMore,
  load: loadLibrary,
  loadMore,
  prepend: prependLibrary,
} = useMediaLibrary(() => isImageMedia)
const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

const previewUrl = computed(() => avatarSrc(model.value))

async function fetchLibrary() {
  error.value = null
  try {
    await loadLibrary()
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
  open.value = true
  error.value = null
  fetchLibrary()
}

function closeModal() {
  if (uploading.value) {
    return
  }
  open.value = false
}

function applyAvatar(item: MediaItem | null) {
  model.value = item
  open.value = false
}

function choose(item: MediaItem) {
  applyAvatar(item)
}

function clearAvatar() {
  model.value = null
}

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

  uploading.value = true
  error.value = null
  try {
    const form = new FormData()
    form.append('file', file, file.name)
    const data = await $fetch<{ media: MediaItem }>('/api/_miraicms/media', {
      method: 'POST',
      body: form,
    })
    prependLibrary(data.media)
    applyAvatar(data.media)
  }
  catch {
    error.value = 'Could not upload the image.'
  }
  finally {
    uploading.value = false
  }
}
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__preview`">
      <img
        v-if="previewUrl"
        :src="previewUrl"
        :alt="model?.alt || ''"
        :class="`${rootClass}__image`"
      >
      <div
        v-else
        :class="`${rootClass}__placeholder`"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle
            cx="12"
            cy="8"
            r="4"
          />
        </svg>
      </div>
    </div>

    <div :class="`${rootClass}__actions`">
      <MiraiCmsUiButton
        tag="button"
        :variant="['secondary', 'small']"
        @click="openModal"
      >
        {{ model ? 'Change' : 'Choose avatar' }}
      </MiraiCmsUiButton>
      <MiraiCmsUiButton
        v-if="model"
        tag="button"
        :variant="['red', 'small']"
        @click="clearAvatar"
      >
        Remove
      </MiraiCmsUiButton>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      hidden
      @change="onFileChange"
    >

    <MiraiCmsMediaLibraryModal
      :open="open"
      media-kind="image"
      :library-enabled="true"
      :library="library"
      :selected-id="model?.id"
      :loading="loading"
      :loading-more="loadingMore"
      :has-more="hasMore"
      :error="error"
      :uploading="uploading"
      @close="closeModal"
      @choose="choose"
      @upload="triggerUpload"
      @load-more="onLoadMore"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-user-avatar-field';

#{$root} {
  display: flex;
  align-items: center;
  gap: math-rem(14);

  &__preview {
    flex-shrink: 0;
    width: math-rem(72);
    height: math-rem(72);
    border-radius: 50%;
    overflow: hidden;
    border: 1px solid $color-border;
    background: $color-bg;
  }

  &__image {
    display: block;
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: cover;
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: $color-muted;

    svg {
      width: math-rem(32);
      height: math-rem(32);
      max-width: none;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(8);
  }
}
</style>
