<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  buildFormValues,
  collectPanelDefaults,
  collectVisibleValueKeys,
  isLayoutOnlyFieldType,
  isVisible,
  validateRequiredFields,
} from '@miraicms/core'
import type { Field, SelectChoice } from '@miraicms/core'
import { resolveField } from '../../utils/helpers'
import { provideMiraiCmsFieldValues } from '../../utils/field-values'
import { provideMiraiCmsFieldErrors } from '../../utils/field-errors'
import { slugify } from '../../utils/slugify'
import type {
  AdminDictionaryMeta,
  DictionaryTermFormModel,
  ParentOption,
} from '../../utils/dictionaries'

const props = withDefaults(defineProps<{
  dictionary: AdminDictionaryMeta
  modelValue: DictionaryTermFormModel
  entryKey?: string | number
  parents?: ParentOption[]
  saving?: boolean
  error?: string | null
  canUpdate?: boolean
  formId?: string
  submitLabel?: string
  showSubmit?: boolean
}>(), {
  parents: () => [],
  saving: false,
  error: null,
  canUpdate: true,
  formId: 'cms-dictionary-term-form',
  submitLabel: 'Add',
  showSubmit: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: DictionaryTermFormModel]
  'submit': []
}>()

const rootClass = 'miraicms-dictionary-form'

const fieldDefs = computed(() => props.dictionary.fields ?? {})
const values = reactive<Record<string, unknown>>({})
provideMiraiCmsFieldValues(values)

const fieldErrors = ref<Record<string, string>>({})
const attemptedSubmit = ref(false)
provideMiraiCmsFieldErrors(fieldErrors)

const readOnly = computed(() => !props.canUpdate)

const titleField = { type: 'text' as const, label: 'Title', required: true }
const slugField = { type: 'text' as const, label: 'Slug', required: true }

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
  () => `${props.dictionary.slug}:${props.entryKey ?? 'default'}`,
  () => {
    replaceValues({
      ...buildFormValues(fieldDefs.value),
      ...(props.modelValue.fields ?? {}),
    })
    attemptedSubmit.value = false
    fieldErrors.value = {}
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

function updateCore<K extends keyof DictionaryTermFormModel>(
  key: K,
  value: DictionaryTermFormModel[K],
) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

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

const canSubmit = computed(() => !readOnly.value && !props.saving)

function collectFieldErrors(slug = props.modelValue.slug): Record<string, string> {
  const next: Record<string, string> = {}
  if (!props.modelValue.title.trim()) {
    next['cms-dictionary-title'] = 'Title is required.'
  }
  if (!slug.trim()) {
    next['cms-dictionary-slug'] = 'Slug is required.'
  }
  for (const issue of validateRequiredFields(fieldDefs.value, values)) {
    next[issue.key] = issue.message
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

function validateForSubmit(): boolean {
  if (!canSubmit.value) {
    return false
  }
  let slug = props.modelValue.slug.trim()
  if (!slug && props.modelValue.title.trim()) {
    slug = slugify(props.modelValue.title) || 'term'
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

function onSubmit() {
  if (!validateForSubmit()) {
    return
  }
  emit('submit')
}

function ensureSlug() {
  if (!props.modelValue.slug.trim() && props.modelValue.title.trim()) {
    updateCore('slug', slugify(props.modelValue.title) || 'term')
  }
}

defineExpose({ validateForSubmit })

watch(
  [values, () => props.modelValue.title, () => props.modelValue.slug],
  () => {
    if (!attemptedSubmit.value) {
      return
    }
    fieldErrors.value = collectFieldErrors()
  },
  { deep: true },
)

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

const buttonLabel = computed(() => props.submitLabel)
</script>

<template>
  <form
    :id="formId"
    :class="rootClass"
    novalidate
    @submit.prevent="onSubmit"
    @focusout="ensureSlug"
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

    <MiraiCmsFieldWrapper
      field-key="cms-dictionary-title"
      :field="titleField"
    >
      <MiraiCmsInputControl
        :model-value="modelValue.title"
        field-key="cms-dictionary-title"
        :field="titleField"
        :disabled="readOnly"
        @update:model-value="updateCore('title', String($event ?? ''))"
      />
    </MiraiCmsFieldWrapper>

    <MiraiCmsFieldWrapper
      field-key="cms-dictionary-slug"
      :field="slugField"
    >
      <MiraiCmsInputControl
        :model-value="modelValue.slug"
        field-key="cms-dictionary-slug"
        :field="slugField"
        :disabled="readOnly"
        @update:model-value="updateCore('slug', String($event ?? ''))"
      />
    </MiraiCmsFieldWrapper>

    <MiraiCmsSelectField
      v-model="parentModel"
      field-key="cms-dictionary-parent"
      :field="parentField"
    />

    <div
      v-if="visibleFields.length"
      :class="`${rootClass}__fields`"
    >
      <div
        v-for="[key, field] in visibleFields"
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

    <MiraiCmsUiButton
      v-if="showSubmit && canUpdate"
      tag="button"
      type="submit"
      :disabled="!canSubmit"
    >
      {{ buttonLabel }}
    </MiraiCmsUiButton>
  </form>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-dictionary-form';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(14);
    min-width: 0;
    padding: math-rem(16);
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius;

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
  }
}
</style>
