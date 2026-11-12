<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { collectPanelDefaults, isVisible } from '@katecms/core'
import type { Field } from '@katecms/core'
import { resolveField } from '../../utils/helpers'
import { useKateCmsFieldValues } from '../../utils/field-values'

type AccordionFieldConfig = Extract<Field, { type: 'accordion' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: AccordionFieldConfig
}>(), {
  field: () => ({ type: 'accordion', panels: [] }),
})

defineModel<unknown>()

const rootClass = 'katecms-accordion-field'
const openIndexes = ref<number[]>([])
const { getValues, setValue, ensureDefaults, removeKey } = useKateCmsFieldValues()

const panels = computed(() => props.field?.panels ?? [])
const multiExpand = computed(() => !!props.field?.multiExpand)
const values = computed(() => getValues())

function resolveInitialOpen(): number[] {
  const list = panels.value
  if (!list.length) {
    return []
  }
  const index = typeof props.field?.open === 'number' ? props.field.open : 0
  if (index < 0 || index >= list.length) {
    return []
  }
  return [index]
}

watch(
  [panels, () => props.field?.open, multiExpand],
  () => {
    const valid = new Set(panels.value.map((_, i) => i))
    const next = openIndexes.value.filter(i => valid.has(i))
    if (!next.length) {
      openIndexes.value = resolveInitialOpen()
      return
    }
    if (!multiExpand.value && next.length > 1) {
      openIndexes.value = [next[0]!]
      return
    }
    if (next.length !== openIndexes.value.length) {
      openIndexes.value = next
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => props.field?.panels,
  () => {
    ensureDefaults(collectPanelDefaults(props.field))
    removeKey(props.fieldKey)
  },
  { immediate: true, deep: true },
)

function isOpen(index: number): boolean {
  return openIndexes.value.includes(index)
}

function togglePanel(index: number) {
  if (multiExpand.value) {
    openIndexes.value = isOpen(index)
      ? openIndexes.value.filter(i => i !== index)
      : [...openIndexes.value, index]
    return
  }

  openIndexes.value = isOpen(index) ? [] : [index]
}

function subFieldKey(key: string): string {
  return `${props.fieldKey}_${key}`
}

function visibleSubFields(subFields: Record<string, Field>) {
  return Object.entries(subFields).filter(([, subField]) =>
    isVisible(subField.conditionalLogic, values.value),
  )
}

function updateSubField(key: string, value: unknown) {
  setValue(key, value)
}
</script>

<template>
  <div :class="rootClass">
    <div
      v-if="!panels.length"
      :class="`${rootClass}__hint`"
    >
      No panels defined.
    </div>

    <template v-else>
      <div
        v-for="(panel, index) in panels"
        :key="`${fieldKey}-panel-${index}`"
        :class="[`${rootClass}__item`, { 'is-open': isOpen(index) }]"
      >
        <button
          :id="`${fieldKey}-header-${index}`"
          type="button"
          :class="`${rootClass}__header`"
          :aria-expanded="isOpen(index)"
          :aria-controls="`${fieldKey}-body-${index}`"
          @click="togglePanel(index)"
        >
          <span :class="`${rootClass}__title`">{{ panel.label }}</span>
          <span
            :class="`${rootClass}__chevron`"
            aria-hidden="true"
          />
        </button>

        <div
          v-show="isOpen(index)"
          :id="`${fieldKey}-body-${index}`"
          role="region"
          :aria-labelledby="`${fieldKey}-header-${index}`"
          :class="`${rootClass}__body`"
        >
          <div :class="`${rootClass}__fields`">
            <div
              v-for="[subKey, subField] in visibleSubFields(panel.subFields)"
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
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-accordion-field';

#{$root} {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid $color-border;
  border-radius: $border-radius;
  background-color: $color-surface;
  overflow: hidden;

  &__hint {
    margin: 0;
    padding: math-rem(12);
    color: $color-muted;
  }

  &__item {
    border-bottom: 1px solid $color-border;

    &:last-child {
      border-bottom: 0;
    }

    &.is-open #{$root}__header {
      background-color: $color-surface;
      box-shadow: inset 3px 0 0 $color-accent;
    }

    &.is-open #{$root}__chevron {
      transform: rotate(-135deg);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(12);
    width: 100%;
    padding: math-rem(12) math-rem(14);
    border: 0;
    background-color: $color-bg;
    color: $color-ink;
    font: inherit;
    font-size: math-rem(13);
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: $color-accent-wash;
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid color-alpha($color-accent, 0.35);
      outline-offset: -2px;
    }
  }

  &__title {
    min-width: 0;
  }

  &__chevron {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-right: 2px solid $color-muted;
    border-bottom: 2px solid $color-muted;
    transform: rotate(45deg);
    transition: transform 0.15s ease;
  }

  &__body {
    padding: math-rem(12) math-rem(8);
    border-top: 1px solid $color-border;
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
