<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Field } from '@miraicms/core'

type SelectFieldConfig = Extract<Field, { type: 'select' }>
type SelectChoice = SelectFieldConfig['choices'][number]
type SelectChoiceItem = Exclude<SelectChoice, { type: 'group' }>
type SelectChoiceValue = string | number

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: SelectFieldConfig
}>(), {
  field: () => ({ type: 'select', label: '', choices: [] }),
})

const model = defineModel<unknown>()

function isGroup(opt: SelectChoice): opt is Extract<SelectChoice, { type: 'group' }> {
  return 'type' in opt && opt.type === 'group'
}

function getValue(opt: SelectChoiceItem): SelectChoiceValue {
  return opt.val ?? opt.lbl
}

function walkChoices(
  choices: SelectChoice[],
  visit: (opt: SelectChoiceItem) => void,
): void {
  for (const opt of choices) {
    if (isGroup(opt)) {
      for (const child of opt.childs ?? []) visit(child)
    }
    else {
      visit(opt)
    }
  }
}

function findChoice(raw: string): SelectChoiceItem | undefined {
  let found: SelectChoiceItem | undefined
  walkChoices(props.field?.choices ?? [], (opt) => {
    if (!found && String(getValue(opt)) === raw) found = opt
  })
  return found
}

function findLabel(raw: string): string {
  return findChoice(raw)?.lbl ?? raw
}

function format(raw: string): unknown {
  const label = findLabel(raw)
  if (props.field?.returnFormat === 'label') {
    return label
  }
  if (props.field?.returnFormat === 'array') {
    return { value: raw, label }
  }
  return raw
}

function unformat(value: unknown): string {
  if (value == null || value === '') {
    return ''
  }
  if (props.field?.returnFormat === 'array' && typeof value === 'object') {
    return String((value as { value?: unknown }).value ?? '')
  }
  if (props.field?.returnFormat === 'label') {
    let found = ''
    walkChoices(props.field?.choices ?? [], (opt) => {
      if (!found && opt.lbl === value) found = String(getValue(opt))
    })
    return found || String(value)
  }
  return String(value)
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
  walkChoices(selectChoices.value, (opt) => {
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
