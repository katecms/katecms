<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
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
  CollectionEntryFormModel,
  ParentOption,
} from '../../utils/collections'

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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CollectionEntryFormModel]
  'submit': []
  'trash': []
  'restore': []
  'delete': []
}>()

const rootClass = 'miraicms-collection-form'
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

const publishedField = {
  type: 'date_time_picker' as const,
  label: 'Publish date',
  returnFormat: PUBLISH_FORMAT,
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

watch(
  () => `${props.collection.slug}:${props.entryKey ?? 'default'}`,
  () => {
    replaceValues({
      ...buildFormValues(fieldDefs.value),
      ...(props.modelValue.fields ?? {}),
    })
  },
  { immediate: true },
)

watch(
  values,
  () => {
    if (syncingFromParent) {
      return
    }
    emit('update:modelValue', {
      ...props.modelValue,
      fields: { ...values },
    })
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
  <form
    :class="rootClass"
    novalidate
    @submit.prevent="onSubmit"
  >
    <MiraiCmsUiNotice
      v-if="requiredNotice"
      placement="static"
      variant="danger"
      :message="requiredNotice"
      :closable="false"
    />
    <MiraiCmsUiNotice
      v-if="error"
      placement="static"
      variant="danger"
      :message="error"
    />
    <div :class="`${rootClass}__layout`">
      <div :class="`${rootClass}__main`">
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

      <div :class="`${rootClass}__sidebar`">
        <div :class="`${rootClass}__publish`">
          <div :class="`${rootClass}__publish-title`">
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

          <div :class="`${rootClass}__publish-actions`">
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
          v-if="sidebarFields.length"
          :class="`${rootClass}__sidebar-fields`"
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
    </div>
  </form>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-collection-form';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);

    &__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) math-rem(280);
      gap: math-rem(16);
      align-items: start;
      min-width: 0;

      @media (max-width: 1100px) {
        grid-template-columns: 1fr;
      }
    }

    &__main {
      display: flex;
      flex-direction: column;
      gap: math-rem(14);
      min-width: 0;
      padding: math-rem(16);
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
    }

    &__fields {
      display: flex;
      flex-wrap: wrap;
      row-gap: math-rem(16);
      margin-left: math-rem(-8);
      margin-right: math-rem(-8);
    }

    &__field {
      padding-left: math-rem(8);
      padding-right: math-rem(8);
      width: 100%;
      box-sizing: border-box;
    }

    &__sidebar {
      display: flex;
      flex-direction: column;
      gap: math-rem(16);
      min-width: 0;
    }

    &__publish,
    &__sidebar-fields {
      display: flex;
      flex-direction: column;
      gap: math-rem(14);
      padding: math-rem(16);
      background: $color-bg;
      border: 1px solid $color-border;
      border-radius: $border-radius;
    }

    &__publish-title {
      margin: 0;
      font-size: math-rem(14);
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: $color-ink;
    }

    &__publish-actions {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(8);
    }
  }
}
</style>
