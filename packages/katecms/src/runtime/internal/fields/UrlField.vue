<script setup lang="ts">
import type { Field } from '@katecms/core'

type UrlFieldConfig = Extract<Field, { type: 'url' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: UrlFieldConfig
}>(), {
  field: () => ({ type: 'url', label: '' }),
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
      type="url"
      :field-key="fieldKey"
      :field="field"
    />
  </KateCmsFieldWrapper>
</template>
