<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Field } from '@miraicms/core'

type RadioFieldConfig = Extract<Field, { type: 'radio' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: RadioFieldConfig
}>(), {
  field: () => ({ type: 'radio', label: '', choices: {} }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-radio-field'

function format(raw: string): unknown {
  const label = props.field?.choices?.[raw] ?? raw
  if (props.field?.returnFormat === 'label') {
    return label
  }
  if (props.field?.returnFormat === 'array') {
    return { value: raw, label }
  }
  return raw
}

function unformat(value: unknown): string {
  if (value == null || value === '') {
    return ''
  }
  if (props.field?.returnFormat === 'array' && typeof value === 'object') {
    return String((value as { value?: unknown }).value ?? '')
  }
  if (props.field?.returnFormat === 'label') {
    const choices = props.field?.choices ?? {}
    const byLabel = Object.keys(choices).find(key => choices[key] === value)
    return byLabel ?? String(value)
  }
  return String(value)
}

const selected = computed<string>({
  get: () => unformat(model.value),
  set: (raw) => {
    model.value = raw === '' ? '' : format(raw)
  },
})

onMounted(() => {
  const raw = selected.value
  model.value = raw === '' ? '' : format(raw)
})

function onRadioClick(value: string) {
  if (props.field?.allowNull && selected.value === value) {
    selected.value = ''
  }
}
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
        `${rootClass}--${field?.layout || 'vertical'}`,
      ]"
    >
      <label
        v-for="(label, value) in field?.choices"
        :key="value"
        :class="`${rootClass}__item`"
      >
        <input
          v-model="selected"
          type="radio"
          :name="fieldKey"
          :value="value"
          @click="onRadioClick(value)"
        >
        <span>{{ label }}</span>
      </label>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-radio-field';

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
  }
}
</style>
