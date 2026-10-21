<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  buildFormValues,
  collectPanelDefaults,
  collectVisibleValueKeys,
  DATE_FIELD_FORMATS,
  formatDate,
  isLayoutOnlyFieldType,
  isVisible,
  parseDate,
  validateRequiredFields,
} from '@miraicms/core'
import type { CollectionStatus, Field, SelectChoice } from '@miraicms/core'
import { resolveField } from '../../utils/helpers'
import { provideMiraiCmsFieldValues } from '../../utils/field-values'
import { provideMiraiCmsFieldErrors } from '../../utils/field-errors'
import { slugify } from '../../utils/slugify'
import type {
  AdminCollectionMeta,
  CollectionDictionaryPicker,
  CollectionEntryFormModel,
  EntryRevisionItem,
  ParentOption,
} from '../../utils/collections'
import EntryRevisions from './EntryRevisions.vue'
import { useMiraiCmsEntrySidebar } from '../../composables/useMiraiCmsExtensions'
import type { MiraiCmsEntrySidebarTab } from '../../composables/useMiraiCmsExtensions'

const props = defineProps<{
  collection: AdminCollectionMeta
  modelValue: CollectionEntryFormModel
  entryKey?: string | number
  parents?: ParentOption[]
  saving?: boolean
  error?: string | null
  viewUrl?: string | null
  canUpdate?: boolean
  canDelete?: boolean
  /** Saved status from the server (trash vs live form status). */
  savedStatus?: CollectionStatus
  dictionaryPickers?: CollectionDictionaryPicker[]
  revisions?: EntryRevisionItem[]
  revisionsLoading?: boolean
  revisionsError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CollectionEntryFormModel]
  'ready': []
  'submit': []
  'trash': []
  'restore': []
  'restoreRevision': [id: number]
  'delete': []
}>()

const rootClass = 'miraicms-collection-form'
const PAGE_TAB = 'page'
const REVISIONS_TAB = 'revisions'
const entrySidebar = useMiraiCmsEntrySidebar()
const activeSidebarTab = ref(PAGE_TAB)
const openedSidebarTabs = ref<Record<string, true>>({})
const showRevisionsTab = computed(() => props.entryKey != null && props.collection.revisions !== false)

const sidebarTabs = computed(() => {
  const seen = new Set<string>()
  const tabs: MiraiCmsEntrySidebarTab[] = []
  for (const tab of entrySidebar.value) {
    if (!tab || typeof tab !== 'object') {
      continue
    }
    const key = tab.key?.trim()
    const label = tab.label?.trim()
    const component = tab.component?.trim()
    if (!key || key === PAGE_TAB || !label || !component || seen.has(key)) {
      continue
    }
    seen.add(key)
    tabs.push({ key, label, component })
  }
  return tabs
})

const showTabBar = computed(() => showRevisionsTab.value || sidebarTabs.value.length > 0)

const tabKeys = computed(() => {
  const keys = [PAGE_TAB]
  if (showRevisionsTab.value) {
    keys.push(REVISIONS_TAB)
  }
  for (const tab of sidebarTabs.value) {
    keys.push(tab.key)
  }
  return keys
})

watch(tabKeys, (keys) => {
  if (!keys.includes(activeSidebarTab.value)) {
    activeSidebarTab.value = PAGE_TAB
  }
})

function sidebarTabId(key: string) {
  return `${rootClass}-tab-${key}`
}

function sidebarPanelId(key: string) {
  return `${rootClass}-panel-${key}`
}

function selectSidebarTab(key: string) {
  activeSidebarTab.value = key
  if (key !== PAGE_TAB) {
    openedSidebarTabs.value = { ...openedSidebarTabs.value, [key]: true }
  }
}

function onSidebarTabKeydown(event: KeyboardEvent, index: number) {
  const keys = tabKeys.value
  let next = index
  if (event.key === 'ArrowRight') {
    next = (index + 1) % keys.length
  }
  else if (event.key === 'ArrowLeft') {
    next = (index - 1 + keys.length) % keys.length
  }
  else if (event.key === 'Home') {
    next = 0
  }
  else if (event.key === 'End') {
    next = keys.length - 1
  }
  else {
    return
  }
  event.preventDefault()
  const key = keys[next]
  if (!key) {
    return
  }
  selectSidebarTab(key)
  void nextTick(() => {
    document.getElementById(sidebarTabId(key))?.focus()
  })
}

const PUBLISH_FORMAT = DATE_FIELD_FORMATS.datetime.return

const fieldDefs = computed(() => props.collection.fields ?? {})
const values = reactive<Record<string, unknown>>({})
provideMiraiCmsFieldValues(values)

const fieldErrors = ref<Record<string, string>>({})
const attemptedSubmit = ref(false)
provideMiraiCmsFieldErrors(fieldErrors)

const readOnly = computed(() => !props.canUpdate)
const isTrash = computed(() => (props.savedStatus ?? props.modelValue.status) === 'trash')

const statusChoices: SelectChoice[] = [
  { val: 'published', lbl: 'Published' },
  { val: 'draft', lbl: 'Draft' },
]

const statusField = {
  type: 'select' as const,
  label: 'Status',
  choices: statusChoices,
}

const parentChoices = computed<SelectChoice[]>(() =>
  (props.parents ?? []).map((parent) => {
    const depth = parent.depth ?? 0
    const title = depth < 1 ? parent.title : `${'— '.repeat(depth)}${parent.title}`
    return {
      val: parent.id,
      lbl: title,
    }
  }),
)

const parentField = computed(() => ({
  type: 'select' as const,
  label: 'Parent',
  allowNull: true,
  placeholder: '— None —',
  choices: parentChoices.value,
}))

const dictionaryPickers = computed(() => props.dictionaryPickers ?? [])

function dictionaryChoices(picker: CollectionDictionaryPicker): SelectChoice[] {
  return picker.terms.map((term) => {
    const depth = term.depth ?? 0
    const title = depth < 1 ? term.title : `${'— '.repeat(depth)}${term.title}`
    return {
      val: term.id,
      lbl: title,
    }
  })
}

function dictionaryField(picker: CollectionDictionaryPicker) {
  return {
    type: 'select' as const,
    label: picker.labels.name,
    multiple: picker.multiple,
    allowNull: !picker.multiple,
    placeholder: picker.multiple ? undefined : '— None —',
    search: picker.terms.length > 6,
    choices: dictionaryChoices(picker),
  }
}

function dictionaryValue(picker: CollectionDictionaryPicker) {
  const raw = props.modelValue.dictionaryIds?.[picker.slug]
  if (picker.multiple) {
    return Array.isArray(raw) ? raw : []
  }
  if (Array.isArray(raw)) {
    return raw[0] ?? null
  }
  return raw ?? null
}

function sameDictionaryValue(
  current: unknown,
  next: number | number[] | null,
  multiple: boolean,
): boolean {
  if (multiple) {
    const left = Array.isArray(current) ? current : []
    const right = Array.isArray(next) ? next : []
    return left.length === right.length && left.every((id, i) => id === right[i])
  }
  return (current ?? null) === next
}

function setDictionaryValue(picker: CollectionDictionaryPicker, value: unknown) {
  let next: number | number[] | null
  if (picker.multiple) {
    const raw = Array.isArray(value) ? value : []
    next = raw
      .map(item => Number(item))
      .filter(id => Number.isInteger(id) && id > 0)
  }
  else if (value === '' || value === null || value === undefined) {
    next = null
  }
  else {
    const id = Number(value)
    next = Number.isInteger(id) && id > 0 ? id : null
  }
  if (sameDictionaryValue(dictionaryValue(picker), next, picker.multiple)) {
    return
  }
  emit('update:modelValue', {
    ...props.modelValue,
    dictionaryIds: {
      ...props.modelValue.dictionaryIds,
      [picker.slug]: next,
    },
  })
}

const publishedField = {
  type: 'date_time_picker' as const,
  label: 'Publish date',
  returnFormat: PUBLISH_FORMAT,
}

const authorField = {
  type: 'user' as const,
  label: 'Author',
  returnFormat: 'id' as const,
}

const menuOrderField = {
  type: 'number' as const,
  label: 'Order',
  step: 1,
  instructions: 'Lower numbers appear first in lists.',
}

const titleField = { type: 'text' as const, label: 'Title', required: true }
const slugField = { type: 'text' as const, label: 'Slug', required: true }

let syncingFromParent = false
let hydrating = false
let hydrateGen = 0

function replaceValues(next: Record<string, unknown>) {
  syncingFromParent = true
  for (const key of Object.keys(values)) {
    Reflect.deleteProperty(values, key)
  }
  Object.assign(values, next)
  queueMicrotask(() => {
    syncingFromParent = false
  })
}

function emitFields() {
  emit('update:modelValue', {
    ...props.modelValue,
    fields: { ...values },
  })
}

async function hydrateFromModel() {
  const gen = ++hydrateGen
  hydrating = true
  replaceValues({
    ...buildFormValues(fieldDefs.value),
    ...(props.modelValue.fields ?? {}),
  })
  await nextTick()
  await nextTick()
  if (gen !== hydrateGen) {
    return
  }
  emitFields()
  hydrating = false
  emit('ready')
}

watch(
  () => `${props.collection.slug}:${props.entryKey ?? 'default'}`,
  () => {
    void hydrateFromModel()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  hydrateGen += 1
})

watch(
  values,
  () => {
    if (syncingFromParent || hydrating) {
      return
    }
    emitFields()
  },
  { deep: true },
)

const visibleFields = computed(() =>
  Object.entries(fieldDefs.value).filter(([, field]) =>
    isVisible(field.conditionalLogic, values),
  ),
)

const mainFields = computed(() =>
  visibleFields.value.filter(([, field]) => (field.position ?? 'main') === 'main'),
)

const sidebarFields = computed(() =>
  visibleFields.value.filter(([, field]) => field.position === 'sidebar'),
)

const hiddenCache: Record<string, unknown> = {}

function restoreFieldValue(key: string, field: Field) {
  if (isLayoutOnlyFieldType(field.type)) {
    if (field.type === 'tab' || field.type === 'accordion') {
      for (const [panelKey, panelDefault] of Object.entries(collectPanelDefaults(field))) {
        if (!(panelKey in values)) {
          values[panelKey] = panelKey in hiddenCache
            ? hiddenCache[panelKey]
            : panelDefault
          Reflect.deleteProperty(hiddenCache, panelKey)
        }
      }
    }
    Reflect.deleteProperty(values, key)
    return
  }

  if (!(key in values)) {
    values[key] = key in hiddenCache
      ? hiddenCache[key]
      : 'defaultValue' in field
        ? field.defaultValue
        : field.type === 'group'
          ? undefined
          : field.type === 'repeater' || field.type === 'flexible_content' || field.type === 'gallery'
            ? []
            : field.type === 'open_street_map' && field.multiple
              ? []
              : undefined
    Reflect.deleteProperty(hiddenCache, key)
  }
}

watch(visibleFields, (visible) => {
  const visibleKeys = collectVisibleValueKeys(visible)

  for (const key of Object.keys(values)) {
    if (!visibleKeys.has(key)) {
      hiddenCache[key] = values[key]
      Reflect.deleteProperty(values, key)
    }
  }

  for (const [key, field] of visible) {
    restoreFieldValue(key, field)
  }
}, { immediate: true })

function updateCore<K extends keyof CollectionEntryFormModel>(
  key: K,
  value: CollectionEntryFormModel[K],
) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const publishedLocal = computed({
  get() {
    const iso = props.modelValue.publishedAt
    if (!iso) {
      return ''
    }
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return formatDate(date, PUBLISH_FORMAT)
  },
  set(value: string | undefined) {
    if (!value) {
      updateCore('publishedAt', null)
      return
    }
    const date = parseDate(value, PUBLISH_FORMAT)
    updateCore('publishedAt', date ? date.toISOString() : null)
  },
})

const parentModel = computed({
  get() {
    return props.modelValue.parentId
  },
  set(value: unknown) {
    if (value === '' || value === null || value === undefined) {
      updateCore('parentId', null)
      return
    }
    const id = Number(value)
    updateCore('parentId', Number.isInteger(id) && id > 0 ? id : null)
  },
})

const authorModel = computed({
  get() {
    return props.modelValue.authorId
  },
  set(value: unknown) {
    const id = Number(value)
    updateCore('authorId', Number.isInteger(id) && id > 0 ? id : null)
  },
})

const menuOrderModel = computed({
  get() {
    return props.modelValue.menuOrder
  },
  set(value: unknown) {
    if (value === '' || value === null || value === undefined) {
      updateCore('menuOrder', 0)
      return
    }
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) {
      updateCore('menuOrder', 0)
      return
    }
    updateCore('menuOrder', Math.trunc(n))
  },
})

const canSubmit = computed(() =>
  !readOnly.value
  && !isTrash.value
  && !props.saving,
)

const submitLabel = computed(() => {
  if (props.saving) {
    return 'Saving…'
  }
  return props.modelValue.status === 'published' ? 'Publish' : 'Save draft'
})

const requiredNotice = computed(() => {
  const messages = Object.values(fieldErrors.value)
  if (messages.length === 0) {
    return ''
  }
  if (messages.length === 1) {
    return messages[0]
  }
  return 'Please fill in the required fields.'
})

function collectFieldErrors(slug = props.modelValue.slug): Record<string, string> {
  const next: Record<string, string> = {}
  if (!props.modelValue.title.trim()) {
    next['cms-entry-title'] = 'Title is required.'
  }
  if (!slug.trim()) {
    next['cms-entry-slug'] = 'Slug is required.'
  }
  if (props.modelValue.status === 'published') {
    for (const issue of validateRequiredFields(fieldDefs.value, values)) {
      next[issue.key] = issue.message
    }
  }
  return next
}

function scrollToFirstError(errors: Record<string, string>) {
  const key = Object.keys(errors)[0]
  if (!key || typeof document === 'undefined') {
    return
  }
  const target = document.querySelector(`[data-field-key="${CSS.escape(key)}"]`)
  if (target instanceof HTMLElement) {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

function onSubmit() {
  if (!validateForSubmit()) {
    return
  }
  emit('submit')
}

function validateForSubmit(): boolean {
  if (!canSubmit.value) {
    return false
  }
  let slug = props.modelValue.slug.trim()
  if (!slug && props.modelValue.title.trim()) {
    slug = slugify(props.modelValue.title) || 'entry'
    updateCore('slug', slug)
  }
  attemptedSubmit.value = true
  const errors = collectFieldErrors(slug)
  fieldErrors.value = errors
  if (Object.keys(errors).length > 0) {
    nextTick(() => scrollToFirstError(errors))
    return false
  }
  return true
}

defineExpose({ validateForSubmit })

watch(
  [values, () => props.modelValue.title, () => props.modelValue.slug, () => props.modelValue.status],
  () => {
    if (!attemptedSubmit.value) {
      return
    }
    fieldErrors.value = collectFieldErrors()
  },
  { deep: true },
)
</script>

<template>
  <MiraiCmsUiNotice
    v-if="requiredNotice"
    placement="fixed"
    variant="danger"
    :message="requiredNotice"
    :closable="false"
  />
  <MiraiCmsUiNotice
    v-if="error"
    placement="fixed"
    variant="danger"
    :message="error"
  />

  <form
    :class="rootClass"
    novalidate
    @submit.prevent="onSubmit"
  >
    <div :class="`${rootClass}__main`">
      <div :class="`${rootClass}__main-wrap`">
        <MiraiCmsFieldWrapper
          field-key="cms-entry-title"
          :field="titleField"
        >
          <MiraiCmsInputControl
            :model-value="modelValue.title"
            field-key="cms-entry-title"
            :field="titleField"
            @update:model-value="updateCore('title', String($event ?? ''))"
          />
        </MiraiCmsFieldWrapper>

        <MiraiCmsFieldWrapper
          field-key="cms-entry-slug"
          :field="slugField"
        >
          <MiraiCmsInputControl
            :model-value="modelValue.slug"
            field-key="cms-entry-slug"
            :field="slugField"
            @update:model-value="updateCore('slug', String($event ?? ''))"
          />
        </MiraiCmsFieldWrapper>

        <div :class="`${rootClass}__fields`">
          <div
            v-for="[key, field] in mainFields"
            :key="key"
            :class="`${rootClass}__field`"
            :style="field.columnWidth ? { width: `${field.columnWidth}%` } : undefined"
          >
            <component
              :is="resolveField(field.type)"
              v-model="values[key]"
              :field-key="key"
              :field="field"
            />
          </div>
        </div>
      </div>
    </div>

    <div :class="[`${rootClass}__sidebar`, { [`${rootClass}__sidebar--tabs`]: showTabBar }]">
      <div
        v-if="showTabBar"
        :class="`${rootClass}__tabs`"
        role="tablist"
      >
        <button
          :id="sidebarTabId(PAGE_TAB)"
          type="button"
          role="tab"
          :aria-selected="activeSidebarTab === PAGE_TAB"
          :aria-controls="sidebarPanelId(PAGE_TAB)"
          :tabindex="activeSidebarTab === PAGE_TAB ? 0 : -1"
          :class="[`${rootClass}__tabs-item`, { 'is-active': activeSidebarTab === PAGE_TAB }]"
          @click="selectSidebarTab(PAGE_TAB)"
          @keydown="onSidebarTabKeydown($event, 0)"
        >
          Page
        </button>
        <button
          v-if="showRevisionsTab"
          :id="sidebarTabId(REVISIONS_TAB)"
          type="button"
          role="tab"
          :aria-selected="activeSidebarTab === REVISIONS_TAB"
          :aria-controls="sidebarPanelId(REVISIONS_TAB)"
          :tabindex="activeSidebarTab === REVISIONS_TAB ? 0 : -1"
          :class="[`${rootClass}__tabs-item`, { 'is-active': activeSidebarTab === REVISIONS_TAB }]"
          @click="selectSidebarTab(REVISIONS_TAB)"
          @keydown="onSidebarTabKeydown($event, 1)"
        >
          Revisions
        </button>
        <button
          v-for="(tab, index) in sidebarTabs"
          :id="sidebarTabId(tab.key)"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeSidebarTab === tab.key"
          :aria-controls="sidebarPanelId(tab.key)"
          :tabindex="activeSidebarTab === tab.key ? 0 : -1"
          :class="[`${rootClass}__tabs-item`, { 'is-active': activeSidebarTab === tab.key }]"
          @click="selectSidebarTab(tab.key)"
          @keydown="onSidebarTabKeydown($event, index + (showRevisionsTab ? 2 : 1))"
        >
          {{ tab.label }}
        </button>
      </div>

      <div
        v-show="!showTabBar || activeSidebarTab === PAGE_TAB"
        :id="showTabBar ? sidebarPanelId(PAGE_TAB) : undefined"
        :class="showTabBar ? `${rootClass}__panel` : `${rootClass}__page`"
        :role="showTabBar ? 'tabpanel' : undefined"
        :aria-labelledby="showTabBar ? sidebarTabId(PAGE_TAB) : undefined"
      >
        <div :class="`${rootClass}__block`">
          <div :class="`${rootClass}__block-title`">
            Publish
          </div>

          <MiraiCmsUiNotice
            v-if="isTrash"
            placement="static"
            variant="warning"
            message="This entry is in the trash."
            :closable="false"
          />

          <template v-else>
            <MiraiCmsSelectField
              :model-value="modelValue.status === 'trash' ? 'draft' : modelValue.status"
              field-key="cms-entry-status"
              :field="statusField"
              @update:model-value="updateCore('status', ($event === 'published' ? 'published' : 'draft') as CollectionStatus)"
            />

            <MiraiCmsUserField
              v-model="authorModel"
              field-key="cms-entry-author"
              :field="authorField"
            />

            <MiraiCmsDateTimePickerField
              v-model="publishedLocal"
              field-key="cms-entry-published"
              :field="publishedField"
            />

            <MiraiCmsNumberField
              v-model="menuOrderModel"
              field-key="cms-entry-menu-order"
              :field="menuOrderField"
            />

            <MiraiCmsSelectField
              v-if="collection.hierarchical"
              v-model="parentModel"
              field-key="cms-entry-parent"
              :field="parentField"
            />
          </template>

          <div :class="`${rootClass}__block-actions`">
            <MiraiCmsUiButton
              v-if="!isTrash && canUpdate"
              tag="button"
              type="submit"
              variant="full"
              :disabled="!canSubmit"
            >
              {{ submitLabel }}
            </MiraiCmsUiButton>

            <MiraiCmsUiButton
              v-if="viewUrl && !isTrash"
              tag="a"
              :variant="['secondary', 'small', 'full']"
              :link="{ url: viewUrl, title: 'View', target: '_blank' }"
            >
              View
            </MiraiCmsUiButton>

            <MiraiCmsUiButton
              v-if="!isTrash && canUpdate"
              tag="button"
              type="button"
              :variant="['red', 'small', 'full']"
              :disabled="saving"
              @click="emit('trash')"
            >
              Move to trash
            </MiraiCmsUiButton>

            <MiraiCmsUiButton
              v-if="isTrash && canUpdate"
              tag="button"
              type="button"
              :disabled="saving"
              @click="emit('restore')"
            >
              Restore
            </MiraiCmsUiButton>

            <MiraiCmsUiButton
              v-if="isTrash && canDelete"
              tag="button"
              type="button"
              :variant="['red', 'small']"
              :disabled="saving"
              @click="emit('delete')"
            >
              Delete permanently
            </MiraiCmsUiButton>
          </div>
        </div>

        <div
          v-if="!isTrash && dictionaryPickers.length"
          :class="`${rootClass}__block`"
        >
          <div :class="`${rootClass}__block-title`">
            Dictionaries
          </div>
          <MiraiCmsSelectField
            v-for="picker in dictionaryPickers"
            :key="picker.slug"
            :model-value="dictionaryValue(picker)"
            :field-key="`cms-entry-dictionary-${picker.slug}`"
            :field="dictionaryField(picker)"
            @update:model-value="setDictionaryValue(picker, $event)"
          />
        </div>

        <div
          v-if="sidebarFields.length"
          :class="`${rootClass}__block`"
        >
          <component
            :is="resolveField(field.type)"
            v-for="[key, field] in sidebarFields"
            :key="key"
            v-model="values[key]"
            :field-key="key"
            :field="field"
          />
        </div>
      </div>

      <div
        v-if="showRevisionsTab && openedSidebarTabs[REVISIONS_TAB]"
        v-show="activeSidebarTab === REVISIONS_TAB"
        :id="sidebarPanelId(REVISIONS_TAB)"
        :class="`${rootClass}__panel`"
        role="tabpanel"
        :aria-labelledby="sidebarTabId(REVISIONS_TAB)"
      >
        <div :class="`${rootClass}__block`">
          <EntryRevisions
            :items="revisions ?? []"
            :loading="revisionsLoading"
            :error="revisionsError"
            :can-restore="canUpdate === true"
            :disabled="saving || canUpdate !== true"
            @restore="emit('restoreRevision', $event)"
          />
        </div>
      </div>

      <template
        v-for="tab in sidebarTabs"
        :key="tab.key"
      >
        <div
          v-if="openedSidebarTabs[tab.key]"
          v-show="activeSidebarTab === tab.key"
          :id="sidebarPanelId(tab.key)"
          :class="`${rootClass}__panel`"
          role="tabpanel"
          :aria-labelledby="sidebarTabId(tab.key)"
        >
          <component :is="tab.component" />
        </div>
      </template>
    </div>
  </form>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-collection-form';

@include miraicms-wrapper {
  #{$root} {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1fr) math-rem(350);
    grid-template-rows: minmax(0, 1fr);

    @media (max-width: 1100px) {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: none;
      overflow: auto;
    }

    &__main {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;

      &-wrap {
        padding: math-rem(16) math-rem(8);
        display: flex;
        flex-direction: column;
        gap: math-rem(16);

        @media (max-width: 1100px) {
          overflow: visible;
        }
      }
    }

    &__sidebar {
      background: $color-bg;
      border-left: 1px solid $color-border;
      padding: math-rem(16) 0;
      display: flex;
      flex-direction: column;
      gap: math-rem(16);
      min-width: 0;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;

      @media (max-width: 1100px) {
        overflow: visible;
      }

      &--tabs {
        padding-top: 0;
        gap: 0;
      }
    }

    &__tabs {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      flex-shrink: 0;
      overflow-x: auto;
      background: $color-bg;
      border-bottom: 1px solid $color-border;

      &-item {
        flex: 1 0 auto;
        min-width: math-rem(72);
        margin: 0;
        padding: math-rem(12) math-rem(14);
        border: 0;
        border-right: 1px solid $color-border;
        background: transparent;
        color: $color-muted;
        font: inherit;
        font-size: math-rem(13);
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        cursor: pointer;

        &:last-child {
          border-right: 0;
        }

        &:hover {
          color: $color-ink;
          background: $color-accent-wash;
        }

        &.is-active {
          color: $color-ink;
          background: $color-surface;
          box-shadow: inset 0 -2px 0 $color-accent;
        }

        &:focus {
          outline: none;
        }

        &:focus-visible {
          outline: 2px solid color-alpha($color-accent, 0.35);
          outline-offset: -2px;
        }
      }
    }

    &__page {
      display: contents;
    }

    &__panel {
      display: flex;
      flex-direction: column;
      gap: math-rem(16);
      min-width: 0;
      padding-top: math-rem(16);
    }

    &__fields {
      display: flex;
      flex-wrap: wrap;
      row-gap: math-rem(16);
      margin-left: math-rem(-8);
      margin-right: math-rem(-8);
      min-width: 0;
    }

    &__field {
      padding-left: math-rem(8);
      padding-right: math-rem(8);
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    &__block {
      display: flex;
      flex-direction: column;
      gap: math-rem(16);
      padding-left: math-rem(8);
      padding-right: math-rem(8);

      &:not(:last-child) {
        padding-bottom: math-rem(16);
        border-bottom: 1px solid $color-border;
      }

      &-title {
        margin: 0;
        font-size: math-rem(14);
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: $color-ink;
      }

      &-actions {
        display: flex;
        flex-wrap: wrap;
        gap: math-rem(8);
      }
    }
  }
}
</style>
