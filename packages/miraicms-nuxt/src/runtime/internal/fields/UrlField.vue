<script setup lang="ts">
import type { Field } from '@miraicms/core'

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
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <MiraiCmsInputControl
      v-model="model"
      type="url"
      :field-key="fieldKey"
      :field="field"
    />
  </MiraiCmsFieldWrapper>
</template>
