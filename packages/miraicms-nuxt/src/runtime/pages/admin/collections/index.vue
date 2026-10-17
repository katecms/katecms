<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { $fetch, navigateTo, useHead, useRoute } from '#imports'
import { buildPublicPath } from '@miraicms/core'
import type { CollectionStatus, SelectModelValue } from '@miraicms/core'

const COLLECTION_LIST_SORTS = [
  'date-desc',
  'date-asc',
  'author-asc',
  'author-desc',
  'title-asc',
  'title-desc',
] as const

type CollectionListSort = typeof COLLECTION_LIST_SORTS[number]
import { parseAuthError } from '../../../utils/auth-error'
import { localUtcOffsetMinutes, monthLabel } from '../../../utils/media-library-query'
import {
  collectionApi,
  collectionStatusLabel,
} from '../../../utils/collections'
import type {
  AdminCollectionMeta,
  AdminEntry,
  CollectionListFilter,
  CollectionListResponse,
} from '../../../utils/collections'
import { useCmsPaths } from '../../../composables/useCmsPaths'

const route = useRoute()
const paths = useCmsPaths()
const rootClass = 'miraicms-collection-list'

const collectionSlug = computed(() => String(route.params.collection ?? ''))
const statusFilter = computed<CollectionListFilter>(() => {
  const raw = String(route.query.status ?? 'all')
  if (raw === 'published' || raw === 'draft' || raw === 'trash' || raw === 'all') {
    return raw
  }
  return 'all'
})
const searchQuery = computed(() => String(route.query.q ?? ''))
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const monthFilter = computed(() => {
  const raw = String(route.query.month ?? '')
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : 'all'
})
const sortFilter = computed<CollectionListSort>(() => {
  const raw = String(route.query.sort ?? 'date-desc')
  return (COLLECTION_LIST_SORTS as readonly string[]).includes(raw)
    ? raw as CollectionListSort
    : 'date-desc'
})

const collection = ref<AdminCollectionMeta | null>(null)
const entries = ref<AdminEntry[]>([])
const months = ref<string[]>([])
const counts = ref({ all: 0, published: 0, draft: 0, trash: 0 })
const total = ref(0)
const perPage = ref(10)
const canCreate = ref(false)
const canDelete = ref(false)

const loading = ref(true)
const error = ref<string | null>(null)
const pendingId = ref<number | null>(null)
const emptyingTrash = ref(false)
const deletingMarked = ref(false)
const markedIds = ref<number[]>([])
const searchInput = ref('')

const SORT_CHOICES: { val: CollectionListSort, lbl: string }[] = [
  { val: 'date-desc', lbl: 'Date, newest' },
  { val: 'date-asc', lbl: 'Date, oldest' },
  { val: 'author-asc', lbl: 'Author, A–Z' },
  { val: 'author-desc', lbl: 'Author, Z–A' },
  { val: 'title-asc', lbl: 'Title, A–Z' },
  { val: 'title-desc', lbl: 'Title, Z–A' },
]

const title = computed(() => collection.value?.labels.name || '')
useHead({ title })

const totalPages = computed(() => {
  if (perPage.value < 1) {
    return 1
  }
  return Math.max(1, Math.ceil(total.value / perPage.value))
})

const monthChoices = computed(() => {
  const values = [...months.value]
  if (monthFilter.value !== 'all' && !values.includes(monthFilter.value)) {
    values.push(monthFilter.value)
  }
  values.sort((a, b) => b.localeCompare(a))
  return [
    { val: 'all', lbl: 'All dates' },
    ...values.map(value => ({ val: value, lbl: monthLabel(value) })),
  ]
})

const markedEntries = computed(() =>
  entries.value.filter(entry => markedIds.value.includes(entry.id)),
)

const bulkTrashIds = computed(() =>
  statusFilter.value === 'trash'
    ? []
    : markedEntries.value.filter(entry => entry.canUpdate).map(entry => entry.id),
)

const bulkDeleteIds = computed(() =>
  statusFilter.value === 'trash'
    ? markedEntries.value.filter(entry => entry.canDelete).map(entry => entry.id)
    : [],
)

const emptyMessage = computed(() => {
  if (searchQuery.value || monthFilter.value !== 'all') {
    return 'No entries match.'
  }
  if (statusFilter.value === 'trash') {
    return 'Trash is empty.'
  }
  if (statusFilter.value === 'draft') {
    return 'No drafts.'
  }
  if (statusFilter.value === 'published') {
    return 'No published entries.'
  }
  return 'No entries yet.'
})

watch(searchQuery, (value) => {
  searchInput.value = value
}, { immediate: true })

function viewUrl(entry: AdminEntry): string | null {
  if (collection.value?.public === false) {
    return null
  }
  const path = buildPublicPath(
    collection.value?.rewrite,
    collectionSlug.value,
    entry.slugPath || entry.slug,
  )
  return entry.status === 'draft' ? `${path}?preview=1` : path
}

function entryListTitle(entry: AdminEntry): string {
  const depth = collection.value?.hierarchical ? (entry.depth ?? 0) : 0
  if (depth < 1) {
    return entry.title
  }
  return `${'— '.repeat(depth)}${entry.title}`
}

function formatListDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function entryAuthor(entry: AdminEntry): string {
  return entry.authorName?.trim() || '—'
}

function entryDateDisplay(entry: AdminEntry): { label: 'Published' | 'Last Modified', value: string } {
  const publishedMs = entry.publishedAt ? Date.parse(entry.publishedAt) : Number.NaN
  const updatedMs = Date.parse(entry.updatedAt)
  const hasPublished = !Number.isNaN(publishedMs)
  const hasUpdated = !Number.isNaN(updatedMs)
  const modified = entry.status !== 'published'
    || !hasPublished
    || (hasUpdated && updatedMs - publishedMs > 2000)

  if (!modified && entry.publishedAt) {
    return { label: 'Published', value: formatListDate(entry.publishedAt) }
  }
  return {
    label: 'Last Modified',
    value: formatListDate(hasUpdated ? entry.updatedAt : (entry.publishedAt ?? entry.createdAt)),
  }
}

async function navigateQuery(query: Record<string, string> = {}) {
  await navigateTo({
    path: paths.collection(collectionSlug.value),
    query,
  })
}

function listQuery(patch: {
  status?: CollectionListFilter
  q?: string
  page?: number
  month?: string
  sort?: CollectionListSort
} = {}) {
  const status = patch.status ?? statusFilter.value
  const q = patch.q ?? searchQuery.value
  const month = patch.month ?? monthFilter.value
  const sort = patch.sort ?? sortFilter.value
  const nextPage = patch.page ?? 1
  const query: Record<string, string> = {}
  if (q) {
    query.q = q
  }
  else if (status !== 'all') {
    query.status = status
  }
  if (month !== 'all') {
    query.month = month
  }
  if (sort !== 'date-desc') {
    query.sort = sort
  }
  if (nextPage > 1) {
    query.page = String(nextPage)
  }
  return query
}

function setStatus(status: CollectionListFilter) {
  return navigateQuery(listQuery({ status, q: '', page: 1 }))
}

function applySearch() {
  return navigateQuery(listQuery({
    q: searchInput.value.trim(),
    status: 'all',
    page: 1,
  }))
}

function setMonth(month: string) {
  return navigateQuery(listQuery({ month, page: 1 }))
}

function setSort(sort: CollectionListSort) {
  return navigateQuery(listQuery({ sort, page: 1 }))
}

function setPage(next: number) {
  return navigateQuery(listQuery({ page: next }))
}

const monthModel = computed({
  get(): SelectModelValue {
    return monthFilter.value
  },
  set(value: SelectModelValue) {
    const raw = typeof value === 'string' ? value : 'all'
    const month = raw === 'all' || /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : 'all'
    void setMonth(month)
  },
})

const sortModel = computed({
  get(): SelectModelValue {
    return sortFilter.value
  },
  set(value: SelectModelValue) {
    const raw = typeof value === 'string' ? value : 'date-desc'
    const sort = (COLLECTION_LIST_SORTS as readonly string[]).includes(raw)
      ? raw as CollectionListSort
      : 'date-desc'
    void setSort(sort)
  },
})

function isMarked(id: number): boolean {
  return markedIds.value.includes(id)
}

function toggleMarked(id: number) {
  markedIds.value = isMarked(id)
    ? markedIds.value.filter(entry => entry !== id)
    : [...markedIds.value, id]
}

async function load() {
  if (!collectionSlug.value) {
    return
  }
  loading.value = true
  error.value = null
  markedIds.value = []
  try {
    const res = await $fetch<CollectionListResponse>(collectionApi(collectionSlug.value), {
      query: {
        status: searchQuery.value ? undefined : statusFilter.value,
        q: searchQuery.value || undefined,
        month: monthFilter.value === 'all' ? undefined : monthFilter.value,
        sort: sortFilter.value,
        tz: localUtcOffsetMinutes(),
        page: page.value,
      },
    })
    collection.value = res.collection
    entries.value = res.entries
    months.value = res.months ?? []
    counts.value = res.counts
    total.value = res.total
    perPage.value = res.perPage
    canCreate.value = res.canCreate
    canDelete.value = res.canDelete
  }
  catch (err) {
    collection.value = null
    entries.value = []
    canDelete.value = false
    error.value = parseAuthError(err, 'Could not load entries.').message
  }
  finally {
    loading.value = false
  }
}

async function moveToTrash(entry: AdminEntry) {
  if (!entry.canUpdate || pendingId.value !== null) {
    return
  }
  if (!window.confirm(`Move “${entry.title}” to trash?`)) {
    return
  }
  pendingId.value = entry.id
  error.value = null
  try {
    await $fetch(collectionApi(collectionSlug.value, entry.id), {
      method: 'PATCH',
      body: { status: 'trash' satisfies CollectionStatus },
    })
    await load()
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not move the entry to trash.').message
  }
  finally {
    pendingId.value = null
  }
}

async function restore(entry: AdminEntry) {
  if (!entry.canUpdate || pendingId.value !== null) {
    return
  }
  pendingId.value = entry.id
  error.value = null
  try {
    await $fetch(collectionApi(collectionSlug.value, entry.id), {
      method: 'PATCH',
      body: { status: 'draft' satisfies CollectionStatus },
    })
    await load()
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not restore the entry.').message
  }
  finally {
    pendingId.value = null
  }
}

async function removePermanent(entry: AdminEntry) {
  if (!entry.canDelete || pendingId.value !== null) {
    return
  }
  if (!window.confirm(`Delete “${entry.title}” permanently? This cannot be undone.`)) {
    return
  }
  pendingId.value = entry.id
  error.value = null
  try {
    await $fetch(collectionApi(collectionSlug.value, entry.id), { method: 'DELETE' })
    await load()
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not delete the entry.').message
  }
  finally {
    pendingId.value = null
  }
}

async function removeMarked() {
  const trashIds = bulkTrashIds.value
  const deleteIds = bulkDeleteIds.value
  const ids = trashIds.length ? trashIds : deleteIds
  if (!ids.length || deletingMarked.value || pendingId.value !== null) {
    return
  }
  const permanent = deleteIds.length > 0
  const label = permanent
    ? (ids.length === 1
        ? 'Delete 1 entry permanently? This cannot be undone.'
        : `Delete ${ids.length} entries permanently? This cannot be undone.`)
    : (ids.length === 1
        ? 'Move 1 entry to trash?'
        : `Move ${ids.length} entries to trash?`)
  if (!window.confirm(label)) {
    return
  }
  deletingMarked.value = true
  error.value = null
  const failed: number[] = []
  await Promise.all(ids.map(async (id) => {
    try {
      if (permanent) {
        await $fetch(collectionApi(collectionSlug.value, id), { method: 'DELETE' })
      }
      else {
        await $fetch(collectionApi(collectionSlug.value, id), {
          method: 'PATCH',
          body: { status: 'trash' satisfies CollectionStatus },
        })
      }
    }
    catch {
      failed.push(id)
    }
  }))
  deletingMarked.value = false
  await load()
  if (failed.length) {
    error.value = failed.length === 1
      ? 'Could not update 1 entry.'
      : `Could not update ${failed.length} entries.`
  }
  else if (!entries.value.length && page.value > 1) {
    await setPage(page.value - 1)
  }
}

async function emptyTrash() {
  if (!canDelete.value || emptyingTrash.value || pendingId.value !== null || counts.value.trash <= 0) {
    return
  }
  if (!window.confirm('Permanently delete all items in the trash? This cannot be undone.')) {
    return
  }
  emptyingTrash.value = true
  error.value = null
  try {
    await $fetch(collectionApi(collectionSlug.value, 'trash'), { method: 'DELETE' })
    await load()
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not empty the trash.').message
  }
  finally {
    emptyingTrash.value = false
  }
}

onMounted(load)
watch([collectionSlug, statusFilter, searchQuery, monthFilter, sortFilter, page], load)
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsAdminHeader :title="title">
      <MiraiCmsUiButton
        v-if="canCreate && collection"
        tag="a"
        :link="{ url: paths.collectionCreate(collectionSlug), title: 'Add' }"
      >
        Add {{ collection.labels.singularName || collection.labels.name }}
      </MiraiCmsUiButton>

      <MiraiCmsUiButton
        v-if="bulkTrashIds.length"
        tag="button"
        variant="red"
        :disabled="deletingMarked || pendingId !== null || emptyingTrash"
        @click="removeMarked"
      >
        {{ deletingMarked ? 'Moving…' : `Trash selected (${bulkTrashIds.length})` }}
      </MiraiCmsUiButton>
      <MiraiCmsUiButton
        v-if="bulkDeleteIds.length"
        tag="button"
        variant="red"
        :disabled="deletingMarked || pendingId !== null || emptyingTrash"
        @click="removeMarked"
      >
        {{ deletingMarked ? 'Deleting…' : `Delete selected (${bulkDeleteIds.length})` }}
      </MiraiCmsUiButton>

      <MiraiCmsUiButton
        v-if="statusFilter === 'trash' && canDelete && counts.trash > 0"
        tag="button"
        variant="red"
        :disabled="emptyingTrash || pendingId !== null || loading"
        @click="emptyTrash"
      >
        {{ emptyingTrash ? 'Emptying…' : 'Empty Trash' }}
      </MiraiCmsUiButton>
    </MiraiCmsAdminHeader>

    <div :class="`${rootClass}__toolbar`">
      <div :class="`${rootClass}__tabs`">
        <MiraiCmsUiButton
          v-for="tab in [
            { id: 'all' as const, label: 'All', count: counts.all },
            { id: 'published' as const, label: 'Published', count: counts.published },
            { id: 'draft' as const, label: 'Draft', count: counts.draft },
            { id: 'trash' as const, label: 'Trash', count: counts.trash },
          ]"
          :key="tab.id"
          tag="button"
          variant="tertiary"
          :active="!searchQuery && statusFilter === tab.id"
          @click="setStatus(tab.id)"
        >
          {{ tab.label }}
          {{ tab.count }}
        </MiraiCmsUiButton>
      </div>

      <div :class="`${rootClass}__filters`">
        <MiraiCmsUiSelect
          id="collection-month"
          v-model="monthModel"
          :choices="monthChoices"
          aria-label="Date"
        />
        <MiraiCmsUiSelect
          id="collection-sort"
          v-model="sortModel"
          :choices="SORT_CHOICES"
          aria-label="Sort"
        />
      </div>

      <form
        :class="`${rootClass}__search`"
        @submit.prevent="applySearch"
      >
        <MiraiCmsInputControl
          v-model="searchInput"
          field-key="cms-collection-search"
          :field="{ placeholder: 'Search title or slug' }"
        />
        <MiraiCmsUiButton
          tag="button"
          type="submit"
          variant="secondary"
        >
          Search
        </MiraiCmsUiButton>
      </form>
    </div>

    <MiraiCmsUiNotice
      v-if="loading"
      placement="static"
      variant="info"
      message="Loading…"
      :closable="false"
    />
    <MiraiCmsUiNotice
      v-else-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = null"
    />
    <MiraiCmsUiNotice
      v-else-if="!entries.length"
      placement="static"
      variant="info"
      :message="emptyMessage"
      :closable="false"
    />

    <div
      v-else
      :class="`${rootClass}__table-wrap`"
    >
      <div
        :class="[`${rootClass}__columns`, `${rootClass}__columns--head`]"
        role="row"
      >
        <span
          role="columnheader"
          aria-label="Select"
        />
        <span role="columnheader">Title</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Author</span>
        <span role="columnheader">Date</span>
        <span
          role="columnheader"
          aria-label="Actions"
        />
      </div>
      <div :class="`${rootClass}__rows`">
        <div
          v-for="entry in entries"
          :key="entry.id"
          :class="[`${rootClass}__columns`, { 'is-marked': isMarked(entry.id) }]"
          role="row"
        >
          <div
            role="cell"
            :class="`${rootClass}__check`"
          >
            <input
              type="checkbox"
              :checked="isMarked(entry.id)"
              :aria-label="`Select ${entry.title}`"
              @change="toggleMarked(entry.id)"
            >
          </div>
          <div
            role="cell"
            :class="`${rootClass}__title`"
          >
            {{ entryListTitle(entry) }}
          </div>
          <div role="cell">
            <span
              :class="[`${rootClass}__status`, `${rootClass}__status--${entry.status}`]"
            >
              {{ collectionStatusLabel(entry.status) }}
            </span>
          </div>
          <div role="cell">
            {{ entryAuthor(entry) }}
          </div>
          <div
            role="cell"
            :class="`${rootClass}__date`"
          >
            <span :class="`${rootClass}__date-label`">{{ entryDateDisplay(entry).label }}</span>
            <span :class="`${rootClass}__date-value`">{{ entryDateDisplay(entry).value }}</span>
          </div>
          <div
            role="cell"
            :class="`${rootClass}__actions`"
          >
            <MiraiCmsUiButton
              v-if="entry.status !== 'trash' && viewUrl(entry)"
              tag="a"
              :variant="['secondary', 'small']"
              :link="{ url: viewUrl(entry)!, title: 'View', target: '_blank' }"
            >
              View
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              v-if="entry.canUpdate || entry.status === 'trash'"
              tag="a"
              :variant="['secondary', 'small']"
              :link="{
                url: paths.collectionEntry(collectionSlug, entry.id),
                title: 'Edit',
              }"
            >
              {{ entry.canUpdate ? 'Edit' : 'View' }}
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              v-if="entry.status !== 'trash' && entry.canUpdate"
              tag="button"
              :variant="['red', 'small']"
              :disabled="pendingId === entry.id || emptyingTrash"
              @click="moveToTrash(entry)"
            >
              Trash
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              v-if="entry.status === 'trash' && entry.canUpdate"
              tag="button"
              :variant="['secondary', 'small']"
              :disabled="pendingId === entry.id || emptyingTrash"
              @click="restore(entry)"
            >
              Restore
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              v-if="entry.status === 'trash' && entry.canDelete"
              tag="button"
              :variant="['red', 'small']"
              :disabled="pendingId === entry.id || emptyingTrash"
              @click="removePermanent(entry)"
            >
              Delete
            </MiraiCmsUiButton>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="totalPages > 1"
      :class="`${rootClass}__pager`"
    >
      <MiraiCmsUiButton
        tag="button"
        :variant="['secondary', 'small']"
        :disabled="page <= 1 || loading"
        @click="setPage(page - 1)"
      >
        Previous
      </MiraiCmsUiButton>
      <span :class="`${rootClass}__pager-status`">
        Page {{ page }} of {{ totalPages }}
      </span>
      <MiraiCmsUiButton
        tag="button"
        :variant="['secondary', 'small']"
        :disabled="page >= totalPages || loading"
        @click="setPage(page + 1)"
      >
        Next
      </MiraiCmsUiButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.miraicms-collection-list';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: math-rem(16);
    min-height: 0;
    padding: 0 math-rem(8) math-rem(8);
    overflow: hidden;

    &__toolbar {
      display: flex;
      flex-shrink: 0;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: math-rem(12);
    }

    &__tabs {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(4);
    }

    &__tab {
      display: inline-flex;
      align-items: center;
      gap: math-rem(6);
      margin: 0;
      padding: math-rem(6) math-rem(10);
      border: 0;
      border-radius: $border-radius-inter;
      background: transparent;
      color: $color-muted;
      font: inherit;
      font-size: math-rem(13);
      font-weight: 500;
      cursor: pointer;

      &:hover {
        background: $color-bg;
        color: $color-ink;
      }

      &.is-active {
        background: $color-accent-wash;
        color: $color-accent;
      }

      &-count {
        font-size: math-rem(12);
        font-weight: 600;
        color: inherit;
        opacity: 0.75;
      }
    }

    &__search {
      display: flex;
      align-items: center;
      gap: math-rem(8);
      min-width: math-rem(220);
    }

    &__filters {
      display: flex;
      flex: 1 1 math-rem(360);
      flex-wrap: wrap;
      gap: math-rem(8);
      min-width: math-rem(280);

      :deep(.miraicms-select) {
        flex: 1 1 math-rem(180);
        min-width: math-rem(180);
        max-width: math-rem(260);
      }
    }

    &__table {
      &-wrap {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow-x: auto;
        overflow-y: hidden;
        background: $color-surface;
        border: 1px solid $color-border;
        border-radius: $border-radius;
      }
    }

    &__columns {
      display: grid;
      grid-template-columns: math-rem(44) minmax(math-rem(180), 2.2fr) math-rem(110) minmax(math-rem(120), 1fr) math-rem(190) minmax(math-rem(160), auto);
      align-items: center;
      min-width: math-rem(820);

      > [role='columnheader'],
      > [role='cell'] {
        min-width: 0;
        padding: math-rem(10) math-rem(14);
      }

      &--head {
        flex-shrink: 0;
        background: $color-bg;
        border-bottom: 1px solid $color-border;

        > [role='columnheader'] {
          font-size: math-rem(12);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: $color-muted;
        }
      }
    }

    &__rows {
      flex: 1;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;

      #{$root}__columns {
        border-bottom: 1px solid $color-border;

        &:last-child {
          border-bottom: none;
        }

        &.is-marked {
          background: $color-accent-wash;
        }
      }
    }

    &__check {
      display: flex;
      align-items: center;

      input {
        width: math-rem(16);
        height: math-rem(16);
        margin: 0;
        accent-color: $color-accent;
        cursor: pointer;
      }
    }

    &__title {
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    &__status {
      display: inline-block;
      padding: math-rem(2) math-rem(8);
      border-radius: $border-radius-inter;
      font-size: math-rem(12);
      font-weight: 600;

      &--published {
        background: $color-success-bg;
        color: $color-success;
      }

      &--draft {
        background: $color-info-bg;
        color: $color-info;
      }

      &--trash {
        background: $color-danger-bg;
        color: $color-danger;
      }
    }

    &__date {
      display: flex;
      flex-direction: column;
      gap: math-rem(2);
      white-space: nowrap;

      &-label {
        font-size: math-rem(12);
        color: $color-muted;
      }

      &-value {
        font-size: math-rem(13);
      }
    }

    &__actions {
      text-align: right;
      white-space: nowrap;

      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: math-rem(6);
    }

    &__pager {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: flex-end;
      gap: math-rem(12);

      &-status {
        font-size: math-rem(13);
        color: $color-muted;
      }
    }
  }
}
</style>
