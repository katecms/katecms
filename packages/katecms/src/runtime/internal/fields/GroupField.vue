<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  ensureGroupDefaults,
  isLayoutOnlyFieldType,
  isVisible,
} from '@katecms/core'
import type { Field } from '@katecms/core'
import { resolveField } from '../../utils/helpers'
import { provideKateCmsFieldValues } from '../../utils/field-values'

type GroupFieldConfig = Extract<Field, { type: 'group' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: GroupFieldConfig
}>(), {
  field: () => ({ type: 'group', label: '', subFields: {} }),
})

const model = defineModel<Record<string, unknown>>({ default: () => ({}) })

provideKateCmsFieldValues(model)

const rootClass = 'katecms-group-field'
const subFields = computed(() => props.field?.subFields ?? {})
const values = computed(() => (
  model.value && typeof model.value === 'object' && !Array.isArray(model.value)
    ? model.value
    : {}
))

function ensureModel() {
  const normalized = ensureGroupDefaults(model.value, props.field)
  if (normalized !== model.value) {
    model.value = normalized
  }
}

watch(
  () => subFields.value,
  () => {
    ensureModel()
  },
  { immediate: true, deep: true },
)

function subFieldKey(key: string): string {
  return `${props.fieldKey}_${key}`
}

function visibleSubFields() {
  return Object.entries(subFields.value).filter(([, subField]) =>
    isVisible(subField.conditionalLogic, values.value),
  )
}

function updateSubField(key: string, value: unknown) {
  if (isLayoutOnlyFieldType(subFields.value[key]?.type ?? '')) {
    return
  }
  model.value = {
    ...values.value,
    [key]: value,
  }
}
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div
        v-if="!Object.keys(subFields).length"
        :class="`${rootClass}__hint`"
      >
        No subfields defined.
      </div>

      <div
        v-else
        :class="`${rootClass}__fields`"
      >
        <div
          v-for="[subKey, subField] in visibleSubFields()"
          :key="subKey"
          :class="`${rootClass}__field`"
          :style="subField.columnWidth ? `width: ${subField.columnWidth}%` : undefined"
        >
          <component
            :is="resolveField(subField.type)"
            :model-value="values[subKey]"
            :field-key="subFieldKey(subKey)"
            :field="subField"
            @update:model-value="updateSubField(subKey, $event)"
          />
        </div>
      </div>
    </div>
  </KateCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-group-field';

#{$root} {
  border: 1px solid $color-border;
  border-radius: $border-radius;
  background-color: $color-surface;
  padding: math-rem(12) math-rem(8);

  &__hint {
    margin: 0;
    color: $color-muted;
  }

  &__fields {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(16) 0;
    margin-left: math-rem(-8);
    margin-right: math-rem(-8);
  }

  &__field {
    padding-left: math-rem(8);
    padding-right: math-rem(8);
    width: 100%;
  }
}
</style>
