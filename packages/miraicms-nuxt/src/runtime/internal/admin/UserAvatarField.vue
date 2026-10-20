<script setup lang="ts">
import { computed, ref } from 'vue'
import { $fetch } from '#imports'
import { isImageMedia } from '@miraicms/core'
import type { MediaItem } from '@miraicms/core'
import { avatarSrc } from '../../utils/admin-users'
import { useMediaLibrary } from '../../composables/useMediaLibrary'
import type { MediaLibraryFilterState } from '../../utils/media-library-query'

/** Bound avatar media item (`null` when cleared / not set). */
const model = defineModel<MediaItem | null>({ default: null })

const rootClass = 'miraicms-user-avatar-field'

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
} = useMediaLibrary(() => isImageMedia, { baseType: 'image' })
const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

const previewUrl = computed(() => avatarSrc(model.value))

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
        :variant="['secondary', 'small', 'icon']"
        :aria-label="model ? 'Change' : 'Choose avatar'"
        :title="model ? 'Change' : 'Choose avatar'"
        @click="openModal"
      >
        <svg
          data-v-b9a9df7f=""
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        ><path
          data-v-b9a9df7f=""
          d="M6.00033 4.66406H4.00033C3.6467 4.66406 3.30756 4.80454 3.05752 5.05459C2.80747 5.30464 2.66699 5.64377 2.66699 5.9974V11.9974C2.66699 12.351 2.80747 12.6902 3.05752 12.9402C3.30756 13.1903 3.6467 13.3307 4.00033 13.3307H10.0003C10.3539 13.3307 10.6931 13.1903 10.9431 12.9402C11.1932 12.6902 11.3337 12.351 11.3337 11.9974V9.9974"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        /><path
          data-v-b9a9df7f=""
          d="M6 9.99885H8L13.6667 4.33218C13.9319 4.06697 14.0809 3.70726 14.0809 3.33218C14.0809 2.95711 13.9319 2.5974 13.6667 2.33218C13.4015 2.06697 13.0417 1.91797 12.6667 1.91797C12.2916 1.91797 11.9319 2.06697 11.6667 2.33218L6 7.99885V9.99885Z"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        /><path
          data-v-b9a9df7f=""
          d="M10.667 3.33203L12.667 5.33203"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        /></svg>
      </MiraiCmsUiButton>
      <MiraiCmsUiButton
        v-if="model"
        tag="button"
        :variant="['red', 'small', 'icon']"
        aria-label="Remove"
        title="Remove"
        @click="clearAvatar"
      >
        <svg
          data-v-b9a9df7f=""
          data-v-e86d7870=""
          data-v-dc89e617=""
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        ><path
          data-v-b9a9df7f=""
          data-v-e86d7870=""
          data-v-dc89e617=""
          d="M3 5.25H15"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke="currentColor"
        /><path
          data-v-b9a9df7f=""
          data-v-e86d7870=""
          data-v-dc89e617=""
          d="M7.5 8.25V12.75"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke="currentColor"
        /><path
          data-v-b9a9df7f=""
          data-v-e86d7870=""
          data-v-dc89e617=""
          d="M10.5 8.25V12.75"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke="currentColor"
        /><path
          data-v-b9a9df7f=""
          data-v-e86d7870=""
          data-v-dc89e617=""
          d="M3.75 5.25L4.5 14.25C4.5 14.6478 4.65804 15.0294 4.93934 15.3107C5.22064 15.592 5.60218 15.75 6 15.75H12C12.3978 15.75 12.7794 15.592 13.0607 15.3107C13.342 15.0294 13.5 14.6478 13.5 14.25L14.25 5.25"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke="currentColor"
        /><path
          data-v-b9a9df7f=""
          data-v-e86d7870=""
          data-v-dc89e617=""
          d="M6.75 5.25V3C6.75 2.80109 6.82902 2.61032 6.96967 2.46967C7.11032 2.32902 7.30109 2.25 7.5 2.25H10.5C10.6989 2.25 10.8897 2.32902 11.0303 2.46967C11.171 2.61032 11.25 2.80109 11.25 3V5.25"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke="currentColor"
        /></svg>
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
      :filters="filters"
      :months="months"
      :error="error"
      :uploading="uploading"
      @close="closeModal"
      @choose="choose"
      @upload="triggerUpload"
      @load-more="onLoadMore"
      @update:filters="onLibraryFilters"
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
