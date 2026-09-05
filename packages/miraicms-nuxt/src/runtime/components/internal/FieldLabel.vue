<script setup lang="ts">
import type { Field } from '@miraicms/core'

type FieldPresentation = Partial<Pick<
  Extract<Field, { type: 'text' }>,
  'label' | 'required'
>>

withDefaults(defineProps<{
  field?: FieldPresentation
  tag?: string
  htmlFor?: string
}>(), {
  field: () => ({}),
  tag: 'label',
})

const rootClass = 'miraicms-field-label'
</script>

<template>
  <component
    :is="tag"
    v-if="field?.label"
    :class="rootClass"
    :for="tag === 'label' ? htmlFor : undefined"
  >
    {{ field.label }}
    <span
      v-if="field?.required"
      :class="[`${rootClass}__required`]"
      aria-hidden="true"
    >*</span>
  </component>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-field-label';

#{$root} {
  display: flex;
  align-items: center;
  gap: math-rem(4);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  font-size: math-rem(12);
  color: $color-ink;

  &__required {
    color: $color-danger;
  }
}
</style>
