<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { $fetch, useRequestURL } from '#imports'
import type { SeoEditorPayload, SeoEntry, SeoImageChoice, SeoSite } from '../types'
import { renderTitle } from '../utils/title'
import SeoSnippet from './SeoSnippet.vue'

const props = withDefaults(defineProps<{
  url: string
  padded?: boolean
}>(), {
  padded: true,
})

const rootClass = 'miraicms-seo-panel'
const requestUrl = useRequestURL()
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref<string | null>(null)
const fallbackTitle = ref('')
const publicPath = ref('')
const site = ref<SeoSite>({
  siteName: '',
  titleSeparator: '|',
  titleTemplate: '%title% %sep% %sitename%',
  description: '',
  noindex: false,
})
const form = reactive<SeoEntry>({
  title: '',
  description: '',
  canonical: '',
  image: '',
  noindex: false,
  nofollow: false,
})
const imageChoices = ref<SeoImageChoice[]>([])
const imageKey = ref(0)
const snippetImageField = {
  type: 'image' as const,
  label: 'Snippet image',
  returnFormat: 'url' as const,
}

const previewTitle = computed(() => {
  const custom = form.title.trim()
  if (custom) {
    return custom
  }
  return renderTitle(
    site.value.titleTemplate,
    fallbackTitle.value,
    site.value.siteName,
    site.value.titleSeparator,
  )
})

const previewDescription = computed(() => form.description.trim() || site.value.description)
const previewUrl = computed(() => {
  const canonical = form.canonical.trim()
  if (/^https?:\/\//i.test(canonical)) {
    return canonical
  }
  const path = canonical || publicPath.value || '/'
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${requestUrl.origin}${normalized}`
})

function applyEntry(entry: SeoEntry) {
  form.title = entry.title
  form.description = entry.description
  form.canonical = entry.canonical
  form.image = entry.image || ''
  form.noindex = entry.noindex
  form.nofollow = entry.nofollow
}

function useEntryImage(url: string) {
  form.image = url
  imageKey.value += 1
}

async function load() {
  loading.value = true
  error.value = null
  saved.value = false
  try {
    const data = await $fetch<SeoEditorPayload>(props.url)
    applyEntry(data)
    fallbackTitle.value = data.fallbackTitle
    publicPath.value = data.publicPath
    site.value = data.site
    imageChoices.value = data.imageChoices || []
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not load SEO.'
  }
  finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = null
  saved.value = false
  try {
    const data = await $fetch<SeoEntry>(props.url, {
      method: 'PUT',
      body: { ...form },
    })
    applyEntry(data)
    saved.value = true
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not save SEO.'
  }
  finally {
    saving.value = false
  }
}

watch(() => props.url, () => {
  void load()
}, { immediate: true })
</script>

<template>
  <p
    v-if="loading"
    :class="`${rootClass}__hint`"
  >
    Loading…
  </p>
  <form
    v-else
    :class="[`${rootClass}__form`, { [`${rootClass}__form--flush`]: !padded }]"
    @submit.prevent="save"
  >
    <SeoSnippet
      :title="previewTitle"
      :description="previewDescription"
      :url="previewUrl"
      :image="form.image"
    />
    <MiraiCmsImageField
      :key="imageKey"
      v-model="form.image"
      field-key="seo-snippet-image"
      :field="snippetImageField"
    />
    <div
      v-if="imageChoices.length"
      :class="`${rootClass}__images`"
    >
      <span>From this entry</span>
      <div :class="`${rootClass}__choices`">
        <button
          v-for="choice in imageChoices"
          :key="choice.url"
          type="button"
          :class="[`${rootClass}__choice`, { [`${rootClass}__choice--selected`]: form.image === choice.url }]"
          :title="choice.label"
          @click="useEntryImage(choice.url)"
        >
          <img
            :src="choice.url"
            :alt="choice.label"
          >
        </button>
      </div>
    </div>
    <label :class="`${rootClass}__field`">
      <span :class="`${rootClass}__label`">
        <span>SEO title</span>
        <span :class="`${rootClass}__count`">{{ previewTitle.length }}/60</span>
      </span>
      <input
        v-model="form.title"
        type="text"
        maxlength="200"
        placeholder="Defaults to the title template"
      >
    </label>
    <label :class="`${rootClass}__field`">
      <span :class="`${rootClass}__label`">
        <span>Meta description</span>
        <span :class="`${rootClass}__count`">{{ previewDescription.length }}/160</span>
      </span>
      <textarea
        v-model="form.description"
        rows="4"
        maxlength="320"
      />
    </label>
    <label :class="`${rootClass}__field`">
      <span>Canonical URL</span>
      <input
        v-model="form.canonical"
        type="text"
        maxlength="500"
        placeholder="Defaults to the public URL"
      >
    </label>
    <label :class="`${rootClass}__check`">
      <input
        v-model="form.noindex"
        type="checkbox"
      >
      <span>Hide from search engines</span>
    </label>
    <label :class="`${rootClass}__check`">
      <input
        v-model="form.nofollow"
        type="checkbox"
      >
      <span>Nofollow</span>
    </label>
    <p
      v-if="error"
      :class="`${rootClass}__error`"
    >
      {{ error }}
    </p>
    <p
      v-else-if="saved"
      :class="`${rootClass}__saved`"
    >
      SEO saved.
    </p>
    <MiraiCmsUiButton
      tag="button"
      type="submit"
      variant="full"
      :disabled="saving"
    >
      {{ saving ? 'Saving…' : 'Save SEO' }}
    </MiraiCmsUiButton>
  </form>
</template>

<style scoped lang="scss">
@use "../assets/styles" as *;

$root: '.miraicms-seo-panel';

#{$root} {
  &__hint,
  &__saved,
  &__error {
    margin: 0 math-rem(16) math-rem(12);
    font-size: math-rem(13);
  }

  &__hint {
    color: #6b7280;
  }

  &__saved {
    color: #2a9a66;
  }

  &__error {
    color: #d64545;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: math-rem(12);
    padding: 0 math-rem(16);

    &--flush {
      padding: 0;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: math-rem(6);
    font-size: math-rem(13);
    color: $color-ink;

    input,
    textarea {
      width: 100%;
      margin: 0;
      padding: math-rem(8) math-rem(10);
      border: 1px solid $color-border;
      border-radius: $border-radius;
      background: $color-surface;
      color: $color-ink;
      font: inherit;
    }
  }

  &__label {
    display: flex;
    justify-content: space-between;
    gap: math-rem(12);
  }

  &__count {
    color: #6b7280;
    font-variant-numeric: tabular-nums;
  }

  &__images {
    display: flex;
    flex-direction: column;
    gap: math-rem(7);
    font-size: math-rem(13);
    color: #141a2a;
  }

  &__choices {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(6);
  }

  &__choice {
    width: math-rem(52);
    height: math-rem(52);
    margin: 0;
    padding: 0;
    border: 2px solid transparent;
    border-radius: $border-radius;
    background: #f3f4f6;
    cursor: pointer;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }

    &--selected {
      border-color: #2f6fed;
    }
  }

  &__check {
    display: flex;
    align-items: center;
    gap: math-rem(8);
    font-size: math-rem(13);
    color: $color-ink;

    input {
      width: math-rem(16);
      height: math-rem(16);
      margin: 0;
      accent-color: #2f6fed;
    }
  }
}
</style>
