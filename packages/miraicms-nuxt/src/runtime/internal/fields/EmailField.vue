<script setup lang="ts">
import type { Field } from '@miraicms/core'

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
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <MiraiCmsInputControl
      v-model="model"
      type="email"
      :field-key="fieldKey"
      :field="field"
    />
  </MiraiCmsFieldWrapper>
</template>
