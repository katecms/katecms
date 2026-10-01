<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useHead } from '#imports'
import type { SeoRedirect } from '../../types'

useHead({ title: 'SEO' })

const rootClass = 'miraicms-seo-settings'

const form = reactive({
  siteName: '',
  titleSeparator: '|',
  titleTemplate: '%title% %sep% %sitename%',
  description: '',
  noindex: false,
})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)
const REDIRECT_TYPES = [
  { value: 301, label: '301 Moved Permanently' },
  { value: 302, label: '302 Found' },
  { value: 307, label: '307 Temporary Redirect' },
  { value: 410, label: '410 Content Deleted' },
  { value: 451, label: '451 Unavailable For Legal Reasons' },
] as const

const redirects = ref<SeoRedirect[]>([])
const redirectForm = reactive({ from: '', to: '', statusCode: '301' })
const editingId = ref<number | null>(null)
const redirectError = ref('')
const redirectSaving = ref(false)
const redirectDeleting = ref(false)
const searchInput = ref('')
const typeFilter = ref('all')
const markedIds = ref<number[]>([])

const filterTypeChoices = [
  { val: 'all', lbl: 'Filter Redirect type' },
  ...REDIRECT_TYPES.map(item => ({ val: String(item.value), lbl: item.label })),
]
const formTypeChoices = REDIRECT_TYPES.map(item => ({ val: String(item.value), lbl: item.label }))
const formTypeField = {
  type: 'select' as const,
  label: 'Type',
  returnFormat: 'value' as const,
  choices: formTypeChoices,
}

const filteredRedirects = computed(() => {
  const query = searchInput.value.trim().toLowerCase()
  return redirects.value.filter((item) => {
    if (typeFilter.value !== 'all' && String(item.statusCode) !== typeFilter.value) {
      return false
    }
    if (!query) {
      return true
    }
    return item.from.toLowerCase().includes(query)
      || item.to.toLowerCase().includes(query)
      || redirectLabel(item.statusCode).toLowerCase().includes(query)
  })
})

const allVisibleMarked = computed({
  get() {
    return filteredRedirects.value.length > 0
      && filteredRedirects.value.every(item => markedIds.value.includes(item.id))
  },
  set(checked: boolean) {
    const visible = filteredRedirects.value.map(item => item.id)
    if (checked) {
      markedIds.value = [...new Set([...markedIds.value, ...visible])]
      return
    }
    const hidden = new Set(visible)
    markedIds.value = markedIds.value.filter(id => !hidden.has(id))
  },
})

watch(filteredRedirects, (rows) => {
  const visible = new Set(rows.map(item => item.id))
  markedIds.value = markedIds.value.filter(id => visible.has(id))
})

function redirectLabel(statusCode: number): string {
  return REDIRECT_TYPES.find(item => item.value === statusCode)?.label ?? String(statusCode)
}

function isTerminal(statusCode: number | string): boolean {
  const code = Number(statusCode)
  return code === 410 || code === 451
}

function setMarked(id: number, marked: boolean) {
  markedIds.value = marked
    ? [...new Set([...markedIds.value, id])]
    : markedIds.value.filter(item => item !== id)
}

function errMessage(err: unknown, fallback: string): string {
  const e = err as { statusMessage?: string, data?: { message?: string, statusMessage?: string } }
  return e.data?.statusMessage || e.data?.message || e.statusMessage || fallback
}

function apply(data: typeof form) {
  form.siteName = data.siteName
  form.titleSeparator = data.titleSeparator
  form.titleTemplate = data.titleTemplate
  form.description = data.description
  form.noindex = data.noindex
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [site, rows] = await Promise.all([
      $fetch<typeof form>('/api/_miraicms/seo/site'),
      $fetch<SeoRedirect[]>('/api/_miraicms/seo/redirects'),
    ])
    apply(site)
    redirects.value = rows
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load SEO settings.')
  }
  finally {
    loading.value = false
  }
}

function resetRedirectForm() {
  editingId.value = null
  redirectForm.from = ''
  redirectForm.to = ''
  redirectForm.statusCode = '301'
}

function editRedirect(item: SeoRedirect) {
  editingId.value = item.id
  redirectForm.from = item.from
  redirectForm.to = item.to
  redirectForm.statusCode = String(item.statusCode)
  redirectError.value = ''
}

async function addRedirect() {
  if (redirectSaving.value) {
    return
  }
  redirectSaving.value = true
  redirectError.value = ''
  try {
    redirects.value = await $fetch<SeoRedirect[]>('/api/_miraicms/seo/redirects', {
      method: editingId.value ? 'PATCH' : 'POST',
      body: {
        id: editingId.value ?? undefined,
        from: redirectForm.from,
        to: isTerminal(redirectForm.statusCode) ? '' : redirectForm.to,
        statusCode: Number(redirectForm.statusCode) || 301,
      },
    })
    resetRedirectForm()
  }
  catch (err) {
    redirectError.value = errMessage(err, 'Could not save the redirect.')
  }
  finally {
    redirectSaving.value = false
  }
}

async function removeRedirect(id: number) {
  if (redirectDeleting.value) {
    return
  }
  redirectDeleting.value = true
  redirectError.value = ''
  try {
    redirects.value = await $fetch<SeoRedirect[]>('/api/_miraicms/seo/redirects', {
      method: 'DELETE',
      query: { id },
    })
    markedIds.value = markedIds.value.filter(item => item !== id)
    if (editingId.value === id) {
      resetRedirectForm()
    }
  }
  catch (err) {
    redirectError.value = errMessage(err, 'Could not delete the redirect.')
  }
  finally {
    redirectDeleting.value = false
  }
}

async function removeMarked() {
  if (!markedIds.value.length || redirectDeleting.value) {
    return
  }
  redirectDeleting.value = true
  redirectError.value = ''
  try {
    redirects.value = await $fetch<SeoRedirect[]>('/api/_miraicms/seo/redirects', {
      method: 'DELETE',
      query: { ids: markedIds.value.join(',') },
    })
    markedIds.value = []
    if (editingId.value && !redirects.value.some(item => item.id === editingId.value)) {
      resetRedirectForm()
    }
  }
  catch (err) {
    redirectError.value = errMessage(err, 'Could not delete the redirects.')
  }
  finally {
    redirectDeleting.value = false
  }
}

async function save() {
  if (saving.value) {
    return
  }
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    apply(await $fetch<typeof form>('/api/_miraicms/seo/site', {
      method: 'PUT',
      body: { ...form },
    }))
    saved.value = true
  }
  catch (err) {
    error.value = errMessage(err, 'Could not save SEO settings.')
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsAdminHeader title="SEO">
      <MiraiCmsUiButton
        tag="button"
        :disabled="saving || loading"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </MiraiCmsUiButton>
    </MiraiCmsAdminHeader>

    <MiraiCmsUiNotice
      v-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = ''"
    />
    <MiraiCmsUiNotice
      v-else-if="saved"
      placement="static"
      variant="success"
      message="SEO settings saved."
      @close="saved = false"
    />
    <p
      v-if="loading"
      :class="`${rootClass}__hint`"
    >
      Loading…
    </p>
    <div
      v-else
      :class="`${rootClass}__form`"
    >
      <MiraiCmsTextField
        v-model="form.siteName"
        field-key="seo-site-name"
        :field="{ type: 'text', label: 'Site name', placeholder: 'Shown in the title template' }"
      />
      <MiraiCmsTextField
        v-model="form.titleSeparator"
        field-key="seo-separator"
        :field="{ type: 'text', label: 'Title separator', placeholder: '|' }"
      />
      <MiraiCmsTextField
        v-model="form.titleTemplate"
        field-key="seo-template"
        :field="{
          type: 'text',
          label: 'Title template',
          placeholder: '%title% %sep% %sitename%',
          instructions: 'Use %title%, %sep%, and %sitename%. A custom SEO title on an entry replaces this.',
        }"
      />
      <MiraiCmsTextareaField
        v-model="form.description"
        field-key="seo-description"
        :field="{ type: 'textarea', label: 'Default meta description', rows: 4, maxLength: 320 }"
      />
      <MiraiCmsTrueFalseField
        v-model="form.noindex"
        field-key="seo-noindex"
        :field="{ type: 'true_false', label: 'Discourage search engines from indexing this site' }"
      />
    </div>

    <section
      v-if="!loading"
      :class="`${rootClass}__redirects`"
    >
      <div :class="`${rootClass}__redirect-head`">
        <span :class="`${rootClass}__redirect-title`">Redirects</span>
        <MiraiCmsUiButton
          v-if="markedIds.length"
          tag="button"
          variant="red"
          :disabled="redirectDeleting"
          @click="removeMarked"
        >
          {{ redirectDeleting ? 'Deleting…' : `Delete selected (${markedIds.length})` }}
        </MiraiCmsUiButton>
      </div>
      <MiraiCmsUiNotice
        v-if="redirectError"
        placement="static"
        variant="danger"
        :message="redirectError"
        @close="redirectError = ''"
      />
      <div :class="`${rootClass}__redirect-form`">
        <MiraiCmsSelectField
          v-model="redirectForm.statusCode"
          field-key="seo-redirect-type"
          :field="formTypeField"
        />
        <MiraiCmsTextField
          v-model="redirectForm.from"
          field-key="seo-redirect-from"
          :field="{ type: 'text', label: 'Old URL', placeholder: '/old-path', required: true }"
        />
        <MiraiCmsTextField
          v-if="!isTerminal(redirectForm.statusCode)"
          v-model="redirectForm.to"
          field-key="seo-redirect-to"
          :field="{ type: 'text', label: 'New URL', placeholder: '/new-path', required: true }"
        />
        <div :class="`${rootClass}__redirect-actions`">
          <MiraiCmsUiButton
            tag="button"
            :disabled="redirectSaving"
            @click="addRedirect"
          >
            {{ redirectSaving ? 'Saving…' : (editingId ? 'Save' : 'Add redirect') }}
          </MiraiCmsUiButton>
          <MiraiCmsUiButton
            v-if="editingId"
            tag="button"
            variant="secondary"
            @click="resetRedirectForm"
          >
            Cancel
          </MiraiCmsUiButton>
        </div>
      </div>
      <div :class="`${rootClass}__toolbar`">
        <MiraiCmsInputControl
          v-model="searchInput"
          field-key="seo-redirect-search"
          :field="{ placeholder: 'Search' }"
        />
        <MiraiCmsUiSelect
          id="seo-redirect-type-filter"
          v-model="typeFilter"
          :choices="filterTypeChoices"
          aria-label="Filter Redirect type"
        />
      </div>
      <MiraiCmsUiNotice
        v-if="!filteredRedirects.length"
        placement="static"
        variant="info"
        :message="redirects.length ? 'No redirects match.' : 'No redirects yet.'"
        :closable="false"
      />
      <div
        v-else
        :class="`${rootClass}__table`"
        role="table"
      >
        <div
          :class="[`${rootClass}__columns`, `${rootClass}__columns--head`]"
          role="row"
        >
          <span role="columnheader">
            <MiraiCmsTrueFalseField
              v-model="allVisibleMarked"
              field-key="seo-redirect-mark-all"
              :field="{ type: 'true_false', label: '' }"
            />
          </span>
          <span role="columnheader">Type</span>
          <span role="columnheader">Old URL</span>
          <span role="columnheader">New URL</span>
          <span
            role="columnheader"
            aria-label="Actions"
          />
        </div>
        <div
          v-for="item in filteredRedirects"
          :key="item.id"
          :class="[`${rootClass}__columns`, { 'is-marked': markedIds.includes(item.id) }]"
          role="row"
        >
          <div role="cell">
            <MiraiCmsTrueFalseField
              :model-value="markedIds.includes(item.id)"
              :field-key="`seo-redirect-mark-${item.id}`"
              :field="{ type: 'true_false', label: '' }"
              @update:model-value="setMarked(item.id, $event === true)"
            />
          </div>
          <div role="cell">
            {{ redirectLabel(item.statusCode) }}
          </div>
          <div role="cell">
            <NuxtLink
              :to="item.from"
              target="_blank"
              :class="`${rootClass}__url`"
            >
              {{ item.from }}
            </NuxtLink>
          </div>
          <div role="cell">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              target="_blank"
              :class="`${rootClass}__url`"
            >
              {{ item.to }}
            </NuxtLink>
            <template v-else>
              —
            </template>
          </div>
          <div
            role="cell"
            :class="`${rootClass}__row-actions`"
          >
            <MiraiCmsUiButton
              tag="button"
              :variant="['secondary', 'small']"
              :disabled="redirectDeleting"
              @click="editRedirect(item)"
            >
              Edit
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              tag="button"
              :variant="['red', 'small']"
              :disabled="redirectDeleting"
              @click="removeRedirect(item.id)"
            >
              Delete
            </MiraiCmsUiButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-seo-settings';

#{$root} {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: math-rem(16);
  min-height: 0;
  padding: 0 math-rem(8) math-rem(8);
  overflow: auto;

  &__hint {
    margin: 0;
    color: $color-muted;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);
    max-width: math-rem(1000);
  }

  &__redirects {
    display: flex;
    flex-direction: column;
    gap: math-rem(12);
    max-width: math-rem(1000);
    margin-top: math-rem(8);
  }

  &__redirect-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(12);
  }

  &__redirect-title {
    font-size: math-rem(16);
    font-weight: 600;
  }

  &__redirect-form,
  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(12);
    align-items: flex-end;
  }

  &__redirect-form {
    > * {
      flex: 1 1 math-rem(192);
      min-width: math-rem(192);
    }
  }

  &__redirect-actions {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(8);
    align-items: center;
  }

  &__toolbar {
    :deep(.miraicms-input-control),
    :deep(.miraicms-select) {
      flex: 1 1 math-rem(224);
      min-width: math-rem(224);
      max-width: math-rem(352);
    }
  }

  &__table {
    overflow-x: auto;
    border: 1px solid $color-border;
    border-radius: math-rem(8);
    background: $color-surface;
  }

  &__columns {
    display: grid;
    grid-template-columns: math-rem(48) minmax(math-rem(192), 1.4fr) minmax(math-rem(160), 1fr) minmax(math-rem(160), 1fr) math-rem(148);
    align-items: center;
    min-width: math-rem(736);
    border-bottom: 1px solid $color-border;

    &:last-child {
      border-bottom: 0;
    }

    > [role='columnheader'],
    > [role='cell'] {
      min-width: 0;
      padding: math-rem(10) math-rem(14);
      overflow-wrap: anywhere;
    }

    &--head {
      background: $color-bg;

      > [role='columnheader'] {
        font-size: math-rem(12);
        font-weight: 600;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: $color-muted;
      }
    }

    &.is-marked {
      background: $color-accent-wash;
    }

    :deep(.miraicms-field) {
      gap: 0;
    }
  }

  &__row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(6);
  }

  &__url {
    color: $color-accent;
    text-decoration: underline;
    overflow-wrap: anywhere;

    &:hover {
      color: $color-accent-hover;
    }
  }
}
</style>
