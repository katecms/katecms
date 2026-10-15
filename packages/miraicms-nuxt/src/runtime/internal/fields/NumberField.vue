<script setup lang="ts">
import type { Field } from '@miraicms/core'

type NumberFieldConfig = Extract<Field, { type: 'number' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: NumberFieldConfig
}>(), {
  field: () => ({ type: 'number', label: '' }),
})

const model = defineModel<number | null>()
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <MiraiCmsInputControl
      v-model="model"
      type="number"
      numeric
      :field-key="fieldKey"
      :field="field"
      :min="field?.min ?? undefined"
      :max="field?.max ?? undefined"
      :step="field?.step ?? undefined"
    />
  </MiraiCmsFieldWrapper>
</template>
