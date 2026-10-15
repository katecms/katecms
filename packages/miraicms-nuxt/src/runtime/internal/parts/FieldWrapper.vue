<script setup lang="ts">
import { computed } from 'vue'
import type { Field } from '@miraicms/core'
import { useMiraiCmsFieldError } from '../../utils/field-errors'

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

const rootClass = 'miraicms-field'
const errorMessage = useMiraiCmsFieldError(() => props.fieldKey)
const invalid = computed(() => !!errorMessage.value)
</script>

<template>
  <div
    :class="[rootClass, { 'is-invalid': invalid }]"
    :data-field-key="fieldKey"
  >
    <MiraiCmsFieldLabel
      :html-for="fieldKey"
      :field="field"
      :tag="labelTag"
    />
    <MiraiCmsFieldInstructions :field="field" />
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

$root: '.miraicms-field';

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
