<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useHead } from '#imports'
import {
  buildFormValues,
  isVisible,
} from '@miraicms/core'
import type { Fields } from '@miraicms/core'
import { resolveField } from '../../utils/helpers'
import { provideMiraiCmsFieldValues } from '../../utils/field-values'

const rootClass = 'miraicms-admin-demo'

useHead({ title: 'Field demo' })

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
  wysiwyg_test: {
    type: 'wysiwyg',
    label: 'Wysiwyg',
    instructions: 'Wysiwyg instructions',
    required: true,
    position: 'main',
    defaultValue: '<p>Wysiwyg <strong>default</strong> value</p>',
    tabs: 'all',
    toolbar: 'full',
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
    allowCustomChoices: true,
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
    allowCustomChoices: true,
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
  true_false_test_no_ui: {
    type: 'true_false',
    label: 'True / False',
    instructions: 'True/False instructions',
    required: true,
    position: 'main',
    message: 'Enable option',
    defaultValue: true,
    columnWidth: 50,
  },
  select_test: {
    type: 'select',
    label: 'Select',
    instructions: 'Select instructions',
    required: true,
    position: 'main',
    placeholder: 'тАФ Select тАФ',
    allowNull: true,
    clearable: true,
    search: true,
    searchPlaceholder: 'FilterтАж',
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
  image_select_test: {
    type: 'image_select',
    label: 'Image Select',
    instructions: 'Single select (radio) with images',
    required: true,
    position: 'main',
    layout: 'horizontal',
    allowNull: true,
    choices: {
      red: { label: 'Red', image: 'https://picsum.photos/800/600' },
      green: { label: 'Green', image: 'https://picsum.photos/600/600' },
      blue: { label: 'Blue', image: 'https://picsum.photos/800/400' },
    },
    defaultValue: 'green',
    returnFormat: 'value',
    columnWidth: 50,
  },
  image_select_multiple_test: {
    type: 'image_select',
    label: 'Image Select Multiple',
    instructions: 'Multiple select (checkbox) with images',
    required: true,
    position: 'main',
    layout: 'horizontal',
    multiple: true,
    choices: {
      left: { label: 'Left', image: 'https://picsum.photos/700/600' },
      center: { label: 'Center', image: 'https://picsum.photos/500/600' },
      right: { label: 'Right', image: 'https://picsum.photos/800/420' },
    },
    defaultValue: ['left', 'center'],
    returnFormat: 'array',
    width: 140,
    height: 110,
    columnWidth: 50,
  },
  separator_test: {
    type: 'separator',
    label: 'Separator',
    position: 'main',
    columnWidth: 100,
  },
  group_test: {
    type: 'group',
    label: 'Group',
    instructions: 'Group instructions',
    position: 'main',
    columnWidth: 100,
    subFields: {
      title: {
        type: 'text',
        label: 'Title',
        required: true,
        placeholder: 'Title',
        defaultValue: '',
        columnWidth: 50,
      },
      description: {
        type: 'textarea',
        label: 'Description',
        placeholder: 'Description',
        defaultValue: '',
        columnWidth: 50,
      },
    },
  },
  tab_test: {
    type: 'tab',
    placement: 'top',
    position: 'main',
    columnWidth: 100,
    panels: [
      {
        label: 'Tab 1',
        subFields: {
          tab_title: {
            type: 'text',
            label: 'Title',
            required: true,
            placeholder: 'Title',
            defaultValue: '',
            columnWidth: 50,
          },
          tab_description: {
            type: 'textarea',
            label: 'Description',
            placeholder: 'Description',
            defaultValue: '',
            columnWidth: 50,
          },
        },
      },
      {
        label: 'Tab 2',
        subFields: {
          tab_title_2: {
            type: 'text',
            label: 'Title 2',
            required: true,
            placeholder: 'Title',
            defaultValue: '',
            columnWidth: 50,
          },
          tab_description_2: {
            type: 'textarea',
            label: 'Description 2',
            placeholder: 'Description',
            defaultValue: '',
            columnWidth: 50,
          },
        },
      },
    ],
  },
  accordion_test: {
    type: 'accordion',
    position: 'main',
    columnWidth: 100,
    open: 0,
    multiExpand: false,
    panels: [
      {
        label: 'Panel 1',
        subFields: {
          accordion_title: {
            type: 'text',
            label: 'Title',
            required: true,
            placeholder: 'Title',
            defaultValue: '',
            columnWidth: 50,
          },
          accordion_description: {
            type: 'textarea',
            label: 'Description',
            placeholder: 'Description',
            defaultValue: '',
            columnWidth: 50,
          },
        },
      },
      {
        label: 'Panel 2',
        subFields: {
          accordion_title_2: {
            type: 'text',
            label: 'Title 2',
            required: true,
            placeholder: 'Title',
            defaultValue: '',
            columnWidth: 50,
          },
          accordion_description_2: {
            type: 'textarea',
            label: 'Description 2',
            placeholder: 'Description',
            defaultValue: '',
            columnWidth: 50,
          },
        },
      },
    ],
  },
  repeater_test: {
    type: 'repeater',
    label: 'Repeater',
    instructions: 'Repeater instructions',
    position: 'main',
    collapsed: 'title',
    min: 2,
    max: 5,
    buttonLabel: 'Add item',
    columnWidth: 100,
    subFields: {
      title: {
        type: 'text',
        label: 'Title',
        required: true,
        placeholder: 'Title',
        defaultValue: '',
        columnWidth: 50,
      },
      description: {
        type: 'textarea',
        label: 'Description',
        placeholder: 'Description',
        defaultValue: '',
        columnWidth: 50,
      },
      nested: {
        type: 'repeater',
        label: 'Sub Repeater',
        instructions: 'Nested repeater',
        collapsed: 'title',
        buttonLabel: 'Add nested item',
        columnWidth: 100,
        subFields: {
          title: {
            type: 'text',
            label: 'Title',
            required: true,
            placeholder: 'Title',
            defaultValue: '',
          },
          description: {
            type: 'textarea',
            label: 'Description',
            placeholder: 'Description',
            defaultValue: '',
            columnWidth: 100,
          },
        },
      },
    },
  },
  file_test: {
    type: 'file',
    label: 'File',
    instructions: 'File instructions',
    required: true,
    position: 'main',
    returnFormat: 'array',
    library: 'all',
    maxSize: 10,
    columnWidth: 50,
  },
  image_test: {
    type: 'image',
    label: 'Image',
    instructions: 'Image instructions',
    required: true,
    position: 'main',
    returnFormat: 'array',
    library: 'all',
    cropType: true,
    columnWidth: 50,
  },
  image_icon_test: {
    type: 'image',
    label: 'Image (icon)',
    instructions: 'Add Image is an icon button when iconMode is true.',
    position: 'main',
    returnFormat: 'array',
    library: 'all',
    iconMode: true,
    columnWidth: 50,
  },
  gallery_test: {
    type: 'gallery',
    label: 'Gallery',
    instructions: 'Gallery instructions тАФ drag to reorder, multi-select in media library',
    required: true,
    position: 'main',
    returnFormat: 'array',
    library: 'all',
    insert: 'append',
    previewSize: 'thumbnail',
    min: 1,
    max: 8,
    columnWidth: 100,
  },
  open_street_map_test: {
    type: 'open_street_map',
    label: 'OpenStreetMap',
    instructions: 'Double-click or search an address to place a marker. Zoom with ┬▒ only. Locate and Fit Bounds are on the map.',
    position: 'main',
    height: 360,
    centerLat: '55.751244',
    centerLng: '37.618423',
    zoom: 10,
    columnWidth: 100,
  },
  open_street_map_multiple_test: {
    type: 'open_street_map',
    label: 'OpenStreetMap (multiple)',
    instructions: 'Multiple markers: each has its own Label. Fit Bounds shows all points.',
    position: 'main',
    height: 500,
    multiple: true,
    columnWidth: 100,
  },
  link_test: {
    type: 'link',
    label: 'Link',
    instructions: 'Link instructions',
    required: true,
    position: 'main',
    returnFormat: 'array',
    columnWidth: 50,
  },
  user_test: {
    type: 'user',
    label: 'User',
    instructions: 'Pick one or more accounts. Stored as user objects (no password).',
    required: true,
    position: 'main',
    role: 'all',
    allowNull: true,
    returnFormat: 'array',
    columnWidth: 50,
    multiple: true,
  },
  user_id_test: {
    type: 'user',
    label: 'User (id)',
    instructions: 'Single user, stored as a numeric id.',
    position: 'main',
    role: 'all',
    allowNull: true,
    returnFormat: 'id',
    columnWidth: 50,
  },
  separator_test_2: {
    type: 'separator',
    label: 'Test Fields',
    position: 'main',
    columnWidth: 100,
  },
  post_object_test: {
    type: 'post_object',
    label: 'Post Object',
    instructions: 'Pages and products, stored as objects.',
    position: 'main',
    postType: ['pages', 'products'],
    multiple: true,
    allowNull: true,
    returnFormat: 'object',
  },
  post_object_id_test: {
    type: 'post_object',
    label: 'Post Object (id)',
    instructions: 'Single page, stored as a numeric id.',
    position: 'main',
    postType: ['pages'],
    allowNull: true,
    returnFormat: 'id',
  },
  page_link_test: {
    type: 'page_link',
    label: 'Page Link',
    instructions: 'Public URLs, including collection archives.',
    position: 'main',
    postType: ['pages', 'products'],
    multiple: true,
    allowArchives: true,
    allowNull: true,
  },
  relationship_test: {
    type: 'relationship',
    label: 'Relationship',
    instructions: 'Pick and reorder entries. Thumbnails come from the page `thumbnail` field.',
    position: 'main',
    postType: ['pages', 'products'],
    dictionary: ['categories', 'services'],
    filters: ['search', 'post_type', 'dictionary'],
    elements: ['thumbnail'],
    max: 4,
    returnFormat: 'object',
  },
  dictionary_test: {
    type: 'dictionary',
    label: 'Dictionary',
    instructions: 'Categories as checkboxes, stored as term objects.',
    position: 'main',
    dictionary: 'categories',
    fieldType: 'checkbox',
    returnFormat: 'object',
  },
  dictionary_select_test: {
    type: 'dictionary',
    label: 'Dictionary (select)',
    instructions: 'Services as a select. New terms can be added when you have create access.',
    position: 'main',
    dictionary: 'services',
    fieldType: 'select',
    allowNull: true,
    addTerm: true,
    returnFormat: 'object',
  },
  flexible_content_test: {
    type: 'flexible_content',
    label: 'Flexible Content',
    instructions: 'Flexible Content instructions',
    position: 'main',
    max: 5,
    buttonLabel: 'Add layout',
    columnWidth: 100,
    layouts: {
      hero: {
        label: 'Hero',
        max: 2,
        preview: 'https://picsum.photos/800/600',
        subFields: {
          title: {
            type: 'text',
            label: 'Title',
            required: true,
            placeholder: 'Welcome',
            defaultValue: 'Welcome',
            columnWidth: 50,
          },
          description: {
            type: 'textarea',
            label: 'Description',
            placeholder: 'Lorem ipsumтАж',
            defaultValue: 'Lorem ipsumтАж',
            columnWidth: 50,
          },
        },
      },
      faq: {
        label: 'FAQ',
        subFields: {
          heading: {
            type: 'text',
            label: 'Heading',
            required: true,
            placeholder: 'About us',
            defaultValue: 'About us',
            columnWidth: 100,
          },
        },
      },
      card: {
        label: 'Card',
        subFields: {
          heading: {
            type: 'text',
            label: 'Heading',
            required: true,
            placeholder: 'About us',
            defaultValue: 'About us',
            columnWidth: 100,
          },
        },
      },
    },
  },
  text_sidebar: {
    type: 'text',
    label: 'Sidebar text',
    instructions: 'Rendered in the sidebar',
    position: 'sidebar',
    placeholder: 'Sidebar',
    defaultValue: 'Aside',
  },
  separator_form: {
    type: 'separator',
    label: 'Form',
    position: 'main',
    columnWidth: 100,
  },
  form_test: {
    type: 'form',
    label: 'Form',
    instructions: 'Single form, stored as an id. Empty value is null.',
    position: 'main',
    multiple: false,
    allowNull: true,
    columnWidth: 50,
  },
  form_multiple_test: {
    type: 'form',
    label: 'Forms',
    instructions: 'Multiple forms, stored as ids. Empty value is an array.',
    position: 'main',
    multiple: true,
    allowNull: true,
    columnWidth: 50,
  },
}

const values = reactive<Record<string, unknown>>(buildFormValues(fields))
provideMiraiCmsFieldValues(values)

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
    <div :class="[`${rootClass}__buttons`]">
      <div :class="[`${rootClass}__buttons-title`]">
        UiButton
      </div>

      <div :class="[`${rootClass}__buttons-grid`]">
        <span :class="[`${rootClass}__buttons-label`]">Default</span>
        <MiraiCmsUiButton
          tag="button"
          variant="small"
        >
          Save
        </MiraiCmsUiButton>
        <MiraiCmsUiButton tag="button">
          Save
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Secondary</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['secondary', 'small']"
        >
          Preview
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          variant="secondary"
        >
          Preview
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Tertiary</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['tertiary', 'small']"
        >
          Cancel
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          variant="tertiary"
        >
          Cancel
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Red</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['red', 'small']"
        >
          Remove
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          variant="red"
        >
          Remove
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Active</span>
        <MiraiCmsUiButton
          tag="button"
          variant="small"
          active
        >
          Save
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          active
        >
          Save
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Active secondary</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['secondary', 'small']"
          active
        >
          Preview
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          variant="secondary"
          active
        >
          Preview
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Active tertiary</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['tertiary', 'small']"
          active
        >
          Cancel
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          variant="tertiary"
          active
        >
          Cancel
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Active red</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['red', 'small']"
          active
        >
          Remove
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          variant="red"
          active
        >
          Remove
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">With icon</span>
        <MiraiCmsUiButton
          tag="button"
          variant="small"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Add
        </MiraiCmsUiButton>
        <MiraiCmsUiButton tag="button">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Add
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Secondary icon</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['secondary', 'small']"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle
              cx="12"
              cy="12"
              r="3"
            />
          </svg>
          Preview
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          variant="secondary"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle
              cx="12"
              cy="12"
              r="3"
            />
          </svg>
          Preview
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Red icon</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['red', 'small']"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
          Remove
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          variant="red"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
          Remove
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Icon only</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['tertiary', 'small', 'icon']"
          aria-label="Edit"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          :variant="['tertiary', 'icon']"
          aria-label="Edit"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Active icon</span>
        <MiraiCmsUiButton
          tag="button"
          :variant="['tertiary', 'small', 'icon']"
          aria-label="Edit"
          active
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          :variant="['tertiary', 'icon']"
          aria-label="Edit"
          active
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Disabled</span>
        <MiraiCmsUiButton
          tag="button"
          variant="small"
          disabled
        >
          Save
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          tag="button"
          disabled
        >
          Save
        </MiraiCmsUiButton>

        <span :class="[`${rootClass}__buttons-label`]">Link</span>
        <MiraiCmsUiButton
          variant="small"
          :link="{ url: 'https://example.com', title: 'Example', target: '_blank' }"
        >
          Example
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          :link="{ url: 'https://example.com', title: 'Example', target: '_blank' }"
        >
          Example
        </MiraiCmsUiButton>
      </div>
    </div>

    <div :class="[`${rootClass}__notices`]">
      <div :class="[`${rootClass}__notices-title`]">
        UiNotice
      </div>

      <div :class="[`${rootClass}__notices-label`]">
        Static, one line
      </div>
      <div :class="[`${rootClass}__notices-stack`]">
        <MiraiCmsUiNotice
          placement="static"
          variant="success"
          message="Changes saved."
        />
        <MiraiCmsUiNotice
          placement="static"
          variant="info"
          message="A new version of the CMS is available."
        />
        <MiraiCmsUiNotice
          placement="static"
          variant="warning"
          message="This account has no password set."
        />
        <MiraiCmsUiNotice
          placement="static"
          variant="danger"
          message="Could not save changes."
        />
      </div>

      <div :class="[`${rootClass}__notices-label`]">
        Static, two–three lines
      </div>
      <div :class="[`${rootClass}__notices-stack`]">
        <MiraiCmsUiNotice
          placement="static"
          variant="success"
        >
          <div>The user was updated.</div>
          <div>Email, display name and role are stored. You can keep editing this account without leaving the page.</div>
        </MiraiCmsUiNotice>
        <MiraiCmsUiNotice
          placement="static"
          variant="info"
        >
          <div>Media variants are generated in the background.</div>
          <div>Large uploads may take a minute. Refresh the library if a thumbnail is still missing.</div>
        </MiraiCmsUiNotice>
        <MiraiCmsUiNotice
          placement="static"
          variant="warning"
        >
          <div>You are editing your own account.</div>
          <div>Role and status cannot be changed here. Ask another administrator if those fields need an update.</div>
        </MiraiCmsUiNotice>
        <MiraiCmsUiNotice
          placement="static"
          variant="danger"
        >
          <div>The form could not be saved.</div>
          <div>A user with this email already exists. Change the address and try again, or open the existing account instead.</div>
        </MiraiCmsUiNotice>
      </div>
    </div>

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

    <div :class="[`${rootClass}__values`]">
      {{ values }}
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-admin-demo';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);
    height: 100%;
    overflow: auto;
    padding: math-rem(8);

    &__buttons {
      display: flex;
      flex-direction: column;
      gap: math-rem(12);
      padding: math-rem(16);
      background-color: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;

      &-title {
        margin: 0;
        font-size: math-rem(16);
        font-weight: 600;
        color: $color-ink;
      }

      &-grid {
        display: grid;
        grid-template-columns: math-rem(140) auto auto;
        align-items: center;
        justify-content: start;
        column-gap: math-rem(12);
        row-gap: math-rem(10);
      }

      &-label {
        font-size: math-rem(13);
        color: $color-muted;
      }
    }

    &__notices {
      &-title {
        margin: 0;
        font-size: math-rem(16);
        font-weight: 600;
        color: $color-ink;
      }

      &-label {
        font-size: math-rem(13);
        color: $color-muted;

        margin: math-rem(4) 0 0;
      }

      display: flex;
      flex-direction: column;
      gap: math-rem(12);
      padding: math-rem(16);
      background-color: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;

      &-stack {
        display: flex;
        flex-direction: column;
        gap: math-rem(8);
      }
    }

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
      flex-shrink: 0;
      margin: 0;
      padding: math-rem(12);
      overflow: auto;
      background-color: $color-bg;
      border: 1px solid $color-border;
      border-radius: $border-radius;
      color: $color-ink;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: math-rem(13);
      white-space: pre-wrap;
    }
  }
}
</style>
