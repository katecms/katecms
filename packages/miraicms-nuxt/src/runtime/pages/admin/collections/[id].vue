<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { $fetch, navigateTo, onBeforeRouteLeave, useHead, useRoute } from '#imports'
import { buildPublicPath, validateRequiredFields } from '@miraicms/core'
import { parseAuthError } from '../../../utils/auth-error'
import { collectionApi } from '../../../utils/collections'
import type {
  AdminCollectionMeta,
  CollectionEntryFormModel,
  CollectionEntryResponse,
  ParentOption,
} from '../../../utils/collections'
import { useCmsPaths } from '../../../composables/useCmsPaths'

const route = useRoute()
const paths = useCmsPaths()
const collectionSlug = computed(() => String(route.params.collection ?? ''))
const entryId = computed(() => Number(route.params.id))

const collection = ref<AdminCollectionMeta | null>(null)
const parents = ref<ParentOption[]>([])
const found = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const dirty = ref(false)
const skipAutosave = ref(false)
const canUpdate = ref(false)
const canDelete = ref(false)
const savedStatus = ref<CollectionEntryFormModel['status']>('draft')

const form = reactive<CollectionEntryFormModel>({
  title: '',
  slug: '',
  status: 'draft',
  parentId: null,
  menuOrder: 0,
  publishedAt: null,
  fields: {},
})

const pageTitle = computed(() => form.title.trim() || 'Edit entry')
useHead({ title: pageTitle })

watch(form, () => {
  if (!loading.value && found.value) {
    dirty.value = true
  }
}, { deep: true })

const viewUrl = computed(() => {
  if (!form.slug.trim() || savedStatus.value === 'trash') {
    return null
  }
  const parent = parents.value.find(item => item.id === form.parentId)
  const slugPath = parent?.slugPath
    ? `${parent.slugPath}/${form.slug.trim()}`
    : form.slug.trim()
  const path = buildPublicPath(collection.value?.rewrite, collectionSlug.value, slugPath)
  return form.status === 'published' ? path : `${path}?preview=1`
})

function applyEntry(res: CollectionEntryResponse) {
  collection.value = res.collection
  parents.value = res.parents ?? []
  form.title = res.entry.title
  form.slug = res.entry.slug
  form.status = res.entry.status === 'trash' ? 'draft' : res.entry.status
  form.parentId = res.entry.parentId
  form.menuOrder = res.entry.menuOrder
  form.publishedAt = res.entry.publishedAt
  form.fields = { ...(res.entry.fields ?? {}) }
  savedStatus.value = res.entry.status
  canUpdate.value = res.canUpdate
  canDelete.value = res.canDelete
  found.value = true
}

async function load() {
  if (!Number.isInteger(entryId.value) || entryId.value <= 0) {
    await navigateTo(paths.collection(collectionSlug.value))
    return
  }

  loading.value = true
  error.value = null
  found.value = false
  try {
    const res = await $fetch<CollectionEntryResponse>(
      collectionApi(collectionSlug.value, entryId.value),
    )
    applyEntry(res)
    await nextTick()
    dirty.value = false
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not load the entry.').message
  }
  finally {
    loading.value = false
  }
}

async function persist(patch: Record<string, unknown>): Promise<CollectionEntryResponse> {
  return $fetch<CollectionEntryResponse>(
    collectionApi(collectionSlug.value, entryId.value),
    { method: 'PATCH', body: patch },
  )
}

async function autosave() {
  if (!collection.value?.autosave || skipAutosave.value || saving.value || !dirty.value || !found.value) {
    return
  }
  if (!canUpdate.value || savedStatus.value === 'trash') {
    return
  }
  if (!form.title.trim() || !form.slug.trim()) {
    return
  }
  if (
    form.status === 'published'
    && validateRequiredFields(collection.value.fields ?? {}, form.fields).length > 0
  ) {
    return
  }
  saving.value = true
  try {
    await persist({
      title: form.title.trim(),
      slug: form.slug.trim(),
      status: form.status,
      fields: form.fields,
      parentId: form.parentId,
      menuOrder: form.menuOrder,
      publishedAt: form.publishedAt,
    })
    dirty.value = false
  }
  finally {
    saving.value = false
  }
}

onBeforeRouteLeave(async () => {
  try {
    await autosave()
  }
  catch {
    // Best-effort: don't block navigation if autosave fails.
  }
})

async function submit() {
  if (saving.value || !collection.value || !canUpdate.value) {
    return
  }
  saving.value = true
  error.value = null
  try {
    const res = await persist({
      title: form.title.trim(),
      slug: form.slug.trim(),
      status: form.status,
      fields: form.fields,
      parentId: form.parentId,
      menuOrder: form.menuOrder,
      publishedAt: form.publishedAt,
    })
    applyEntry(res)
    dirty.value = false
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not save the entry.').message
  }
  finally {
    saving.value = false
  }
}

async function moveToTrash() {
  if (!canUpdate.value || saving.value) {
    return
  }
  if (!window.confirm(`Move “${form.title || 'this entry'}” to trash?`)) {
    return
  }
  saving.value = true
  error.value = null
  skipAutosave.value = true
  try {
    await persist({ status: 'trash' })
    await navigateTo({
      path: paths.collection(collectionSlug.value),
      query: { status: 'trash' },
    })
  }
  catch (err) {
    skipAutosave.value = false
    error.value = parseAuthError(err, 'Could not move the entry to trash.').message
  }
  finally {
    saving.value = false
  }
}

async function restore() {
  if (!canUpdate.value || saving.value) {
    return
  }
  saving.value = true
  error.value = null
  try {
    const res = await persist({ status: 'draft' })
    applyEntry(res)
    dirty.value = false
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not restore the entry.').message
  }
  finally {
    saving.value = false
  }
}

async function removePermanent() {
  if (!canDelete.value || saving.value) {
    return
  }
  if (!window.confirm(`Delete “${form.title || 'this entry'}” permanently? This cannot be undone.`)) {
    return
  }
  saving.value = true
  error.value = null
  skipAutosave.value = true
  try {
    await $fetch(collectionApi(collectionSlug.value, entryId.value), { method: 'DELETE' })
    await navigateTo({
      path: paths.collection(collectionSlug.value),
      query: { status: 'trash' },
    })
  }
  catch (err) {
    skipAutosave.value = false
    error.value = parseAuthError(err, 'Could not delete the entry.').message
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
watch([collectionSlug, entryId], load)
</script>

<template>
  <div class="miraicms-collection-entry">
    <div class="miraicms-collection-entry__head">
      <MiraiCmsUiButton
        tag="a"
        :variant="['secondary', 'icon']"
        :link="{ url: paths.collection(collectionSlug), title: 'Back to list' }"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
        ><path
          d="M73 297a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L173 352h371a32 32 0 1 0 0-64H173l106-105a32 32 0 0 0-46-46z"
          fill="currentColor"
        /></svg>
      </MiraiCmsUiButton>
      <div class="miraicms-collection-entry__head-title">
        {{ pageTitle }}
      </div>
    </div>

    <MiraiCmsUiNotice
      v-if="loading"
      placement="static"
      variant="info"
      message="Loading…"
      :closable="false"
    />
    <MiraiCmsUiNotice
      v-else-if="!found"
      placement="static"
      variant="danger"
      :message="error || 'Entry not found.'"
      :closable="false"
    />

    <MiraiCmsCollectionEntryForm
      v-else-if="collection"
      :model-value="form"
      :collection="collection"
      :entry-key="entryId"
      :parents="parents"
      :saving="saving"
      :error="error"
      :view-url="viewUrl"
      :can-update="canUpdate"
      :can-delete="canDelete"
      :saved-status="savedStatus"
      @update:model-value="(value: CollectionEntryFormModel) => Object.assign(form, value)"
      @submit="submit"
      @trash="moveToTrash"
      @restore="restore"
      @delete="removePermanent"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.miraicms-collection-entry';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);

    &__head {
      display: flex;
      align-items: center;
      gap: math-rem(16);
    }

    &__head-title {
      font-size: math-rem(18);
      font-weight: 600;
    }
  }
}
</style>
