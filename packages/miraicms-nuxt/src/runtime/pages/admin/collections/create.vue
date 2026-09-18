<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { $fetch, navigateTo, onBeforeRouteLeave, useHead, useRoute } from '#imports'
import { buildFormValues } from '@miraicms/core'
import { parseAuthError } from '../../../utils/auth-error'
import { collectionApi, emptyDictionarySelection } from '../../../utils/collections'
import type {
  AdminCollectionMeta,
  CollectionDictionaryPicker,
  CollectionEntryFormModel,
  CollectionEntryResponse,
  CollectionListResponse,
  ParentOption,
} from '../../../utils/collections'
import { slugify } from '../../../utils/slugify'
import { useCmsPaths } from '../../../composables/useCmsPaths'
import { useAuth } from '../../../composables/useAuth'

const route = useRoute()
const paths = useCmsPaths()
const { user } = useAuth()
const collectionSlug = computed(() => String(route.params.collection ?? ''))

useHead({ title: 'New entry' })

const collection = ref<AdminCollectionMeta | null>(null)
const parents = ref<ParentOption[]>([])
const dictionaryPickers = ref<CollectionDictionaryPicker[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const dirty = ref(false)
const skipAutosave = ref(false)

const form = reactive<CollectionEntryFormModel>({
  title: '',
  slug: '',
  status: 'published',
  parentId: null,
  menuOrder: 0,
  publishedAt: null,
  authorId: null,
  fields: {},
  dictionaryIds: {},
})

watch(form, () => {
  dirty.value = true
}, { deep: true })

watch(() => user.value?.id, (id) => {
  if (id && form.authorId == null) {
    form.authorId = id
  }
}, { immediate: true })

function ensureSlug() {
  if (!form.slug.trim() && form.title.trim()) {
    form.slug = slugify(form.title) || 'entry'
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<CollectionListResponse>(collectionApi(collectionSlug.value), {
      query: { perPage: 1 },
    })
    if (!res.canCreate) {
      await navigateTo(paths.collection(collectionSlug.value))
      return
    }
    collection.value = res.collection
    parents.value = res.parents ?? []
    dictionaryPickers.value = res.dictionaries ?? []
    form.fields = buildFormValues(res.collection.fields ?? {})
    form.dictionaryIds = emptyDictionarySelection(dictionaryPickers.value)
    form.authorId = user.value?.id ?? form.authorId
    await nextTick()
    dirty.value = false
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not load the collection.').message
  }
  finally {
    loading.value = false
  }
}

async function persist(status = form.status): Promise<CollectionEntryResponse> {
  ensureSlug()
  return $fetch<CollectionEntryResponse>(collectionApi(collectionSlug.value), {
    method: 'POST',
    body: {
      title: form.title.trim(),
      slug: form.slug.trim(),
      status,
      fields: form.fields,
      parentId: form.parentId,
      menuOrder: form.menuOrder,
      publishedAt: form.publishedAt,
      authorId: form.authorId,
      dictionaries: form.dictionaryIds,
    },
  })
}

async function autosaveDraft() {
  if (!collection.value?.autosave || skipAutosave.value || saving.value || !dirty.value) {
    return
  }
  if (!form.title.trim()) {
    return
  }
  ensureSlug()
  if (!form.slug.trim()) {
    return
  }
  saving.value = true
  try {
    await persist('draft')
    dirty.value = false
  }
  finally {
    saving.value = false
  }
}

onBeforeRouteLeave(async () => {
  try {
    await autosaveDraft()
  }
  catch {
    // Best-effort: don't block navigation if autosave fails.
  }
})

async function submit() {
  if (saving.value || !collection.value) {
    return
  }
  ensureSlug()
  saving.value = true
  error.value = null
  try {
    const res = await persist()
    skipAutosave.value = true
    dirty.value = false
    const notice = res.entry.status === 'published' ? 'published' : 'draft'
    await navigateTo({
      path: paths.collectionEntry(collectionSlug.value, res.entry.id),
      query: { notice },
    })
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not create the entry.').message
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
watch(collectionSlug, load)
</script>

<template>
  <MiraiCmsUiNotice
    v-if="loading"
    placement="static"
    variant="info"
    message="Loading…"
    :closable="false"
  />
  <MiraiCmsUiNotice
    v-else-if="!collection"
    placement="static"
    variant="danger"
    :message="error || 'Collection not found.'"
    :closable="false"
  />

  <MiraiCmsCollectionEntryForm
    v-else
    :model-value="form"
    :collection="collection"
    entry-key="new"
    :parents="parents"
    :dictionary-pickers="dictionaryPickers"
    :saving="saving"
    :error="error"
    :can-update="true"
    :can-delete="false"
    @focusout="ensureSlug"
    @update:model-value="(value: CollectionEntryFormModel) => Object.assign(form, value)"
    @submit="submit"
  />
</template>
