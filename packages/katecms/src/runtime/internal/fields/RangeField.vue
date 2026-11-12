<script setup lang="ts">
import type { Field } from '@katecms/core'

const rootClass = 'katecms-range-field'

type RangeFieldConfig = Extract<Field, { type: 'range' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: RangeFieldConfig
}>(), {
  field: () => ({ type: 'range', label: '' }),
})

const model = defineModel<number>()
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <KateCmsInputControl
      v-model="model"
      type="range"
      numeric
      :field-key="fieldKey"
      :field="field"
      :min="field?.min ?? undefined"
      :max="field?.max ?? undefined"
      :step="field?.step ?? undefined"
    >
      <template #append>
        <div :class="`${rootClass}__value`">
          {{ `${model} / ${field?.max ?? '100'}` }}
        </div>
      </template>
    </KateCmsInputControl>
  </KateCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-range-field';

#{$root} {
  &__value {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    font-variant-numeric: tabular-nums;
    font-size: math-rem(11);
    line-height: 1.2;
    color: $color-muted;
    pointer-events: none;
    min-width: 20px;
    text-align: center;
  }
}
</style>
