<script setup lang="ts">
import type { Field } from '@katecms/core'

type EmailFieldConfig = Extract<Field, { type: 'email' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: EmailFieldConfig
}>(), {
  field: () => ({ type: 'email', label: '' }),
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
      type="email"
      :field-key="fieldKey"
      :field="field"
    />
  </KateCmsFieldWrapper>
</template>
