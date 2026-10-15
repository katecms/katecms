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
import type { Field, Fields } from '@miraicms/core'
import { resolveField } from '../../utils/helpers'
import { provideMiraiCmsFieldValues } from '../../utils/field-values'
import { provideMiraiCmsFieldErrors } from '../../utils/field-errors'
import type { AdminOptionMeta } from '../../utils/options'

const props = withDefaults(defineProps<{
  page: AdminOptionMeta
  modelValue: Record<string, unknown>
  saving?: boolean
  error?: string | null
  canUpdate?: boolean
  formId?: string
}>(), {
  saving: false,
  error: null,
  canUpdate: true,
  formId: 'cms-options-form',
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  'submit': []
}>()

const rootClass = 'miraicms-options-form'

const fieldDefs = computed(() => (props.page.fields ?? {}) as Fields)
const values = reactive<Record<string, unknown>>({})
provideMiraiCmsFieldValues(values)

const fieldErrors = ref<Record<string, string>>({})
const attemptedSubmit = ref(false)
provideMiraiCmsFieldErrors(fieldErrors)

const readOnly = computed(() => !props.canUpdate)

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
  () => props.page.slug,
  () => {
    replaceValues({
      ...buildFormValues(fieldDefs.value),
      ...props.modelValue,
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
    emit('update:modelValue', { ...values })
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

const canSubmit = computed(() => !readOnly.value && !props.saving)

function collectFieldErrors(): Record<string, string> {
  const next: Record<string, string> = {}
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
  attemptedSubmit.value = true
  const errors = collectFieldErrors()
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

defineExpose({ validateForSubmit })

watch(
  values,
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
</script>

<template>
  <form
    :id="formId"
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
  </form>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-options-form';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(14);
    min-width: 0;

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
