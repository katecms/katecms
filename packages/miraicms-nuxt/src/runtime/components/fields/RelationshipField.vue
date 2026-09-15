<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRuntimeConfig } from '#imports'
import {
  encodeRelationEntryValue,
  isImageMedia,
  isRelationEntryValue,
  relationFieldIds,
} from '@miraicms/core'
import type { Field, SelectChoice, SelectModelValue } from '@miraicms/core'
import type { PublicCollectionNav } from '../../utils/collections'
import type { PublicDictionaryNav } from '../../utils/dictionaries'
import { relationEntriesApi, relationTermsApi } from '../../utils/relation'
import type { RelationEntriesResponse, RelationPickerEntry, RelationTermsResponse } from '../../utils/relation'

type RelationshipFieldConfig = Extract<Field, { type: 'relationship' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: RelationshipFieldConfig
}>(), {
  field: () => ({ type: 'relationship', label: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-relationship-field'
const collectionsNav = (useRuntimeConfig().public.miraicms?.collections ?? {}) as Record<string, PublicCollectionNav>
const dictionariesNav = (useRuntimeConfig().public.miraicms?.dictionaries ?? {}) as Record<string, PublicDictionaryNav>

function entriesFromModel(value: unknown): RelationPickerEntry[] {
  const items = Array.isArray(value) ? value : value != null && value !== '' ? [value] : []
  return items.filter(isRelationEntryValue)
}

const entries = ref<RelationPickerEntry[]>(entriesFromModel(model.value))
const termsByDictionary = ref<Record<string, RelationTermsResponse['terms']>>({})
const loading = ref(false)
const loadError = ref<string | null>(null)
const search = ref('')
const postTypeFilter = ref('')
const termFilter = ref('')

const filters = computed(() => props.field?.filters ?? ['search'])
const showSearch = computed(() => filters.value.includes('search'))
const showPostType = computed(() => (
  filters.value.includes('post_type') && collectionChoices.value.length > 1
))
const showDictionary = computed(() => (
  filters.value.includes('dictionary') && dictionarySlugs.value.length > 0
))
const imageFieldKeys = computed(() => (
  (props.field?.elements ?? []).map(key => key.trim()).filter(Boolean)
))
const showFeatured = computed(() => imageFieldKeys.value.length > 0)

const collectionChoices = computed<SelectChoice[]>(() => {
  const slugs = props.field?.postType?.length
    ? props.field.postType
    : Object.keys(collectionsNav)
  return slugs
    .filter(slug => slug in collectionsNav || (props.field?.postType ?? []).includes(slug))
    .map(slug => ({
      val: slug,
      lbl: collectionsNav[slug]?.labels?.name || slug,
    }))
})

const dictionarySlugs = computed(() => {
  if (props.field?.dictionary?.length) {
    return props.field.dictionary
  }
  return Object.keys(dictionariesNav)
})

const termChoices = computed<SelectChoice[]>(() => {
  const choices: SelectChoice[] = []
  for (const slug of dictionarySlugs.value) {
    const terms = termsByDictionary.value[slug] ?? []
    const group = dictionariesNav[slug]?.labels?.name || slug
    for (const term of terms) {
      const depth = term.depth ?? 0
      const title = depth < 1 ? term.title : `${'— '.repeat(depth)}${term.title}`
      choices.push({
        val: String(term.id),
        lbl: dictionarySlugs.value.length > 1 ? `${group}: ${title}` : title,
      })
    }
  }
  return choices
})

const selectedIds = computed(() => relationFieldIds(model.value))

const selectedEntries = computed(() => {
  return selectedIds.value
    .map(id => entries.value.find(entry => String(entry.id) === id))
    .filter((entry): entry is RelationPickerEntry => !!entry)
})

const availableEntries = computed(() => {
  const selected = new Set(selectedIds.value)
  const q = search.value.trim().toLowerCase()
  const type = postTypeFilter.value
  const termId = termFilter.value
  return entries.value.filter((entry) => {
    if (selected.has(String(entry.id))) {
      return false
    }
    if (type && entry.type !== type) {
      return false
    }
    if (termId && !(entry.termIds ?? []).includes(Number(termId))) {
      return false
    }
    if (q) {
      const haystack = `${entry.title} ${entry.slug} ${entry.slugPath}`.toLowerCase()
      if (!haystack.includes(q)) {
        return false
      }
    }
    return true
  })
})

const atMax = computed(() => {
  const max = props.field?.max
  return typeof max === 'number' && max > 0 && selectedIds.value.length >= max
})

const belowMin = computed(() => {
  const min = props.field?.min
  return typeof min === 'number' && min > 0 && selectedIds.value.length < min
})

function collectionLabel(slug: string): string {
  return collectionsNav[slug]?.labels?.singularName
    || collectionsNav[slug]?.labels?.name
    || slug
}

function thumbUrl(entry: RelationPickerEntry): string | undefined {
  const image = entry.featuredImage
  return image && isImageMedia(image) ? image.url : undefined
}

function findEntry(id: string): RelationPickerEntry | undefined {
  return entries.value.find(entry => String(entry.id) === id)
}

function commit(ids: string[]) {
  const max = props.field?.max
  const next = typeof max === 'number' && max > 0 ? ids.slice(0, max) : ids
  model.value = next
    .map(id => findEntry(id))
    .filter((entry): entry is RelationPickerEntry => !!entry)
    .map(entry => encodeRelationEntryValue(entry, props.field?.returnFormat))
}

function addEntry(entry: RelationPickerEntry) {
  if (atMax.value) {
    return
  }
  const id = String(entry.id)
  if (selectedIds.value.includes(id)) {
    return
  }
  commit([...selectedIds.value, id])
}

function removeEntry(id: string) {
  commit(selectedIds.value.filter(item => item !== id))
}

function moveEntry(id: string, delta: number) {
  const ids = [...selectedIds.value]
  const index = ids.indexOf(id)
  const next = index + delta
  if (index < 0 || next < 0 || next >= ids.length) {
    return
  }
  const [item] = ids.splice(index, 1)
  ids.splice(next, 0, item)
  commit(ids)
}

const postTypeModel = computed<SelectModelValue>({
  get: () => postTypeFilter.value,
  set: (raw) => {
    postTypeFilter.value = raw == null ? '' : String(raw)
  },
})

const termModel = computed<SelectModelValue>({
  get: () => termFilter.value,
  set: (raw) => {
    termFilter.value = raw == null ? '' : String(raw)
  },
})

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const res = await $fetch<RelationEntriesResponse>(relationEntriesApi({
      postType: props.field?.postType,
      elements: imageFieldKeys.value,
    }))
    const byId = new Map(res.entries.map(entry => [entry.id, entry]))
    for (const existing of entries.value) {
      if (!byId.has(existing.id)) {
        byId.set(existing.id, existing)
      }
    }
    entries.value = [...byId.values()]

    if (showDictionary.value) {
      const loaded = await Promise.all(dictionarySlugs.value.map(async (slug) => {
        try {
          const terms = await $fetch<RelationTermsResponse>(relationTermsApi(slug))
          return [slug, terms.terms] as const
        }
        catch {
          return [slug, []] as const
        }
      }))
      termsByDictionary.value = Object.fromEntries(loaded)
    }

    const ids = relationFieldIds(model.value)
    if (ids.length) {
      commit(ids)
    }
  }
  catch {
    loadError.value = 'Could not load entries.'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div
        v-if="loadError"
        :class="`${rootClass}__error`"
      >
        {{ loadError }}
      </div>

      <div
        v-if="showSearch || showPostType || showDictionary"
        :class="`${rootClass}__filters`"
      >
        <input
          v-if="showSearch"
          v-model="search"
          type="search"
          :class="`${rootClass}__search`"
          placeholder="Search entries"
          aria-label="Search entries"
          :disabled="loading"
        >
        <div
          v-if="showPostType"
          :class="`${rootClass}__filter`"
        >
          <MiraiCmsUiSelect
            :id="`${fieldKey}_post_type`"
            v-model="postTypeModel"
            :choices="collectionChoices"
            placeholder="All types"
            selected-opt-clearable
            search
            search-placeholder="Filter type"
            :disabled="loading"
            aria-label="Collection type"
          />
        </div>
        <div
          v-if="showDictionary"
          :class="`${rootClass}__filter`"
        >
          <MiraiCmsUiSelect
            :id="`${fieldKey}_term`"
            v-model="termModel"
            :choices="termChoices"
            placeholder="All terms"
            selected-opt-clearable
            search
            search-placeholder="Filter term"
            :disabled="loading"
            aria-label="Dictionary term"
          />
        </div>
      </div>

      <div
        v-if="belowMin"
        :class="`${rootClass}__hint`"
      >
        Select at least {{ field?.min }}.
      </div>

      <div :class="`${rootClass}__columns`">
        <div :class="`${rootClass}__column`">
          <div :class="`${rootClass}__column-title`">
            Available
          </div>
          <div :class="`${rootClass}__list`">
            <div
              v-for="entry in availableEntries"
              :key="entry.id"
            >
              <button
                type="button"
                :class="`${rootClass}__item`"
                :disabled="loading || atMax"
                @click="addEntry(entry)"
              >
                <img
                  v-if="showFeatured && thumbUrl(entry)"
                  :src="thumbUrl(entry)"
                  alt=""
                  :class="`${rootClass}__thumb`"
                >
                <span :class="`${rootClass}__item-body`">
                  <span :class="`${rootClass}__item-title`">{{ entry.title }}</span>
                  <span :class="`${rootClass}__item-meta`">{{ collectionLabel(entry.type) }}</span>
                </span>
              </button>
            </div>
            <div
              v-if="!availableEntries.length"
              :class="`${rootClass}__empty`"
            >
              {{ loading ? 'Loading…' : 'No entries' }}
            </div>
          </div>
        </div>

        <div :class="`${rootClass}__column`">
          <div :class="`${rootClass}__column-title`">
            Selected
          </div>
          <div :class="`${rootClass}__list`">
            <div
              v-for="(entry, index) in selectedEntries"
              :key="entry.id"
              :class="`${rootClass}__selected`"
            >
              <div :class="`${rootClass}__item ${rootClass}__item--static`">
                <img
                  v-if="showFeatured && thumbUrl(entry)"
                  :src="thumbUrl(entry)"
                  alt=""
                  :class="`${rootClass}__thumb`"
                >
                <span :class="`${rootClass}__item-body`">
                  <span :class="`${rootClass}__item-title`">{{ entry.title }}</span>
                  <span :class="`${rootClass}__item-meta`">{{ collectionLabel(entry.type) }}</span>
                </span>
              </div>
              <div :class="`${rootClass}__item-actions`">
                <MiraiCmsUiButton
                  tag="button"
                  :variant="['tertiary', 'small', 'icon']"
                  :disabled="index === 0"
                  title="Move up"
                  aria-label="Move up"
                  @click="moveEntry(String(entry.id), -1)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M6 14l6-6 6 6" />
                  </svg>
                </MiraiCmsUiButton>
                <MiraiCmsUiButton
                  tag="button"
                  :variant="['tertiary', 'small', 'icon']"
                  :disabled="index === selectedEntries.length - 1"
                  title="Move down"
                  aria-label="Move down"
                  @click="moveEntry(String(entry.id), 1)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M6 10l6 6 6-6" />
                  </svg>
                </MiraiCmsUiButton>
                <MiraiCmsUiButton
                  tag="button"
                  :variant="['tertiary', 'small', 'icon']"
                  title="Remove"
                  aria-label="Remove"
                  @click="removeEntry(String(entry.id))"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </MiraiCmsUiButton>
              </div>
            </div>
            <div
              v-if="!selectedEntries.length"
              :class="`${rootClass}__empty`"
            >
              Nothing selected
            </div>
          </div>
        </div>
      </div>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-relationship-field';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(10);

  &__error {
    margin: 0;
    color: $color-danger;
    font-size: math-rem(13);
  }

  &__hint {
    margin: 0;
    color: $color-warning;
    font-size: math-rem(13);
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(8);
    align-items: stretch;
  }

  &__filter {
    flex: 1 1 math-rem(160);
    min-width: 0;
  }

  &__search {
    flex: 1 1 math-rem(160);
    min-width: 0;
    height: math-rem(40);
    padding: 0 math-rem(10);
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $color-surface;
    color: $color-ink;
    font-size: math-rem(14);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: $color-accent;
    }
  }

  &__columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: math-rem(12);

    @media (max-width: 800px) {
      grid-template-columns: 1fr;
    }
  }

  &__column {
    min-width: 0;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $color-surface;
    overflow: hidden;
  }

  &__column-title {
    padding: math-rem(8) math-rem(10);
    font-size: math-rem(12);
    font-weight: 600;
    color: $color-muted;
    background: $color-bg;
    border-bottom: 1px solid $color-border;
  }

  &__list {
    margin: 0;
    padding: math-rem(6);
    max-height: math-rem(280);
    overflow: auto;
  }

  &__empty {
    padding: math-rem(10);
    color: $color-muted;
    font-size: math-rem(13);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: math-rem(8);
    width: 100%;
    padding: math-rem(6);
    border: 0;
    border-radius: $border-radius-inter;
    background: transparent;
    color: $color-ink;
    text-align: left;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: $color-accent-wash;
    }

    &:disabled {
      cursor: default;
      opacity: 0.55;
    }

    &--static {
      cursor: default;
      flex: 1 1 auto;
      min-width: 0;

      &:hover {
        background: transparent;
      }
    }
  }

  &__thumb {
    width: math-rem(36);
    height: math-rem(36);
    object-fit: cover;
    border-radius: $border-radius-inter;
    background: $color-bg;
    flex: 0 0 auto;
  }

  &__item-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }

  &__item-title {
    font-size: math-rem(14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__item-meta {
    font-size: math-rem(12);
    color: $color-muted;
  }

  &__selected {
    display: flex;
    align-items: center;
    gap: math-rem(4);
  }

  &__item-actions {
    display: flex;
    flex: 0 0 auto;
    gap: 2px;
  }
}
</style>
