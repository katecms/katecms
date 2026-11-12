<script setup lang="ts">
import type { Field } from '@katecms/core'

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
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <KateCmsDateTimeControl
      :id="fieldKey"
      v-model="model"
      mode="time"
      :name="fieldKey"
      :required="!!field?.required"
      :display-format="field?.displayFormat"
      :return-format="field?.returnFormat"
    />
  </KateCmsFieldWrapper>
</template>
