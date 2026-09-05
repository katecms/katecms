<script setup lang="ts">
import type { Field } from '@miraicms/core'

type FieldPresentation = Partial<Pick<
  Extract<Field, { type: 'text' }>,
  'instructions'
>>

withDefaults(defineProps<{
  field?: FieldPresentation
}>(), {
  field: () => ({}),
})

const rootClass = 'miraicms-field-instructions'
</script>

<template>
  <div
    v-if="field?.instructions"
    :class="rootClass"
  >
    {{ field.instructions }}
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-field-instructions';

#{$root} {
  margin: 0;
  font-size: math-rem(13);
  line-height: 1.4;
  color: $color-muted;
}
</style>
