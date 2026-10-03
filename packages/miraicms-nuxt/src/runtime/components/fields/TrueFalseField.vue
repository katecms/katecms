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
      <button
        v-if="field?.ui"
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

      <button
        v-else
        :id="fieldKey"
        type="button"
        role="checkbox"
        :aria-checked="!!model"
        :class="[`${rootClass}__checkbox`, { 'is-on': model }]"
        @click="model = !model"
      />

      <label
        v-if="field?.message"
        :for="fieldKey"
        :class="`${rootClass}__message`"
      >
        {{ field.message }}
      </label>
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

    &.is-on {
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

  &__checkbox {
    width: math-rem(44);
    height: math-rem(23);
    border-radius: math-rem(20);
    background-color: $color-muted;
    padding: 0;
    margin: 0;
    border: 0;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
    position: relative;
    transition: background-color .3s;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px rgba($color-accent, 0.35);
    }

    &:before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: math-rem(19);
      height: math-rem(19);
      border-radius: 50%;
      transition: left .3s;
      background-color: $color-surface;
    }

    &.is-on {
      background-color: $color-accent;

      &:before {
        left: 23px;
      }
    }
  }

  &__message {
    user-select: none;
    color: $color-ink;
    cursor: pointer;
  }
}
</style>
