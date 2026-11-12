<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { $fetch, navigateTo, onBeforeRouteLeave, useHead, useRoute } from '#imports'
import { buildPublicPath, buildFormValues } from '@katecms/core'
import { parseAuthError } from '../../../utils/auth-error'
import {
  collectionApi,
  formDictionarySelection,
} from '../../../utils/collections'
import type {
  AdminCollectionMeta,
  CollectionDictionaryPicker,
  CollectionEntryFormModel,
  CollectionEntryResponse,
  EntryRevisionItem,
  ParentOption,
} from '../../../utils/collections'
import { useCmsPaths } from '../../../composables/useCmsPaths'

const route = useRoute()
const paths = useCmsPaths()
const collectionSlug = computed(() => String(route.params.collection ?? ''))
const entryId = computed(() => Number(route.params.id))

const collection = ref<AdminCollectionMeta | null>(null)
const parents = ref<ParentOption[]>([])
const dictionaryPickers = ref<CollectionDictionaryPicker[]>([])
const found = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const dirty = ref(false)
const formBaseline = ref('')
const skipLeaveConfirm = ref(false)
const leaveOpen = ref(false)
const pendingLeaveTo = ref<string | null>(null)
const entryForm = ref<{ validateForSubmit: () => boolean } | null>(null)
const canUpdate = ref(false)
const canDelete = ref(false)
const savedStatus = ref<CollectionEntryFormModel['status']>('draft')
const savedNoticeId = ref(0)
const savedNoticeText = ref('')
const revisions = ref<EntryRevisionItem[]>([])
const revisionsLoading = ref(false)
const revisionsError = ref('')

const form = reactive<CollectionEntryFormModel>({
  title: '',
  slug: '',
  status: 'draft',
  parentId: null,
  menuOrder: 0,
  publishedAt: null,
  authorId: null,
  fields: {},
  dictionaryIds: {},
})

const pageTitle = computed(() => form.title.trim() || 'Edit entry')
useHead({ title: pageTitle })

function serializeForm(value: CollectionEntryFormModel): string {
  return JSON.stringify({
    title: value.title,
    slug: value.slug,
    status: value.status,
    parentId: value.parentId,
    menuOrder: value.menuOrder,
    publishedAt: value.publishedAt,
    authorId: value.authorId,
    fields: value.fields,
    dictionaryIds: value.dictionaryIds,
  })
}

function markFormClean() {
  formBaseline.value = serializeForm(form)
  dirty.value = false
}

watch(form, () => {
  if (loading.value || !found.value || !formBaseline.value) {
    return
  }
  dirty.value = serializeForm(form) !== formBaseline.value
}, { deep: true })

const viewUrl = computed(() => {
  if (!form.slug.trim() || savedStatus.value === 'trash' || collection.value?.public === false) {
    return null
  }
  const parent = parents.value.find(item => item.id === form.parentId)
  const slugPath = parent?.slugPath
    ? `${parent.slugPath}/${form.slug.trim()}`
    : form.slug.trim()
  const path = buildPublicPath(collection.value?.rewrite, collectionSlug.value, slugPath)
  return form.status === 'published' ? path : `${path}?preview=1`
})

function flashSavedNotice(status: 'published' | 'draft') {
  savedNoticeText.value = status === 'published'
    ? (collection.value?.labels.singularName
        ? `${collection.value.labels.singularName} published.`
        : 'Entry published.')
    : 'Draft saved.'
  savedNoticeId.value += 1
}

function consumeRouteNotice() {
  const raw = route.query.notice
  const notice = Array.isArray(raw) ? raw[0] : raw
  if (notice !== 'published' && notice !== 'draft') {
    return
  }
  flashSavedNotice(notice)
  const query = { ...route.query }
  delete query.notice
  void nextTick(() => {
    void navigateTo({ path: route.path, query }, { replace: true })
  })
}

function applyEntry(res: CollectionEntryResponse) {
  collection.value = res.collection
  if (res.parents !== undefined) {
    parents.value = res.parents
  }
  if (res.dictionaries !== undefined) {
    dictionaryPickers.value = res.dictionaries
  }
  form.title = res.entry.title
  form.slug = res.entry.slug
  form.status = res.entry.status === 'trash' ? 'draft' : res.entry.status
  form.parentId = res.entry.parentId
  form.menuOrder = res.entry.menuOrder
  form.publishedAt = res.entry.publishedAt
  form.authorId = res.entry.authorId
  form.fields = {
    ...buildFormValues(res.collection.fields ?? {}),
    ...(res.entry.fields ?? {}),
  }
  form.dictionaryIds = formDictionarySelection(dictionaryPickers.value, res.entry.dictionaryIds)
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
  formBaseline.value = ''
  dirty.value = false
  revisions.value = []
  revisionsError.value = ''
  try {
    const res = await $fetch<CollectionEntryResponse>(
      collectionApi(collectionSlug.value, entryId.value),
    )
    applyEntry(res)
    await loadRevisions()
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not load the entry.').message
  }
  finally {
    loading.value = false
  }
}

async function loadRevisions() {
  if (collection.value?.revisions === false) {
    revisions.value = []
    revisionsError.value = ''
    return
  }
  revisionsLoading.value = true
  revisionsError.value = ''
  try {
    const res = await $fetch<{ revisions: EntryRevisionItem[] }>(
      `${collectionApi(collectionSlug.value, entryId.value)}/revisions`,
    )
    revisions.value = res.revisions
  }
  catch (err) {
    revisions.value = []
    revisionsError.value = parseAuthError(err, 'Could not load revisions.').message
  }
  finally {
    revisionsLoading.value = false
  }
}

async function persist(patch: Record<string, unknown>): Promise<CollectionEntryResponse> {
  return $fetch<CollectionEntryResponse>(
    collectionApi(collectionSlug.value, entryId.value),
    { method: 'PATCH', body: patch },
  )
}

function shouldConfirmLeave(): boolean {
  return Boolean(collection.value?.autosave)
    && dirty.value
    && found.value
    && canUpdate.value
    && savedStatus.value !== 'trash'
    && !skipLeaveConfirm.value
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!shouldConfirmLeave()) {
    return
  }
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave((to) => {
  if (!shouldConfirmLeave()) {
    return true
  }
  pendingLeaveTo.value = to.fullPath
  leaveOpen.value = true
  return false
})

function cancelLeave() {
  if (saving.value) {
    return
  }
  leaveOpen.value = false
  pendingLeaveTo.value = null
}

async function finishLeave() {
  const to = pendingLeaveTo.value
  skipLeaveConfirm.value = true
  leaveOpen.value = false
  pendingLeaveTo.value = null
  dirty.value = false
  if (to) {
    await navigateTo(to)
  }
}

async function discardLeave() {
  if (saving.value) {
    return
  }
  await finishLeave()
}

async function saveAndLeave() {
  if (saving.value || !collection.value || !canUpdate.value) {
    return
  }
  if (!entryForm.value?.validateForSubmit()) {
    leaveOpen.value = false
    pendingLeaveTo.value = null
    return
  }
  const ok = await submit()
  if (ok) {
    await finishLeave()
    return
  }
  leaveOpen.value = false
  pendingLeaveTo.value = null
}

async function submit(): Promise<boolean> {
  if (saving.value || !collection.value || !canUpdate.value) {
    return false
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
      authorId: form.authorId,
      dictionaries: form.dictionaryIds,
    })
    applyEntry(res)
    await nextTick()
    markFormClean()
    if (res.entry.status === 'published' || res.entry.status === 'draft') {
      flashSavedNotice(res.entry.status)
    }
    await loadRevisions()
    return true
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not save the entry.').message
    return false
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
  skipLeaveConfirm.value = true
  try {
    await persist({ status: 'trash' })
    await navigateTo({
      path: paths.collection(collectionSlug.value),
      query: { status: 'trash' },
    })
  }
  catch (err) {
    skipLeaveConfirm.value = false
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
    await nextTick()
    markFormClean()
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not restore the entry.').message
  }
  finally {
    saving.value = false
  }
}

async function restoreRevision(revisionId: number) {
  if (!canUpdate.value || saving.value) {
    return
  }
  const message = dirty.value
    ? 'Restore this revision? Unsaved changes will be lost.'
    : 'Restore this revision? The current entry will be replaced.'
  if (!window.confirm(message)) {
    return
  }
  saving.value = true
  error.value = null
  try {
    const res = await $fetch<CollectionEntryResponse>(
      `${collectionApi(collectionSlug.value, entryId.value)}/revisions/${revisionId}`,
      { method: 'POST' },
    )
    applyEntry(res)
    await nextTick()
    markFormClean()
    savedNoticeText.value = 'Revision restored.'
    savedNoticeId.value += 1
    await loadRevisions()
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not restore the revision.').message
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
  skipLeaveConfirm.value = true
  try {
    await $fetch(collectionApi(collectionSlug.value, entryId.value), { method: 'DELETE' })
    await navigateTo({
      path: paths.collection(collectionSlug.value),
      query: { status: 'trash' },
    })
  }
  catch (err) {
    skipLeaveConfirm.value = false
    error.value = parseAuthError(err, 'Could not delete the entry.').message
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})
watch([collectionSlug, entryId], load)
watch(() => route.query.notice, consumeRouteNotice, { immediate: true })
</script>

<template>
  <KateCmsUiNotice
    v-if="savedNoticeId"
    :key="savedNoticeId"
    placement="fixed"
    :message="savedNoticeText"
    @close="savedNoticeId = 0"
  />

  <KateCmsUiNotice
    v-if="loading"
    placement="static"
    variant="info"
    message="Loading…"
    :closable="false"
  />
  <KateCmsUiNotice
    v-else-if="!found"
    placement="static"
    variant="danger"
    :message="error || 'Entry not found.'"
    :closable="false"
  />

  <KateCmsCollectionEntryForm
    v-else-if="collection"
    ref="entryForm"
    :model-value="form"
    :collection="collection"
    :entry-key="entryId"
    :parents="parents"
    :dictionary-pickers="dictionaryPickers"
    :saving="saving"
    :error="error"
    :view-url="viewUrl"
    :can-update="canUpdate"
    :can-delete="canDelete"
    :saved-status="savedStatus"
    :revisions="revisions"
    :revisions-loading="revisionsLoading"
    :revisions-error="revisionsError"
    @update:model-value="(value: CollectionEntryFormModel) => Object.assign(form, value)"
    @ready="markFormClean"
    @submit="submit"
    @trash="moveToTrash"
    @restore="restore"
    @restore-revision="restoreRevision"
    @delete="removePermanent"
  />

  <KateCmsConfirmDialog
    :open="leaveOpen"
    :busy="saving"
    :save-label="form.status === 'published' ? 'Publish' : 'Save draft'"
    @save="saveAndLeave"
    @discard="discardLeave"
    @cancel="cancelLeave"
  />
</template>
