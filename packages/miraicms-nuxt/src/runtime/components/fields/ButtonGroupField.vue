<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  choiceMapLookup,
  decodeChoiceValue,
  encodeChoiceValue,
} from '@miraicms/core'
import type { Field } from '@miraicms/core'

type ButtonGroupFieldConfig = Extract<Field, { type: 'button_group' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: ButtonGroupFieldConfig
}>(), {
  field: () => ({ type: 'button_group', label: '', choices: {} }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-button-group-field'
const lookup = computed(() => choiceMapLookup(props.field?.choices ?? {}))

function format(raw: string): unknown {
  return encodeChoiceValue(raw, lookup.value, props.field?.returnFormat)
}

function unformat(value: unknown): string {
  return decodeChoiceValue(value, lookup.value, props.field?.returnFormat)
}

const selected = computed<string>({
  get: () => unformat(model.value),
  set: (raw) => {
    model.value = raw === '' ? '' : format(raw)
  },
})

function onSelect(value: string) {
  selected.value = props.field?.allowNull && selected.value === value ? '' : value
}

onMounted(() => {
  const raw = selected.value
  model.value = raw === '' ? '' : format(raw)
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div
      :class="[
        rootClass,
        `${rootClass}--${field?.layout || 'horizontal'}`,
      ]"
    >
      <button
        v-for="(label, value) in field?.choices"
        :key="value"
        type="button"
        :class="[`${rootClass}__btn`, { 'is-active': selected === value }]"
        @click="onSelect(value)"
      >
        {{ label }}
      </button>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-button-group-field';

#{$root} {
  display: inline-flex;

  &--horizontal {
    #{$root} {
      &__btn {
        &:first-child {
          border-radius: $border-radius-inter 0 0 $border-radius-inter;
        }
        &:last-child {
          border-radius: 0 $border-radius-inter $border-radius-inter 0;
        }
      }
    }
  }

  &--vertical {
    flex-direction: column;

    #{$root} {
      &__btn {
        &:not(:first-child) {
          margin-left: 0;
          margin-top: -1px;
        }
        &:first-child {
          border-radius: $border-radius-inter $border-radius-inter 0 0;
        }
        &:last-child {
          border-radius: 0 0 $border-radius-inter $border-radius-inter;
        }
      }
    }
  }

  &__btn {
    padding: math-rem(10) math-rem(16);
    background-color: $color-surface;
    border: 1px solid $color-border;
    color: $color-ink;
    cursor: pointer;
    font-size: math-rem(13);

    &:not(:first-child) {
      margin-left: -1px;
    }

    &.is-active {
      background-color: $color-accent;
      border-color: $color-accent;
      color: $color-surface;
      position: relative;
      z-index: 1;
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      z-index: 2;
      box-shadow: 0 0 0 2px rgba($color-accent, 0.35);
    }
  }
}
</style>
