<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { $fetch, navigateTo, useHead, useRoute } from '#imports'
import { buildPublicPath } from '@miraicms/core'
import type { CollectionStatus } from '@miraicms/core'
import { parseAuthError } from '../../../utils/auth-error'
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

const collection = ref<AdminCollectionMeta | null>(null)
const entries = ref<AdminEntry[]>([])
const counts = ref({ all: 0, published: 0, draft: 0, trash: 0 })
const total = ref(0)
const perPage = ref(10)
const canCreate = ref(false)
const canDelete = ref(false)

const loading = ref(true)
const error = ref<string | null>(null)
const pendingId = ref<number | null>(null)
const emptyingTrash = ref(false)
const searchInput = ref('')

const title = computed(() => collection.value?.labels.name || '')
useHead({ title })

const totalPages = computed(() => {
  if (perPage.value < 1) {
    return 1
  }
  return Math.max(1, Math.ceil(total.value / perPage.value))
})

const emptyMessage = computed(() => {
  if (searchQuery.value) {
    return 'No entries match this search.'
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

function setStatus(status: CollectionListFilter) {
  return navigateQuery(status === 'all' ? {} : { status })
}

function applySearch() {
  const q = searchInput.value.trim()
  return navigateQuery(q ? { q } : {})
}

function setPage(next: number) {
  const query: Record<string, string> = {}
  if (searchQuery.value) {
    query.q = searchQuery.value
  }
  else if (statusFilter.value !== 'all') {
    query.status = statusFilter.value
  }
  if (next > 1) {
    query.page = String(next)
  }
  return navigateQuery(query)
}

async function load() {
  if (!collectionSlug.value) {
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<CollectionListResponse>(collectionApi(collectionSlug.value), {
      query: {
        status: searchQuery.value ? undefined : statusFilter.value,
        q: searchQuery.value || undefined,
        page: page.value,
      },
    })
    collection.value = res.collection
    entries.value = res.entries
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
watch([collectionSlug, statusFilter, searchQuery, page], load)
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__head`">
      <div :class="`${rootClass}__head-title`">
        {{ title }}
      </div>
      <div :class="`${rootClass}__head-actions`">
        <MiraiCmsUiButton
          v-if="canCreate && collection"
          tag="a"
          :link="{ url: paths.collectionCreate(collectionSlug), title: 'Add' }"
        >
          Add {{ collection.labels.singularName || collection.labels.name }}
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
      </div>
    </div>

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
      <table :class="`${rootClass}__table`">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Author</th>
            <th>Date</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in entries"
            :key="entry.id"
          >
            <td>
              <div :class="`${rootClass}__title`">
                {{ entryListTitle(entry) }}
              </div>
            </td>
            <td>
              <span
                :class="[`${rootClass}__status`, `${rootClass}__status--${entry.status}`]"
              >
                {{ collectionStatusLabel(entry.status) }}
              </span>
            </td>
            <td>{{ entryAuthor(entry) }}</td>
            <td>
              <div :class="`${rootClass}__date`">
                <span :class="`${rootClass}__date-label`">{{ entryDateDisplay(entry).label }}</span>
                <span :class="`${rootClass}__date-value`">{{ entryDateDisplay(entry).value }}</span>
              </div>
            </td>
            <td>
              <div :class="`${rootClass}__actions`">
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
            </td>
          </tr>
        </tbody>
      </table>
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
    flex-direction: column;
    gap: math-rem(16);
    padding: math-rem(8);

    &__head {
      display: flex;
      align-items: center;
      gap: math-rem(16);

      &-title {
        font-size: math-rem(18);
        font-weight: 600;
      }

      &-actions {
        display: flex;
        align-items: center;
        gap: math-rem(16);
      }
    }

    &__toolbar {
      display: flex;
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
    }

    &__tab-count {
      font-size: math-rem(12);
      font-weight: 600;
      color: inherit;
      opacity: 0.75;
    }

    &__search {
      display: flex;
      align-items: center;
      gap: math-rem(8);
      min-width: math-rem(220);
    }

    &__table-wrap {
      overflow-x: auto;
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
    }

    &__table {
      width: 100%;
      border-collapse: collapse;
      font-size: math-rem(14);

      th,
      td {
        text-align: left;
        padding: math-rem(10) math-rem(14);
        border-bottom: 1px solid $color-border;
        vertical-align: middle;
      }

      th {
        font-size: math-rem(12);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: $color-muted;
        background: $color-bg;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }
    }

    &__title {
      font-weight: 600;
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
    }

    &__date-label {
      font-size: math-rem(12);
      color: $color-muted;
    }

    &__date-value {
      font-size: math-rem(13);
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
      align-items: center;
      justify-content: flex-end;
      gap: math-rem(12);
    }

    &__pager-status {
      font-size: math-rem(13);
      color: $color-muted;
    }
  }
}
</style>
