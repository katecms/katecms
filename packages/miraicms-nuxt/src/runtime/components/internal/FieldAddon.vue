<script setup lang="ts">
import type { Field } from '@miraicms/core'

type AddonField = Partial<Pick<
  Extract<Field, { type: 'text' }>,
  'prepend' | 'append'
>>

withDefaults(defineProps<{
  field?: AddonField
  position?: 'prepend' | 'append'
}>(), {
  field: () => ({}),
  position: 'prepend',
})

const rootClass = 'miraicms-field-addon'
</script>

<template>
  <div
    v-if="field?.[position]"
    :class="[
      rootClass,
      `${rootClass}--${position}`,
    ]"
  >
    {{ field[position] }}
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-field-addon';

#{$root} {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  width: auto;
  max-width: 100%;
  padding: 0 math-rem(12);
  background-color: $color-bg;
  border: 1px solid $color-border;
  color: $color-muted;
  font-size: math-rem(14);
  white-space: nowrap;

  &--prepend {
    border-right: 0;
    border-radius: $border-radius-inter 0 0 $border-radius-inter;
  }

  &--append {
    border-left: 0;
    border-radius: 0 $border-radius-inter $border-radius-inter 0;
  }
}
</style>
