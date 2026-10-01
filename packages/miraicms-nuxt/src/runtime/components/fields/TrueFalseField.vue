<script setup lang="ts">
import type { Field } from '@miraicms/core'

type TrueFalseFieldConfig = Extract<Field, { type: 'true_false' }>

withDefaults(defineProps<{
  fieldKey: string
  field?: TrueFalseFieldConfig
}>(), {
  field: () => ({ type: 'true_false', label: '' }),
})

const model = defineModel<boolean>()

const rootClass = 'miraicms-true-false-field'
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <div :class="rootClass">
      <template v-if="field?.ui">
        <button
          :id="fieldKey"
          type="button"
          role="switch"
          :aria-checked="!!model"
          :class="[`${rootClass}__switch`, { 'is-on': model }]"
          @click="model = !model"
        >
          <span :class="`${rootClass}__on`">{{ field?.uiOnText || 'Yes' }}</span>
          <span :class="`${rootClass}__off`">{{ field?.uiOffText || 'No' }}</span>
          <span :class="`${rootClass}__slider`" />
        </button>
      </template>

      <label
        v-else
        :class="`${rootClass}__checkbox`"
      >
        <input
          :id="fieldKey"
          v-model="model"
          type="checkbox"
          :name="fieldKey"
        >
      </label>

      <span
        v-if="field?.message"
        :class="`${rootClass}__message`"
      >{{ field.message }}</span>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-true-false-field';

#{$root} {
  display: inline-flex;
  align-items: center;
  gap: math-rem(10);

  &__switch {
    position: relative;
    display: inline-flex;
    align-items: stretch;
    height: math-rem(38);
    padding: 0;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background-color: $color-surface;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
    transition: background-color .3s, border-color .3s;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px rgba($color-accent, 0.35);
    }
  }

  &__on,
  &__off {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    font-size: math-rem(13);
    color: $color-accent;
    z-index: 1;
    transition: color .3s;
  }

  &__slider {
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: 2px;
    width: calc(50% - 4px);
    background-color: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    transition: left 0.3s ease;
    z-index: 2;
  }

  &__switch.is-on {
    background-color: $color-accent;
    border-color: $color-accent;

    #{$root} {
      &__slider {
        left: calc(50% + 2px);
      }
      &__on,
      &__off {
        color: $color-surface;
      }
    }
  }

  &__checkbox {
    display: flex;
    align-items: center;

    input {
      accent-color: $color-accent;
      margin: 0;
    }
  }

  &__message {
    user-select: none;
    color: $color-ink;
  }
}
</style>
