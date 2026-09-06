<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Field } from '@miraicms/core'

type OembedFieldConfig = Extract<Field, { type: 'oembed' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: OembedFieldConfig
}>(), {
  field: () => ({ type: 'oembed', label: '' }),
})

const model = defineModel<string>()

const rootClass = 'miraicms-oembed-field'
const html = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const inputField = computed(() => ({
  placeholder: 'https://www.youtube.com/watch?v=...',
  required: props.field?.required,
}))

let timer: ReturnType<typeof setTimeout> | undefined

function errorMessage(err: unknown): string {
  const data = (err as { data?: { statusMessage?: string, message?: string } })?.data
  return data?.statusMessage || data?.message || 'Failed to fetch embed.'
}

async function load(url: string) {
  loading.value = true
  error.value = null
  html.value = null
  try {
    const data = await $fetch<{ html?: string }>('/api/_miraicms/oembed', {
      query: {
        url,
        maxwidth: props.field?.width ?? undefined,
        maxheight: props.field?.height ?? undefined,
      },
    })
    html.value = data?.html ?? null
    if (!html.value) {
      error.value = 'Failed to fetch embed.'
    }
  }
  catch (err) {
    error.value = errorMessage(err)
  }
  finally {
    loading.value = false
  }
}

watch(model, (url) => {
  clearTimeout(timer)
  html.value = null
  error.value = null
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
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <div :class="rootClass">
      <MiraiCmsInputControl
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
        v-else-if="html"
        :class="`${rootClass}__preview`"
        v-html="html"
      />

      <div
        v-else-if="error"
        :class="`${rootClass}__error`"
      >
        {{ error }}
      </div>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-oembed-field';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(10);

  &__preview {
    :deep(iframe) {
      width: 100%;
      height: auto;
      aspect-ratio: 16/9;
      margin: 0;
      display: block;
    }
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
