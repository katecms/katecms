<script setup lang="ts">
import type { Field } from '@katecms/core'

type SeparatorFieldConfig = Extract<Field, { type: 'separator' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: SeparatorFieldConfig
}>(), {
  field: () => ({ type: 'separator' }),
})

const rootClass = 'katecms-separator-field'
</script>

<template>
  <div
    :class="rootClass"
    role="separator"
    :aria-label="field?.label || undefined"
  >
    <template v-if="field?.label">
      <span
        :class="`${rootClass}__line`"
        aria-hidden="true"
      />
      <span :class="`${rootClass}__label`">{{ field.label }}</span>
      <span
        :class="`${rootClass}__line`"
        aria-hidden="true"
      />
    </template>
    <span
      v-else
      :class="`${rootClass}__hr`"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-separator-field';

#{$root} {
  display: flex;
  align-items: center;
  gap: math-rem(12);
  width: 100%;
  margin: math-rem(10) 0;

  &__label {
    flex-shrink: 0;
    font-size: math-rem(17);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: $color-ink;
    white-space: nowrap;
  }

  &__line {
    flex: 1 1 auto;
    height: 4px;
    background-color: $color-accent;
  }

  &__hr {
    display: block;
    flex: 1 1 auto;
    width: 100%;
    height: 4px;
    margin: 0;
    background-color: $color-accent;
  }
}
</style>
