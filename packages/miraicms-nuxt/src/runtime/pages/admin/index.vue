<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  buildFormValues,
  isVisible,
} from '@miraicms/core'
import type { Fields } from '@miraicms/core'
import { resolveField } from '../../utils/helpers'

const rootClass = 'miraicms-admin-demo'

const fields: Fields = {
  text_test: {
    type: 'text',
    label: 'Text',
    instructions: 'Text instructions',
    required: true,
    position: 'main',
    placeholder: 'Text Placeholder',
    defaultValue: 'Text Test Default',
    maxLength: 120,
    prepend: 'Prepend',
    append: 'Append',
    columnWidth: 50,
  },
  textarea_test: {
    type: 'textarea',
    label: 'Textarea',
    instructions: 'Textarea instructions',
    required: true,
    position: 'main',
    placeholder: 'Textarea',
    defaultValue: 'Textarea Test Default\n\nTextarea Test Default\nTextarea Test Default\n\nTextarea Test Default',
    maxLength: 500,
    rows: 6,
    newLines: 'autop',
    columnWidth: 50,
  },
  text_sidebar: {
    type: 'text',
    label: 'Sidebar text',
    instructions: 'Rendered in the sidebar',
    position: 'sidebar',
    placeholder: 'Sidebar',
    defaultValue: 'Aside',
  },
}

const values = reactive<Record<string, unknown>>(buildFormValues(fields))

const visibleFields = computed(() =>
  Object.entries(fields).filter(([, field]) =>
    isVisible(field.conditionalLogic, values),
  ),
)

const mainFields = computed(() =>
  visibleFields.value.filter(([, field]) => (field.position ?? 'main') === 'main'),
)

const sidebarFields = computed(() =>
  visibleFields.value.filter(([, field]) => field.position === 'sidebar'),
)
</script>

<template>
  <div :class="rootClass">
    <div :class="[`${rootClass}__layout`]">
      <div :class="[`${rootClass}__main`]">
        <div
          v-for="[key, field] in mainFields"
          :key="key"
          :class="[`${rootClass}__field`]"
          :style="field.columnWidth ? { width: `${field.columnWidth}%` } : undefined"
        >
          <component
            :is="resolveField(field.type)"
            v-model="values[key]"
            :field-key="key"
            :field="field"
          />
        </div>
      </div>

      <div
        v-if="sidebarFields.length"
        :class="[`${rootClass}__sidebar`]"
      >
        <component
          :is="resolveField(field.type)"
          v-for="[key, field] in sidebarFields"
          :key="key"
          v-model="values[key]"
          :field-key="key"
          :field="field"
        />
      </div>
    </div>

    <pre :class="[`${rootClass}__values`]">{{ values }}</pre>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-admin-demo';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(16);

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) math-rem(280);
    gap: math-rem(16);
    align-items: start;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  &__main {
    display: flex;
    flex-wrap: wrap;
    row-gap: math-rem(16);
    margin-left: math-rem(-8);
    margin-right: math-rem(-8);
  }

  &__field {
    padding-left: math-rem(8);
    padding-right: math-rem(8);
    width: 100%;
  }

  &__sidebar {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);
    padding: math-rem(16);
    background-color: $color-bg;
    border: 1px solid $color-border;
    border-radius: $border-radius;
  }

  &__values {
    margin: 0;
    padding: math-rem(12);
    overflow: auto;
    background-color: $color-bg;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    color: $color-ink;
    font-size: math-rem(13);
  }
}
</style>
