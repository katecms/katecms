<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Field } from '@miraicms/core'

type ImageSelectFieldConfig = Extract<Field, { type: 'image_select' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: ImageSelectFieldConfig
}>(), {
  field: () => ({ type: 'image_select', label: '', choices: {} }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-image-select-field'
const isMultiple = computed(() => Boolean(props.field?.multiple))
const imgWidth = computed(() => props.field?.width ?? 140)
const imgHeight = computed(() => props.field?.height ?? 110)

function choiceLabel(raw: string): string {
  return props.field?.choices?.[raw]?.label ?? raw
}

function format(raw: string): unknown {
  const label = choiceLabel(raw)
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
    const byLabel = Object.keys(choices).find(key => choices[key]?.label === value)
    return byLabel ?? String(value)
  }
  return String(value)
}

const selectedMultiple = computed<string[]>({
  get() {
    const value = model.value
    const arr = Array.isArray(value)
      ? value
      : value == null || value === ''
        ? []
        : [value]
    return arr.map(unformat).filter(Boolean)
  },
  set(raw) {
    model.value = raw.map(format)
  },
})

const selectedSingle = computed<string>({
  get: () => unformat(model.value),
  set: (raw) => {
    model.value = raw === '' ? '' : format(raw)
  },
})

function isSelected(value: string): boolean {
  return isMultiple.value
    ? selectedMultiple.value.includes(value)
    : selectedSingle.value === value
}

function onRadioClick(value: string) {
  if (props.field?.allowNull && selectedSingle.value === value) {
    selectedSingle.value = ''
  }
}

onMounted(() => {
  if (isMultiple.value) {
    model.value = selectedMultiple.value.map(format)
    return
  }
  const raw = selectedSingle.value
  model.value = raw === '' ? '' : format(raw)
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
        `${rootClass}--${field?.layout || 'horizontal'}`,
      ]"
    >
      <label
        v-for="(choice, value) in field?.choices"
        :key="value"
        :class="[
          `${rootClass}__item`,
          { 'is-selected': isSelected(value) },
        ]"
      >
        <input
          v-if="isMultiple"
          v-model="selectedMultiple"
          type="checkbox"
          :name="`${fieldKey}[]`"
          :value="value"
          :class="`${rootClass}__input`"
        >
        <input
          v-else
          v-model="selectedSingle"
          type="radio"
          :name="fieldKey"
          :value="value"
          :class="`${rootClass}__input`"
          @click="onRadioClick(value)"
        >
        <span
          :class="`${rootClass}__media`"
          :style="{
            width: `${imgWidth}px`,
            height: `${imgHeight}px`,
          }"
        >
          <img
            :src="choice.image"
            :alt="choice.label"
            loading="lazy"
          >
        </span>
        <span :class="`${rootClass}__label`">{{ choice.label }}</span>
      </label>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-image-select-field';

#{$root} {
  display: flex;
  gap: math-rem(12);
  flex-wrap: wrap;

  &--vertical {
    flex-direction: column;
    align-items: flex-start;
  }

  &--horizontal {
    flex-direction: row;
  }

  &__item {
    flex: 0 0 auto;
    width: auto;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 2px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    cursor: pointer;
    transition: border-color .15s ease, box-shadow .15s ease;

    &:hover {
      border-color: $color-accent-hover;
    }

    &.is-selected {
      border-color: $color-accent;
      box-shadow: 0 0 0 1px $color-accent;
    }
  }

  &__input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    margin: 0 !important;
  }

  &__media {
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $color-bg;
    overflow: hidden;

    img {
      display: block;
      width: 100%;
      height: 100% !important;
      object-fit: contain;
    }
  }

  &__label {
    flex: 0 0 auto;
    padding: math-rem(5) math-rem(8);
    text-align: center;
    font-size: math-rem(12);
    line-height: 1.2;
    color: $color-ink;
    background: $color-surface;
    border-top: 1px solid $color-border;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
