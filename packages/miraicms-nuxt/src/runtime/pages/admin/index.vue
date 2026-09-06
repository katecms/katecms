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
  email_test: {
    type: 'email',
    label: 'Email',
    instructions: 'Email instructions',
    required: true,
    position: 'main',
    placeholder: 'name@example.com',
    defaultValue: 'test@example.com',
    prepend: '@',
    append: '.com',
    columnWidth: 50,
  },
  url_test: {
    type: 'url',
    label: 'Url',
    instructions: 'Url instructions',
    required: true,
    position: 'main',
    placeholder: 'https://example.com',
    defaultValue: 'https://example.com',
    columnWidth: 50,
  },
  oembed_test: {
    type: 'oembed',
    label: 'Oembed',
    instructions: 'Oembed instructions',
    required: true,
    defaultValue: 'https://youtu.be/AA4EADkgk4Q?si=iihiGODQHIS-tgR_',
    position: 'main',
    width: 560,
    height: 315,
    columnWidth: 50,
  },
  password_test: {
    type: 'password',
    label: 'Password',
    instructions: 'Password instructions',
    required: true,
    position: 'main',
    placeholder: 'Password',
    prepend: 'Prepend',
    append: 'Append',
    columnWidth: 50,
  },
  button_group_test: {
    type: 'button_group',
    label: 'Button Group',
    instructions: 'Button group instructions',
    required: true,
    position: 'main',
    layout: 'horizontal',
    choices: {
      red: 'Red',
      green: 'Green',
      blue: 'Blue',
    },
    defaultValue: 'green',
    returnFormat: 'label',
    columnWidth: 50,
  },
  checkbox_test: {
    type: 'checkbox',
    label: 'Checkbox',
    instructions: 'Checkbox instructions',
    required: true,
    position: 'main',
    layout: 'vertical',
    toggle: true,
    choices: {
      red: 'Red',
      green: 'Green',
      blue: 'Blue',
    },
    defaultValue: ['green', 'blue'],
    returnFormat: 'array',
    columnWidth: 50,
  },
  color_picker_test: {
    type: 'color_picker',
    label: 'Color Picker',
    instructions: 'Color picker instructions',
    required: true,
    position: 'main',
    defaultValue: '#2F6FED',
    enableOpacity: true,
    returnFormat: 'array',
    showColorWheel: true,
    paletteColors: [
      'rgba(244, 67, 54, 1)',
      'rgba(233, 30, 99, 0.95)',
      'rgba(156, 39, 176, 0.9)',
      'rgba(103, 58, 183, 0.85)',
      'rgba(63, 81, 181, 0.8)',
      'rgba(47, 111, 237, 0.9)',
      'rgba(3, 169, 244, 0.7)',
      'rgba(0, 188, 212, 0.7)',
      'rgba(42, 154, 102, 0.85)',
      'rgba(76, 175, 80, 0.8)',
      'rgba(196, 133, 26, 0.9)',
      'rgba(214, 69, 69, 1)',
    ],
    rgba: true,
    hsla: true,
    columnWidth: 50,
  },
  date_picker_test: {
    type: 'date_picker',
    label: 'Date Picker',
    instructions: 'Date picker instructions',
    required: true,
    position: 'main',
    displayFormat: 'DD.MM.YYYY',
    returnFormat: 'YYYY-MM-DD',
    firstDay: 1,
    defaultToCurrentDate: true,
    columnWidth: 50,
  },
  date_time_picker_test: {
    type: 'date_time_picker',
    label: 'Date Time Picker',
    instructions: 'Date time picker instructions',
    required: true,
    position: 'main',
    displayFormat: 'DD.MM.YYYY HH:mm',
    returnFormat: 'YYYY-MM-DD HH:mm',
    firstDay: 1,
    defaultToCurrentDate: true,
    columnWidth: 50,
  },
  time_picker_test: {
    type: 'time_picker',
    label: 'Time Picker',
    instructions: 'Time picker instructions',
    required: true,
    position: 'main',
    displayFormat: 'HH:mm',
    returnFormat: 'HH:mm',
    columnWidth: 50,
  },
  number_test: {
    type: 'number',
    label: 'Number',
    instructions: 'Number instructions',
    required: true,
    position: 'main',
    placeholder: 'Number',
    defaultValue: 10,
    min: 0,
    max: 100,
    step: 5,
    prepend: '$',
    append: 'USD',
    columnWidth: 50,
  },
  range_test: {
    type: 'range',
    label: 'Range',
    instructions: 'Range instructions',
    required: true,
    position: 'main',
    defaultValue: 25,
    min: 0,
    max: 200,
    step: 5,
    prepend: 'min',
    append: 'max',
    columnWidth: 50,
  },
  radio_test: {
    type: 'radio',
    label: 'Radio',
    instructions: 'Radio instructions',
    required: true,
    position: 'main',
    layout: 'vertical',
    allowNull: true,
    choices: {
      red: 'Red',
      green: 'Green',
      blue: 'Blue',
    },
    defaultValue: 'green',
    returnFormat: 'label',
    columnWidth: 50,
  },
  true_false_test: {
    type: 'true_false',
    label: 'True / False',
    instructions: 'True/False instructions',
    required: true,
    position: 'main',
    message: 'Enable option',
    ui: true,
    uiOnText: 'On',
    uiOffText: 'Off',
    defaultValue: true,
    columnWidth: 50,
  },
  select_test: {
    type: 'select',
    label: 'Select',
    instructions: 'Select instructions',
    required: true,
    position: 'main',
    placeholder: '— Select —',
    allowNull: true,
    clearable: true,
    search: true,
    searchPlaceholder: 'Filter…',
    choices: [
      { val: 'red', lbl: 'Red' },
      { val: 'green', lbl: 'Green', check: true },
      { val: 'blue', lbl: 'Blue' },
      {
        type: 'group',
        title: 'Other',
        childs: [
          { val: 'amber', lbl: 'Amber' },
          { val: 'gray', lbl: 'Gray', disabled: true },
        ],
      },
    ],
    defaultValue: 'green',
    returnFormat: 'array',
    columnWidth: 50,
  },
  separator_test: {
    type: 'separator',
    label: 'Separator',
    position: 'main',
    columnWidth: 100,
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
