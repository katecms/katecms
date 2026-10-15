<script setup lang="ts">
import type { Field } from '@miraicms/core'

type TextareaFieldConfig = Extract<Field, { type: 'textarea' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: TextareaFieldConfig
}>(), {
  field: () => ({ type: 'textarea', label: '' }),
})

const model = defineModel<string>()

const rootClass = 'miraicms-textarea-field'
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <textarea
      :id="fieldKey"
      v-model="model"
      :class="rootClass"
      :name="fieldKey"
      :rows="field?.rows ?? 8"
      :placeholder="field?.placeholder || undefined"
      :required="!!field?.required"
      :maxlength="field?.maxLength || undefined"
    />
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-textarea-field';

#{$root} {
  display: block;
  width: 100%;
  margin: 0;
  padding: math-rem(10);
  border: 1px solid $color-border;
  border-radius: $border-radius;
  background-color: $color-surface;
  color: $color-ink;
  font-size: math-rem(14);
  line-height: 1.5;
  resize: vertical;

  @include placeholder($color-muted);

  &:focus {
    outline: none;
    border-color: $color-accent;
  }
}
</style>
