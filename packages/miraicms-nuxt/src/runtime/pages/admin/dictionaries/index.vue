<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { $fetch, useHead, useRoute, useRuntimeConfig } from '#imports'
import { buildFormValues } from '@miraicms/core'
import { parseAuthError } from '../../../utils/auth-error'
import type { PublicCollectionNav } from '../../../utils/collections'
import { dictionaryApi } from '../../../utils/dictionaries'
import type {
  AdminDictionaryMeta,
  AdminDictionaryTerm,
  DictionaryListResponse,
  DictionaryTermFormModel,
  ParentOption,
} from '../../../utils/dictionaries'
import { useCmsPaths } from '../../../composables/useCmsPaths'

const route = useRoute()
const paths = useCmsPaths()
const collectionsNav = (useRuntimeConfig().public.miraicms?.collections ?? {}) as Record<string, PublicCollectionNav>
const rootClass = 'miraicms-dictionary-list'
const createFormId = 'cms-dictionary-create-form'

const dictionarySlug = computed(() => String(route.params.dictionary ?? ''))

const dictionary = ref<AdminDictionaryMeta | null>(null)
const terms = ref<AdminDictionaryTerm[]>([])
const parents = ref<ParentOption[]>([])
const canCreate = ref(false)

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const createError = ref<string | null>(null)
const pendingId = ref<number | null>(null)
const createKey = ref(0)

const form = reactive<DictionaryTermFormModel>({
  title: '',
  slug: '',
  parentId: null,
  fields: {},
})

const title = computed(() => dictionary.value?.labels.name || 'Dictionary')
useHead({ title })

const attachedLabel = computed(() => {
  const slugs = dictionary.value?.collections ?? []
  if (slugs.length === 0) {
    return ''
  }
  const names = slugs.map(slug => collectionsNav[slug]?.labels?.name || slug)
  return `Used on ${names.join(', ')}`
})

function termListTitle(term: AdminDictionaryTerm): string {
  const depth = term.depth ?? 0
  if (depth < 1) {
    return term.title
  }
  return `${'— '.repeat(depth)}${term.title}`
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

function resetCreateForm() {
  form.title = ''
  form.slug = ''
  form.parentId = null
  form.fields = dictionary.value
    ? buildFormValues(dictionary.value.fields ?? {})
    : {}
  createKey.value += 1
}

async function load(showLoading = true) {
  if (!dictionarySlug.value) {
    return
  }
  if (showLoading) {
    loading.value = true
  }
  error.value = null
  try {
    const res = await $fetch<DictionaryListResponse>(dictionaryApi(dictionarySlug.value))
    dictionary.value = res.dictionary
    terms.value = res.terms
    parents.value = res.parents
    canCreate.value = res.canCreate
    if (createKey.value === 0) {
      form.fields = buildFormValues(res.dictionary.fields ?? {})
    }
  }
  catch (err) {
    if (showLoading) {
      dictionary.value = null
      terms.value = []
      parents.value = []
    }
    error.value = parseAuthError(err, 'Could not load the dictionary.').message
  }
  finally {
    loading.value = false
  }
}

async function createTerm() {
  if (saving.value || !dictionary.value || !canCreate.value) {
    return
  }
  saving.value = true
  createError.value = null
  try {
    await $fetch(dictionaryApi(dictionarySlug.value), {
      method: 'POST',
      body: {
        title: form.title.trim(),
        slug: form.slug.trim(),
        fields: form.fields,
        parentId: form.parentId,
      },
    })
    resetCreateForm()
    await load(false)
  }
  catch (err) {
    createError.value = parseAuthError(err, 'Could not create the term.').message
  }
  finally {
    saving.value = false
  }
}

async function removeTerm(term: AdminDictionaryTerm) {
  if (!term.canDelete || pendingId.value !== null) {
    return
  }
  if (!window.confirm(`Delete “${term.title}”? Child terms will become top-level. This cannot be undone.`)) {
    return
  }
  pendingId.value = term.id
  error.value = null
  try {
    await $fetch(dictionaryApi(dictionarySlug.value, term.id), { method: 'DELETE' })
    await load(false)
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not delete the term.').message
  }
  finally {
    pendingId.value = null
  }
}

onMounted(load)
watch(dictionarySlug, async () => {
  createError.value = null
  await load()
  resetCreateForm()
})
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsAdminHeader
      :title="title"
      :meta="attachedLabel"
    />

    <MiraiCmsUiNotice
      v-if="loading"
      placement="static"
      variant="info"
      message="Loading…"
      :closable="false"
    />
    <MiraiCmsUiNotice
      v-else-if="error && !dictionary"
      placement="static"
      variant="danger"
      :message="error"
      :closable="false"
    />

    <div
      v-else-if="dictionary"
      :class="`${rootClass}__layout`"
    >
      <div
        v-if="canCreate"
        :class="`${rootClass}__create`"
      >
        <div :class="`${rootClass}__create-title`">
          Add {{ dictionary.labels.singularName }}
        </div>
        <MiraiCmsDictionaryTermForm
          :key="createKey"
          :form-id="createFormId"
          :model-value="form"
          :dictionary="dictionary"
          :entry-key="`new-${createKey}`"
          :parents="parents"
          :saving="saving"
          :error="createError"
          :can-update="true"
          :submit-label="saving ? 'Adding…' : `Add ${dictionary.labels.singularName}`"
          @update:model-value="(value: DictionaryTermFormModel) => Object.assign(form, value)"
          @submit="createTerm"
        />
      </div>

      <div :class="`${rootClass}__list`">
        <MiraiCmsUiNotice
          v-if="error"
          placement="static"
          variant="danger"
          :message="error"
          @close="error = null"
        />
        <MiraiCmsUiNotice
          v-else-if="!terms.length"
          placement="static"
          variant="info"
          :message="`No ${dictionary.labels.name.toLowerCase()} yet.`"
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
            <span role="columnheader">Title</span>
            <span role="columnheader">Slug</span>
            <span role="columnheader">Date</span>
            <span
              role="columnheader"
              aria-label="Actions"
            />
          </div>
          <div :class="`${rootClass}__rows`">
            <div
              v-for="term in terms"
              :key="term.id"
              :class="`${rootClass}__columns`"
              role="row"
            >
              <div role="cell">
                {{ termListTitle(term) }}
              </div>
              <div role="cell">
                {{ term.slug }}
              </div>
              <div role="cell">
                {{ formatListDate(term.updatedAt) }}
              </div>
              <div
                role="cell"
                :class="`${rootClass}__actions`"
              >
                <MiraiCmsUiButton
                  v-if="term.canUpdate"
                  tag="a"
                  :variant="['secondary', 'small']"
                  :link="{
                    url: paths.dictionaryTerm(dictionarySlug, term.id),
                    title: 'Edit',
                  }"
                >
                  Edit
                </MiraiCmsUiButton>
                <MiraiCmsUiButton
                  v-if="term.canDelete"
                  tag="button"
                  :variant="['red', 'small']"
                  :disabled="pendingId === term.id"
                  @click="removeTerm(term)"
                >
                  Delete
                </MiraiCmsUiButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.miraicms-dictionary-list';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);
    padding: 0 math-rem(8);
    height: 100%;

    &__layout {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(8);
      align-items: start;
      flex-grow: 1;
      min-height: 0;
      overflow: hidden;
    }

    &__create {
      flex: 0 0 400px;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: math-rem(10);
      min-width: 0;
      min-height: 0;
      height: 100%;
      overflow: auto;
      padding: 0 math-rem(8) math-rem(8) 0;
    }

    &__create-title {
      flex-shrink: 0;
      font-size: math-rem(15);
      font-weight: 600;
    }

    &__list {
      flex-basis: 0;
      flex-grow: 1;
      align-self: stretch;
      max-width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: math-rem(12);
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      padding-bottom: math-rem(8);
    }

    &__table-wrap {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow-x: auto;
      overflow-y: hidden;
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
    }

    &__columns {
      display: grid;
      grid-template-columns: minmax(math-rem(160), 2fr) minmax(math-rem(120), 1.4fr) math-rem(200) minmax(math-rem(140), auto);
      align-items: center;
      min-width: math-rem(640);

      > [role='columnheader'],
      > [role='cell'] {
        min-width: 0;
        padding: math-rem(10) math-rem(14);
        overflow-wrap: anywhere;
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
      }
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: math-rem(8);
    }
  }
}
</style>
