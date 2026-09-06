<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  choiceMapLookup,
  decodeChoiceValue,
  encodeChoiceValue,
} from '@miraicms/core'
import type { Field } from '@miraicms/core'

type CheckboxFieldConfig = Extract<Field, { type: 'checkbox' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: CheckboxFieldConfig
}>(), {
  field: () => ({ type: 'checkbox', label: '', choices: {} }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-checkbox-field'

const choiceKeys = computed(() => Object.keys(props.field?.choices ?? {}))
const lookup = computed(() => choiceMapLookup(props.field?.choices ?? {}))

function format(raw: string): unknown {
  return encodeChoiceValue(raw, lookup.value, props.field?.returnFormat)
}

function unformat(value: unknown): string {
  return decodeChoiceValue(value, lookup.value, props.field?.returnFormat)
}

const selected = computed<string[]>({
  get() {
    const value = model.value
    const arr = Array.isArray(value)
      ? value
      : value == null || value === ''
        ? []
        : [value]
    return arr.map(unformat)
  },
  set(raw) {
    model.value = raw.map(format)
  },
})

const allChecked = computed<boolean>({
  get: () => choiceKeys.value.length > 0 && choiceKeys.value.every(key => selected.value.includes(key)),
  set: (checked) => {
    selected.value = checked ? [...choiceKeys.value] : []
  },
})

onMounted(() => {
  model.value = selected.value.map(format)
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <div
      :class="[
        rootClass,
        `${rootClass}--${field?.layout || 'vertical'}`,
      ]"
    >
      <label
        v-if="field?.toggle"
        :class="[`${rootClass}__item`, `${rootClass}__item--toggle`]"
      >
        <input
          v-model="allChecked"
          type="checkbox"
        >
        <span>{{ field?.customChoiceButtonText || 'Select all' }}</span>
      </label>

      <label
        v-for="(label, value) in field?.choices"
        :key="value"
        :class="`${rootClass}__item`"
      >
        <input
          v-model="selected"
          type="checkbox"
          :name="`${fieldKey}[]`"
          :value="value"
        >
        <span>{{ label }}</span>
      </label>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-checkbox-field';

#{$root} {
  display: flex;
  gap: math-rem(8) math-rem(16);

  &--vertical {
    flex-direction: column;
  }

  &--horizontal {
    flex-direction: row;
    flex-wrap: wrap;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: math-rem(6);
    cursor: pointer;
    color: $color-ink;

    input {
      accent-color: $color-accent;
    }

    &--toggle {
      font-weight: 600;
      padding-bottom: math-rem(6);
      border-bottom: 1px solid $color-border;
    }
  }
}
</style>
