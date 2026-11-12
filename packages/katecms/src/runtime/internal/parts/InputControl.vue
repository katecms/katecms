<script setup lang="ts">
import type { Field } from '@katecms/core'

type ControlField = Partial<Pick<
  Extract<Field, { type: 'text' }>,
  'placeholder' | 'prepend' | 'append' | 'required'
>>

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: ControlField
  type?: string
  numeric?: boolean
}>(), {
  field: () => ({}),
  type: 'text',
  numeric: false,
})

const model = defineModel<string | number | null>()

const rootClass = 'katecms-input-control'

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  model.value = props.numeric ? (value === '' ? null : Number(value)) : value
}
</script>

<template>
  <div :class="[rootClass, `${rootClass}--type-${type}`]">
    <KateCmsFieldAddon
      :field="field"
      position="prepend"
    />
    <input
      :id="fieldKey"
      :value="model"
      :type="type"
      :name="fieldKey"
      :placeholder="field?.placeholder || undefined"
      :required="!!field?.required"
      :class="[
        `${rootClass}__input`,
        `${rootClass}__input--type-${type}`,
        { [`${rootClass}__input--is-prepend`]: field?.prepend },
        { [`${rootClass}__input--is-append`]: field?.append || $slots.append },
      ]"
      v-bind="$attrs"
      @input="onInput"
    >
    <slot name="append" />
    <KateCmsFieldAddon
      :field="field"
      position="append"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-input-control';

#{$root} {
  display: flex;
  position: relative;

  &--type-range {
    :deep(.katecms-field-addon) {
      border: 1px solid $color-border;
      border-radius: $border-radius-inter;
    }

    :deep(.katecms-field-addon--prepend) {
      margin-right: math-rem(10);
    }

    :deep(.katecms-field-addon--append) {
      margin-left: math-rem(10);
    }
  }

  &__input {
    height: math-rem(38);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    padding: 0 math-rem(10);
    color: $color-ink;
    background-color: $color-surface;
    font-size: math-rem(14);
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%;
    margin: 0;

    @include placeholder($color-muted);

    &--is-prepend {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    &--is-append {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    &--type-range {
      $track-h: 6px;
      $thumb-size: 14px;

      @mixin range-track {
        height: $track-h;
        background: $color-border;
        border: 0;
        border-radius: 999px;
      }

      @mixin range-thumb {
        width: $thumb-size;
        height: $thumb-size;
        background: $color-accent;
        border: 2px solid $color-surface;
        border-radius: 50%;
        box-shadow: $shadow-sm;
        cursor: pointer;
      }

      height: $thumb-size;
      padding: 0;
      background: transparent;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
      display: block;
      border: 0;
      border-radius: 0;
      align-self: flex-end;
      margin: math-rem(24) 0 0;

      &:focus {
        outline: none;
      }

      &::-webkit-slider-runnable-track {
        @include range-track;
      }

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        margin-top: calc((#{$track-h} - #{$thumb-size}) / 2);

        @include range-thumb;
      }

      &:focus::-webkit-slider-thumb {
        box-shadow: 0 0 0 2px color-alpha($color-accent, 0.4);
      }

      &::-moz-range-track {
        @include range-track;
      }

      &::-moz-range-progress {
        height: $track-h;
        background: $color-accent;
        border-radius: 999px;
      }

      &::-moz-range-thumb {
        @include range-thumb;
      }

      &:focus::-moz-range-thumb {
        box-shadow: 0 0 0 2px color-alpha($color-accent, 0.4);
      }
    }

    &:focus {
      outline: none;
      border-color: $color-accent;
    }
  }
}
</style>
