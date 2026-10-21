<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { MediaItem } from '@miraicms/core'
import { isImageMedia as isImage } from '@miraicms/core'
import { defaultMediaLibraryFilters, mediaFiltersActive } from '../../utils/media-library-query'
import type { MediaLibraryFilterState } from '../../utils/media-library-query'

const props = withDefaults(defineProps<{
  open?: boolean
  mediaKind?: 'file' | 'image'
  libraryEnabled?: boolean
  library?: MediaItem[]
  selectedId?: number
  selectedIds?: number[]
  multiple?: boolean
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  filters?: MediaLibraryFilterState
  months?: string[]
  error?: string | null
  uploading?: boolean
  processing?: boolean
  cropping?: boolean
}>(), {
  open: false,
  mediaKind: 'file',
  libraryEnabled: true,
  library: () => [],
  selectedIds: () => [],
  multiple: false,
  loading: false,
  loadingMore: false,
  hasMore: false,
  filters: () => defaultMediaLibraryFilters(),
  months: () => [],
  error: null,
  uploading: false,
  processing: false,
  cropping: false,
})

const emit = defineEmits<{
  close: []
  choose: [item: MediaItem]
  confirm: [items: MediaItem[]]
  upload: []
  loadMore: []
  'update:filters': [filters: MediaLibraryFilterState]
}>()

const rootClass = 'miraicms-media-modal'
const pendingIds = ref<number[]>([])
const body = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
let loadObserver: IntersectionObserver | null = null

function stopLoadObserver() {
  loadObserver?.disconnect()
  loadObserver = null
}

function startLoadObserver() {
  stopLoadObserver()
  const root = body.value
  const target = sentinel.value
  if (!props.open || !root || !target || !props.hasMore) {
    return
  }
  loadObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      emit('loadMore')
    }
  }, { root, rootMargin: '160px' })
  loadObserver.observe(target)
}

watch([() => props.open, body, sentinel, () => props.hasMore], () => {
  void nextTick(startLoadObserver)
})

watch(() => props.loadingMore, (busy) => {
  if (busy || !props.open || !props.hasMore) {
    return
  }
  void nextTick(() => {
    const root = body.value
    const target = sentinel.value
    if (!root || !target) {
      return
    }
    const rootRect = root.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (targetRect.top <= rootRect.bottom + 160) {
      emit('loadMore')
    }
  })
})

onBeforeUnmount(stopLoadObserver)

watch(() => props.open, (isOpen) => {
  if (isOpen && props.multiple) {
    pendingIds.value = []
  }
})

const isImageKind = computed(() => props.mediaKind === 'image')

const title = computed(() => {
  if (props.libraryEnabled) {
    return 'Media library'
  }
  return isImageKind.value ? 'Upload image' : 'Upload file'
})

const processingText = computed(() =>
  isImageKind.value ? 'Processing image…' : 'Processing file…',
)

const noLibraryHint = computed(() =>
  isImageKind.value
    ? 'Picking from the library is disabled. Upload a new image.'
    : 'Picking from the library is disabled. Upload a new file.',
)

const emptyLibraryHint = computed(() =>
  mediaFiltersActive(props.filters)
    ? 'No files match.'
    : 'The library is empty. Upload the first file.',
)

const pendingCount = computed(() => pendingIds.value.length)

const confirmLabel = computed(() => `Add (${pendingCount.value})`)

function thumbUrl(item: MediaItem) {
  const variant = item.variants?.find(v => v.size === 'thumbnail')
  return variant ? variant.url : item.url
}

function fileLabel(item: MediaItem): string {
  return item.filename || item.url.split('/').pop() || 'File'
}

function isAlreadySelected(id: number): boolean {
  return props.selectedIds.includes(id)
}

function isPending(id: number): boolean {
  return pendingIds.value.includes(id)
}

function isHighlighted(item: MediaItem): boolean {
  if (props.multiple) {
    return isPending(item.id) || isAlreadySelected(item.id)
  }
  return props.selectedId === item.id
}

function onItemClick(item: MediaItem) {
  if (!props.multiple) {
    emit('choose', item)
    return
  }
  if (isAlreadySelected(item.id)) {
    return
  }
  if (isPending(item.id)) {
    pendingIds.value = pendingIds.value.filter(id => id !== item.id)
    return
  }
  pendingIds.value = [...pendingIds.value, item.id]
}

function confirmSelection() {
  const items = props.library.filter(item => pendingIds.value.includes(item.id))
  emit('confirm', items)
  pendingIds.value = []
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      :class="rootClass"
      @click.self="emit('close')"
    >
      <div :class="`${rootClass}__dialog`">
        <div :class="`${rootClass}__dialog-head`">
          <span :class="`${rootClass}__dialog-title`">
            {{ title }}
          </span>
          <MiraiCmsUiButton
            tag="button"
            :variant="['tertiary', 'small', 'icon']"
            aria-label="Close"
            @click="emit('close')"
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

        <MiraiCmsMediaLibraryFilters
          v-if="libraryEnabled && !cropping && !processing"
          :filters="filters"
          :months="months"
          id-prefix="picker"
          :class="`${rootClass}__filters`"
          @update:filters="emit('update:filters', $event)"
        />

        <div
          ref="body"
          :class="`${rootClass}__dialog-body`"
        >
          <div
            v-if="error"
            :class="`${rootClass}__error`"
          >
            {{ error }}
          </div>

          <div
            v-if="processing"
            :class="`${rootClass}__processing`"
          >
            <span :class="`${rootClass}__spinner`" />
            <span :class="`${rootClass}__processing-text`">{{ processingText }}</span>
          </div>

          <template v-else-if="cropping">
            <slot />
          </template>

          <template v-else>
            <div
              v-if="uploading"
              :class="`${rootClass}__hint`"
            >
              Uploading…
            </div>

            <template v-if="libraryEnabled">
              <div
                v-if="loading && !library.length"
                :class="`${rootClass}__hint`"
              >
                Loading…
              </div>
              <div
                v-else-if="!library.length && !hasMore"
                :class="`${rootClass}__hint`"
              >
                {{ emptyLibraryHint }}
              </div>
              <template v-else>
                <div :class="`${rootClass}__grid`">
                  <button
                    v-for="item in library"
                    :key="item.id"
                    type="button"
                    :class="[
                      `${rootClass}__grid-item`,
                      {
                        'is-selected': isHighlighted(item),
                        'is-disabled': multiple && isAlreadySelected(item.id),
                      },
                    ]"
                    :disabled="multiple && isAlreadySelected(item.id)"
                    @click="onItemClick(item)"
                  >
                    <img
                      v-if="isImage(item)"
                      :src="thumbUrl(item)"
                      :alt="item.alt || ''"
                      :class="`${rootClass}__grid-image`"
                    >
                    <span
                      v-else
                      :class="`${rootClass}__grid-file`"
                    >
                      <span
                        :class="`${rootClass}__grid-file-icon`"
                        aria-hidden="true"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 640 640"
                        >
                          <path
                            d="M304 112L192 112C183.2 112 176 119.2 176 128L176 512C176 520.8 183.2 528 192 528L448 528C456.8 528 464 520.8 464 512L464 272L376 272C336.2 272 304 239.8 304 200L304 112zM444.1 224L352 131.9L352 200C352 213.3 362.7 224 376 224L444.1 224zM128 128C128 92.7 156.7 64 192 64L325.5 64C342.5 64 358.8 70.7 370.8 82.7L493.3 205.3C505.3 217.3 512 233.6 512 250.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128z"
                          />
                        </svg>
                      </span>
                      <span :class="`${rootClass}__grid-file-name`">{{ fileLabel(item) }}</span>
                    </span>
                  </button>
                </div>
                <div
                  v-if="hasMore"
                  ref="sentinel"
                  :class="`${rootClass}__hint`"
                >
                  {{ loadingMore ? 'Loading…' : '' }}
                </div>
              </template>
            </template>

            <div
              v-else
              :class="`${rootClass}__hint`"
            >
              {{ noLibraryHint }}
            </div>
          </template>
        </div>

        <div
          v-if="!cropping && !processing"
          :class="`${rootClass}__dialog-foot`"
        >
          <MiraiCmsUiButton
            tag="button"
            variant="secondary"
            :disabled="uploading"
            @click="emit('upload')"
          >
            {{ uploading ? 'Uploading…' : (isImageKind ? 'Upload image' : 'Upload file') }}
          </MiraiCmsUiButton>

          <MiraiCmsUiButton
            v-if="multiple && pendingCount"
            tag="button"
            :disabled="uploading"
            @click="confirmSelection"
          >
            {{ confirmLabel }}
          </MiraiCmsUiButton>

          <MiraiCmsUiButton
            tag="button"
            :variant="multiple ? 'secondary' : undefined"
            @click="emit('close')"
          >
            Close
          </MiraiCmsUiButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-media-modal';

#{$root} {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  padding: math-rem(20);
  background-color: color-alpha($color-ink, 0.45);

  &__dialog {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: $color-surface;
    border-radius: $border-radius;
    box-shadow: $shadow-md;
    overflow: hidden;

    &-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: math-rem(14) math-rem(16);
      border-bottom: 1px solid $color-border;
    }

    &-title {
      font-weight: 600;
      color: $color-ink;
    }

    &-body {
      flex: 1;
      overflow-y: auto;
    }

    &-foot {
      display: flex;
      justify-content: flex-end;
      gap: math-rem(8);
      padding: math-rem(14) math-rem(16);
      border-top: 1px solid $color-border;
    }
  }

  &__filters {
    position: relative;
    z-index: 2;
    padding: math-rem(12) math-rem(16);
    border-bottom: 1px solid $color-border;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: math-rem(10);
    padding: math-rem(16);

    &-item {
      aspect-ratio: 1 / 1;
      padding: 0;
      border: 2px solid transparent;
      border-radius: $border-radius;
      overflow: hidden;
      background-color: $color-bg;
      cursor: pointer;

      &.is-selected {
        border-color: $color-accent;
      }

      &.is-disabled {
        opacity: .45;
        cursor: default;
      }
    }

    &-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &-file {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: math-rem(8);
      width: 100%;
      height: 100%;
      padding: math-rem(10);
      text-align: center;

      &-icon {
      display: block;
      width: 28px;
      height: 28px;

      svg {
        display: block;
        width: 100%;
        height: 100%;
        fill: $color-muted;
      }
      }

      &-name {
      font-size: math-rem(11);
      color: $color-ink;
      word-break: break-all;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      }
    }
  }

  &__hint {
    margin: 0;
    padding: math-rem(16);
    color: $color-muted;
  }

  &__processing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: math-rem(12);
    height: 100%;
    padding: math-rem(40);
    color: $color-muted;
  }

  &__spinner {
    width: 36px;
    height: 36px;
    border: 3px solid $color-border;
    border-top-color: $color-accent;
    border-radius: 50%;
    animation: miraicms-media-modal-spin 0.8s linear infinite;
  }

  &__error {
    margin: 0;
    padding: math-rem(12) math-rem(16);
    color: $color-danger;
  }
}

@keyframes miraicms-media-modal-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
