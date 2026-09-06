<script setup lang="ts">
import type { Field } from '@miraicms/core'

type TimePickerFieldConfig = Extract<Field, { type: 'time_picker' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: TimePickerFieldConfig
}>(), {
  field: () => ({ type: 'time_picker', label: '' }),
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
      mode="time"
      :name="fieldKey"
      :required="!!field?.required"
      :display-format="field?.displayFormat"
      :return-format="field?.returnFormat"
    />
  </MiraiCmsFieldWrapper>
</template>
