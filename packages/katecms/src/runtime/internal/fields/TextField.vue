<script setup lang="ts">
import type { Field } from '@katecms/core'

type TextFieldConfig = Extract<Field, { type: 'text' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: TextFieldConfig
}>(), {
  field: () => ({ type: 'text', label: '' }),
})

const model = defineModel<string>()
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <KateCmsInputControl
      v-model="model"
      type="text"
      :field-key="fieldKey"
      :field="field"
      :maxlength="field?.maxLength || undefined"
    />
  </KateCmsFieldWrapper>
</template>
