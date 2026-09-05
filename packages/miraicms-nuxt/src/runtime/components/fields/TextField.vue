<script setup lang="ts">
import type { Field } from '@miraicms/core'

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
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <MiraiCmsInputControl
      v-model="model"
      type="text"
      :field-key="fieldKey"
      :field="field"
      :maxlength="field?.maxLength || undefined"
    />
  </MiraiCmsFieldWrapper>
</template>
