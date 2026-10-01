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
const canonicalField = {
  type: 'text' as const,
  label: 'Canonical URL',
  placeholder: 'Defaults to the public URL',
  maxLength: 500,
}
const entryImageField = computed(() => ({
  type: 'image_select' as const,
  label: 'From this entry',
  allowNull: true,
  returnFormat: 'value' as const,
  width: 72,
  height: 72,
  choices: Object.fromEntries(imageChoices.value.map(choice => [
    choice.url,
    { label: choice.label, image: choice.url },
  ])),
}))

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
const titleField = computed(() => ({
  type: 'text' as const,
  label: 'SEO title',
  placeholder: 'Defaults to the title template',
  maxLength: 200,
  instructions: `${previewTitle.value.length}/60`,
}))
const descriptionField = computed(() => ({
  type: 'textarea' as const,
  label: 'Meta description',
  rows: 4,
  maxLength: 320,
  instructions: `${previewDescription.value.length}/160`,
}))
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

function onEntryImage(value: unknown) {
  const url = typeof value === 'string' ? value : ''
  if (url) {
    useEntryImage(url)
    return
  }
  if (imageChoices.value.some(choice => choice.url === form.image)) {
    form.image = ''
    imageKey.value += 1
  }
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
  <div
    v-else
    :class="[`${rootClass}__form`, { [`${rootClass}__form--flush`]: !padded }]"
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
    <MiraiCmsImageSelectField
      v-if="imageChoices.length"
      :model-value="imageChoices.some(choice => choice.url === form.image) ? form.image : ''"
      field-key="seo-entry-image"
      :field="entryImageField"
      @update:model-value="onEntryImage"
    />
    <MiraiCmsTextField
      v-model="form.title"
      field-key="seo-title"
      :field="titleField"
    />
    <MiraiCmsTextareaField
      v-model="form.description"
      field-key="seo-description"
      :field="descriptionField"
    />
    <MiraiCmsTextField
      v-model="form.canonical"
      field-key="seo-canonical"
      :field="canonicalField"
    />
    <MiraiCmsTrueFalseField
      v-model="form.noindex"
      field-key="seo-noindex"
      :field="{ type: 'true_false', label: 'Hide from search engines' }"
    />
    <MiraiCmsTrueFalseField
      v-model="form.nofollow"
      field-key="seo-nofollow"
      :field="{ type: 'true_false', label: 'Nofollow' }"
    />
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
      variant="full"
      :disabled="saving"
      @click="save"
    >
      {{ saving ? 'Saving…' : 'Save SEO' }}
    </MiraiCmsUiButton>
  </div>
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
}
</style>
