<script setup lang="ts">
import type { Field } from '@miraicms/core'

type DatePickerFieldConfig = Extract<Field, { type: 'date_picker' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: DatePickerFieldConfig
}>(), {
  field: () => ({ type: 'date_picker', label: '' }),
})

const model = defineModel<string>()
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <MiraiCmsDateTimeControl
      :id="fieldKey"
      v-model="model"
      mode="date"
      :name="fieldKey"
      :required="!!field?.required"
      :display-format="field?.displayFormat"
      :return-format="field?.returnFormat"
      :first-day="field?.firstDay ?? 1"
      :default-to-current-date="!!field?.defaultToCurrentDate"
    />
  </MiraiCmsFieldWrapper>
</template>
