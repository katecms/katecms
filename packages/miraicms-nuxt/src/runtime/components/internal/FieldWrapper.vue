<script setup lang="ts">
import type { Field } from '@miraicms/core'

type FieldPresentation = Partial<Pick<
  Extract<Field, { type: 'text' }>,
  'label' | 'instructions' | 'required'
>>

withDefaults(defineProps<{
  fieldKey: string
  field?: FieldPresentation
  labelTag?: string
}>(), {
  field: () => ({}),
  labelTag: 'label',
})

const rootClass = 'miraicms-field'
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsFieldLabel
      :html-for="fieldKey"
      :field="field"
      :tag="labelTag"
    />
    <MiraiCmsFieldInstructions :field="field" />
    <slot />
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-field';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(6);
  min-width: 0;
}
</style>
