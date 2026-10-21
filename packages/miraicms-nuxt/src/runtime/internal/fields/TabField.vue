<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { collectPanelDefaults, isVisible } from '@miraicms/core'
import type { Field } from '@miraicms/core'
import { resolveField } from '../../utils/helpers'
import { useMiraiCmsFieldValues } from '../../utils/field-values'

type TabFieldConfig = Extract<Field, { type: 'tab' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: TabFieldConfig
}>(), {
  field: () => ({ type: 'tab', panels: [] }),
})

defineModel<unknown>()

const rootClass = 'miraicms-tab-field'
const activeIndex = ref(0)
const { getValues, setValue, ensureDefaults, removeKey } = useMiraiCmsFieldValues()

const panels = computed(() => props.field?.panels ?? [])
const placement = computed(() => props.field?.placement === 'left' ? 'left' : 'top')
const values = computed(() => getValues())

watch(
  panels,
  (list) => {
    if (!list.length) {
      activeIndex.value = 0
      return
    }
    if (activeIndex.value >= list.length) {
      activeIndex.value = 0
    }
  },
  { deep: true },
)

watch(
  () => props.field?.panels,
  () => {
    ensureDefaults(collectPanelDefaults(props.field))
    removeKey(props.fieldKey)
  },
  { immediate: true, deep: true },
)

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

function selectTab(index: number) {
  activeIndex.value = index
}
</script>

<template>
  <div
    :class="[rootClass, `${rootClass}--${placement}`]"
  >
    <div
      v-if="!panels.length"
      :class="`${rootClass}__hint`"
    >
      No tabs defined.
    </div>

    <template v-else>
      <div
        :class="`${rootClass}__nav`"
        role="tablist"
        :aria-orientation="placement === 'left' ? 'vertical' : 'horizontal'"
      >
        <button
          v-for="(tab, index) in panels"
          :id="`${fieldKey}-tab-${index}`"
          :key="`${fieldKey}-tab-${index}`"
          type="button"
          role="tab"
          :aria-selected="activeIndex === index"
          :aria-controls="`${fieldKey}-panel-${index}`"
          :tabindex="activeIndex === index ? 0 : -1"
          :class="[`${rootClass}__tab`, { 'is-active': activeIndex === index }]"
          @click="selectTab(index)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div
        v-for="(tab, index) in panels"
        v-show="activeIndex === index"
        :id="`${fieldKey}-panel-${index}`"
        :key="`${fieldKey}-panel-${index}`"
        role="tabpanel"
        :aria-labelledby="`${fieldKey}-tab-${index}`"
        :class="`${rootClass}__panel`"
      >
        <div :class="`${rootClass}__fields`">
          <div
            v-for="[subKey, subField] in visibleSubFields(tab.subFields)"
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
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-tab-field';

#{$root} {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid $color-border;
  border-radius: $border-radius;
  background-color: $color-surface;
  overflow: hidden;

  &--left {
    flex-direction: row;
    align-items: stretch;
  }

  &__hint {
    margin: 0;
    padding: math-rem(12);
    color: $color-muted;
  }

  &__nav {
    display: flex;
    flex-shrink: 0;
    background-color: $color-bg;
    border-bottom: 1px solid $color-border;
  }
  &--left {
    #{$root}__nav {
      flex-direction: column;
      width: math-rem(160);
      border-bottom: 0;
      border-right: 1px solid $color-border;
    }
  }

  &__tab {
    padding: math-rem(10) math-rem(14);
    border: 0;
    border-right: 1px solid $color-border;
    background: transparent;
    color: $color-muted;
    font: inherit;
    font-size: math-rem(13);
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:last-child {
      border-right: 0;
    }

    &:hover {
      color: $color-ink;
      background-color: $color-accent-wash;
    }

    &.is-active {
      color: $color-ink;
      font-weight: 600;
      background-color: $color-surface;
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid color-alpha($color-accent, 0.35);
      outline-offset: -2px;
    }
  }
  &--left {
    #{$root}__tab {
      border-right: 0;
      border-bottom: 1px solid $color-border;

      &:last-child {
        border-bottom: 0;
      }

      &.is-active {
        box-shadow: inset 2px 0 0 $color-accent;
      }
    }
  }
  &--top {
    #{$root}__tab.is-active {
      box-shadow: inset 0 -2px 0 $color-accent;
    }
  }

  &__panel {
    flex: 1 1 auto;
    min-width: 0;
    padding: math-rem(12) math-rem(8);
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
