<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  decodeChoiceValue,
  encodeChoiceValue,
  selectChoiceLookup,
  walkSelectChoices,
} from '@katecms/core'
import type { Field, SelectChoiceValue } from '@katecms/core'

type SelectFieldConfig = Extract<Field, { type: 'select' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: SelectFieldConfig
}>(), {
  field: () => ({ type: 'select', label: '', choices: [] }),
})

const model = defineModel<unknown>()
const lookup = computed(() => selectChoiceLookup(props.field?.choices ?? []))

function format(raw: string): unknown {
  return encodeChoiceValue(raw, lookup.value, props.field?.returnFormat)
}

function unformat(value: unknown): string {
  return decodeChoiceValue(value, lookup.value, props.field?.returnFormat)
}

function formattedFromSelected(): unknown {
  const raw = selected.value
  if (props.field?.multiple) {
    return Array.isArray(raw) ? raw.map(v => format(String(v))) : []
  }
  return raw === '' ? '' : format(String(raw))
}

function sameSelectModel(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : []
    const right = Array.isArray(b) ? b : []
    return left.length === right.length && left.every((item, i) => String(item) === String(right[i]))
  }
  if ((a == null || a === '') && (b == null || b === '')) {
    return true
  }
  return String(a ?? '') === String(b ?? '')
}

const selected = computed<SelectChoiceValue | SelectChoiceValue[] | ''>({
  get() {
    if (props.field?.multiple) {
      return Array.isArray(model.value) ? model.value.map(unformat) : []
    }
    return unformat(model.value)
  },
  set(raw) {
    if (props.field?.multiple) {
      model.value = Array.isArray(raw) ? raw.map(v => format(String(v))) : []
    }
    else {
      model.value = raw === '' ? '' : format(String(raw))
    }
  },
})

const selectChoices = computed(() => props.field?.choices ?? [])

const placeholder = computed(() => {
  if (props.field?.placeholder) return props.field.placeholder
  if (props.field?.allowNull && !props.field?.multiple) return '— Select —'
  return ''
})

const showOptionImages = computed(() => {
  let hasImg = false
  walkSelectChoices(selectChoices.value, (opt) => {
    if (opt.img) hasImg = true
  })
  return hasImg
})

onMounted(() => {
  const next = formattedFromSelected()
  if (!sameSelectModel(model.value, next)) {
    model.value = next
  }
})
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <KateCmsUiSelect
      :id="fieldKey"
      v-model="selected"
      :name="fieldKey"
      :choices="selectChoices"
      :placeholder="placeholder"
      :multiple="field?.multiple || false"
      :required="field?.required || false"
      :min="field?.min"
      :max="field?.max"
      :search="field?.search || false"
      :search-clearable="!!field?.search"
      :search-placeholder="field?.searchPlaceholder || ''"
      :allow-custom-choices="field?.allowCustomChoices || false"
      :add-option-text="field?.customChoiceButtonText || 'Add'"
      :selected-opt-clearable="field?.clearable || !!field?.allowNull"
      :selected-opt-image="showOptionImages"
      :option-icon="showOptionImages"
      :aria-label="field?.label || fieldKey"
    />
  </KateCmsFieldWrapper>
</template>
