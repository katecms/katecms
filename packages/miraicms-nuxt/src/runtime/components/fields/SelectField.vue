<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  decodeChoiceValue,
  encodeChoiceValue,
  selectChoiceLookup,
  walkSelectChoices,
} from '@miraicms/core'
import type { Field, SelectChoiceValue } from '@miraicms/core'

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
  const raw = selected.value
  if (props.field?.multiple) {
    model.value = Array.isArray(raw) ? raw.map(v => format(String(v))) : []
  }
  else {
    model.value = raw === '' ? '' : format(String(raw))
  }
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <MiraiCmsUiSelect
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
  </MiraiCmsFieldWrapper>
</template>
