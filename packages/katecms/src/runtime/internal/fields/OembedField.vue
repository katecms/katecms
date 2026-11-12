<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Field } from '@katecms/core'

type OembedFieldConfig = Extract<Field, { type: 'oembed' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: OembedFieldConfig
}>(), {
  field: () => ({ type: 'oembed', label: '' }),
})

const model = defineModel<string>()

const rootClass = 'katecms-oembed-field'
const embedUrl = ref<string | null>(null)
const title = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let requestId = 0

const inputField = computed(() => ({
  placeholder: 'https://www.youtube.com/watch?v=...',
  required: props.field?.required,
}))

let timer: ReturnType<typeof setTimeout> | undefined

function errorMessage(err: unknown): string {
  const data = (err as { data?: { statusMessage?: string, message?: string } })?.data
  return data?.statusMessage || data?.message || 'Failed to fetch embed.'
}

function pageHref(value: string | undefined): string | null {
  try {
    const url = new URL(value || '')
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return url.toString()
    }
  }
  catch {
    return null
  }
  return null
}

async function load(url: string) {
  const current = ++requestId
  loading.value = true
  error.value = null
  embedUrl.value = null
  title.value = null
  try {
    const data = await $fetch<{ embedUrl?: string, title?: string }>('/api/_katecms/oembed', {
      query: {
        url,
        maxwidth: props.field?.width ?? undefined,
        maxheight: props.field?.height ?? undefined,
      },
    })
    if (current !== requestId) {
      return
    }
    embedUrl.value = data?.embedUrl || null
    title.value = data?.title || null
    if (!embedUrl.value && !title.value) {
      error.value = 'Failed to fetch embed.'
    }
  }
  catch (err) {
    if (current !== requestId) {
      return
    }
    error.value = errorMessage(err)
  }
  finally {
    if (current === requestId) {
      loading.value = false
    }
  }
}

watch(model, (url) => {
  clearTimeout(timer)
  requestId += 1
  embedUrl.value = null
  title.value = null
  error.value = null
  loading.value = false
  const value = (url || '').trim()
  if (!value) {
    return
  }
  timer = setTimeout(() => load(value), 600)
}, { immediate: true })

onBeforeUnmount(() => {
  clearTimeout(timer)
})
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <div :class="rootClass">
      <KateCmsInputControl
        v-model="model"
        type="url"
        :field-key="fieldKey"
        :field="inputField"
      />

      <div
        v-if="loading"
        :class="`${rootClass}__status`"
      >
        Loading…
      </div>

      <div
        v-else-if="embedUrl"
        :class="`${rootClass}__preview`"
      >
        <iframe
          :src="embedUrl"
          :title="title || 'Embedded media'"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        />
      </div>

      <a
        v-else-if="title && pageHref(model)"
        :class="`${rootClass}__link`"
        :href="pageHref(model) || undefined"
        target="_blank"
        rel="noopener noreferrer"
      >{{ title }}</a>

      <div
        v-else-if="error"
        :class="`${rootClass}__error`"
      >
        {{ error }}
      </div>
    </div>
  </KateCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-oembed-field';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(10);

  &__preview iframe {
    width: 100%;
    height: auto;
    aspect-ratio: 16/9;
    margin: 0;
    display: block;
    border: 0;
  }

  &__link {
    color: $color-accent;
  }

  &__status {
    margin: 0;
    color: $color-muted;
  }

  &__error {
    margin: 0;
    color: $color-danger;
  }
}
</style>
