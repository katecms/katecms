<script setup lang="ts">
import { computed } from 'vue'
import type { Field } from '@katecms/core'
import { useKateCmsFieldError } from '../../utils/field-errors'

type FieldPresentation = Partial<Pick<
  Extract<Field, { type: 'text' }>,
  'label' | 'instructions' | 'required'
>>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: FieldPresentation
  labelTag?: string
}>(), {
  field: () => ({}),
  labelTag: 'label',
})

const rootClass = 'katecms-field'
const errorMessage = useKateCmsFieldError(() => props.fieldKey)
const invalid = computed(() => !!errorMessage.value)
</script>

<template>
  <div
    :class="[rootClass, { 'is-invalid': invalid }]"
    :data-field-key="fieldKey"
  >
    <KateCmsFieldLabel
      :html-for="fieldKey"
      :field="field"
      :tag="labelTag"
    />
    <KateCmsFieldInstructions :field="field" />
    <slot />
    <div
      v-if="errorMessage"
      :class="`${rootClass}__error`"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-field';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(6);
  min-width: 0;

  &__error {
    font-size: math-rem(13);
    line-height: 1.4;
    color: $color-danger;
  }
}
</style>
