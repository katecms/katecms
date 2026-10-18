<script setup lang="ts">
import { computed } from 'vue'
import TextFieldSettings from './settings/TextFieldSettings.vue'
import type { FormField, LayoutItem } from '../form/model'
import { FIELD_LABELS, GRID_COLUMNS } from '../form/model'
import { isRichFieldType } from '../form/text-options'

const rootClass = 'miraicms-form-settings'


const props = defineProps<{
  field: FormField
  item: LayoutItem
  submitTaken?: boolean
}>()

const emit = defineEmits<{
  update: [field: FormField]
  layout: [item: LayoutItem]
}>()

const choice = computed(() => props.field.type === 'select' || props.field.type === 'radio' || props.field.type === 'checkbox')
const richText = computed(() => isRichFieldType(props.field.type))
const textLike = computed(() => props.field.type === 'phone')

function patch(partial: Partial<FormField>) {
  emit('update', { ...props.field, ...partial })
}

function patchLayout(partial: Partial<LayoutItem>) {
  emit('layout', { ...props.item, ...partial })
}

function setColumn(raw: number | null) {
  if (raw == null || !Number.isFinite(raw)) {
    return
  }
  patchLayout({ x: raw - 1 })
}

function setRow(raw: number | null) {
  if (raw == null || !Number.isFinite(raw)) {
    return
  }
  patchLayout({ y: raw - 1 })
}

function setWidth(raw: number | null) {
  if (raw == null || !Number.isFinite(raw)) {
    return
  }
  patchLayout({ w: raw })
}

function setRows(raw: number | null) {
  patch({ rows: raw == null || !Number.isFinite(raw) ? 4 : raw })
}

function updateOption(index: number, partial: Partial<FormField['options'][number]>) {
  patch({
    options: props.field.options.map((option, optionIndex) => optionIndex === index ? { ...option, ...partial } : option),
  })
}

function addOption() {
  const n = props.field.options.length + 1
  patch({
    options: [...props.field.options, { label: `Option ${n}`, value: `option_${n}` }],
  })
}

function removeOption(index: number) {
  patch({ options: props.field.options.filter((_, optionIndex) => optionIndex !== index) })
}
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__type`">
      {{ FIELD_LABELS[field.type] }}
    </div>

    <TextFieldSettings
      v-if="richText"
      :key="field.id"
      :field="field"
      :item="item"
      :submit-taken="submitTaken"
      :nested="!!field.parentId"
      @update="emit('update', $event)"
      @layout="emit('layout', $event)"
    />

    <template v-else>
      <MiraiCmsTextField
        :model-value="field.label"
        :field-key="`${field.id}-label`"
        :field="{ type: 'text', label: 'Label', maxLength: 200 }"
        @update:model-value="patch({ label: String($event ?? '') })"
      />

      <MiraiCmsTextField
        v-if="field.type !== 'button'"
        :model-value="field.key"
        :field-key="`${field.id}-key`"
        :field="{ type: 'text', label: 'Name', maxLength: 64 }"
        @update:model-value="patch({ key: String($event ?? '') })"
      />

      <MiraiCmsTextField
        v-if="textLike || field.type === 'select'"
        :model-value="field.placeholder"
        :field-key="`${field.id}-placeholder`"
        :field="{ type: 'text', label: field.type === 'select' ? 'Empty option' : 'Placeholder', maxLength: 200 }"
        @update:model-value="patch({ placeholder: String($event ?? '') })"
      />

      <MiraiCmsTrueFalseField
        v-if="field.type !== 'html' && field.type !== 'button' && field.type !== 'hidden'"
        :model-value="field.required"
        :field-key="`${field.id}-required`"
        :field="{ type: 'true_false', label: 'Required' }"
        @update:model-value="patch({ required: $event === true })"
      />

      <MiraiCmsTextField
        v-if="field.type !== 'hidden' && field.type !== 'html' && field.type !== 'button'"
        :model-value="field.help"
        :field-key="`${field.id}-help`"
        :field="{ type: 'text', label: 'Help text', maxLength: 400 }"
        @update:model-value="patch({ help: String($event ?? '') })"
      />

      <MiraiCmsNumberField
        v-if="field.type === 'textarea'"
        :model-value="field.rows"
        :field-key="`${field.id}-rows`"
        :field="{ type: 'number', label: 'Rows', min: 2, max: 20, step: 1 }"
        @update:model-value="setRows"
      />

      <div
        v-if="field.type === 'number'"
        :class="`${rootClass}__row`"
      >
        <MiraiCmsTextField
          :model-value="field.min"
          :field-key="`${field.id}-min`"
          :field="{ type: 'text', label: 'Min' }"
          @update:model-value="patch({ min: String($event ?? '') })"
        />
        <MiraiCmsTextField
          :model-value="field.max"
          :field-key="`${field.id}-max`"
          :field="{ type: 'text', label: 'Max' }"
          @update:model-value="patch({ max: String($event ?? '') })"
        />
        <MiraiCmsTextField
          :model-value="field.step"
          :field-key="`${field.id}-step`"
          :field="{ type: 'text', label: 'Step' }"
          @update:model-value="patch({ step: String($event ?? '') })"
        />
      </div>

      <MiraiCmsTextField
        v-if="field.type === 'file'"
        :model-value="field.accept"
        :field-key="`${field.id}-accept`"
        :field="{ type: 'text', label: 'Accepted types', placeholder: '.pdf,image/*', maxLength: 200 }"
        @update:model-value="patch({ accept: String($event ?? '') })"
      />

      <MiraiCmsTextField
        v-if="field.type === 'hidden'"
        :model-value="field.value"
        :field-key="`${field.id}-value`"
        :field="{ type: 'text', label: 'Value', maxLength: 2000 }"
        @update:model-value="patch({ value: String($event ?? '') })"
      />

      <MiraiCmsTextareaField
        v-if="field.type === 'html'"
        :model-value="field.html"
        :field-key="`${field.id}-html`"
        :field="{ type: 'textarea', label: 'HTML', rows: 8 }"
        @update:model-value="patch({ html: String($event ?? '') })"
      />

      <MiraiCmsTextField
        v-if="field.type === 'button'"
        :model-value="field.buttonLabel"
        :field-key="`${field.id}-button`"
        :field="{ type: 'text', label: 'Button text', maxLength: 80 }"
        @update:model-value="patch({ buttonLabel: String($event ?? '') })"
      />

      <div
        v-if="choice"
        :class="`${rootClass}__options`"
      >
        <span :class="`${rootClass}__options-label`">Options</span>
        <div
          v-for="(option, index) in field.options"
          :key="index"
          :class="`${rootClass}__option`"
        >
          <MiraiCmsTextField
            :model-value="option.label"
            :field-key="`${field.id}-option-label-${index}`"
            :field="{ type: 'text', label: 'Label' }"
            @update:model-value="updateOption(index, { label: String($event ?? '') })"
          />
          <MiraiCmsTextField
            :model-value="option.value"
            :field-key="`${field.id}-option-value-${index}`"
            :field="{ type: 'text', label: 'Value' }"
            @update:model-value="updateOption(index, { value: String($event ?? '') })"
          />
          <MiraiCmsUiButton
            tag="button"
            :variant="['red', 'small']"
            aria-label="Remove option"
            @click="removeOption(index)"
          >
            Remove
          </MiraiCmsUiButton>
        </div>
        <MiraiCmsUiButton
          tag="button"
          variant="secondary"
          @click="addOption"
        >
          Add option
        </MiraiCmsUiButton>
      </div>

      <div :class="`${rootClass}__row`">
        <MiraiCmsNumberField
          :model-value="item.x + 1"
          :field-key="`${field.id}-column`"
          :field="{ type: 'number', label: 'Column', min: 1, max: GRID_COLUMNS, step: 1 }"
          @update:model-value="setColumn"
        />
        <MiraiCmsNumberField
          :model-value="item.y + 1"
          :field-key="`${field.id}-row`"
          :field="{ type: 'number', label: 'Row', min: 1, max: 401, step: 1 }"
          @update:model-value="setRow"
        />
        <MiraiCmsNumberField
          :model-value="item.w"
          :field-key="`${field.id}-width`"
          :field="{ type: 'number', label: 'Width', min: 1, max: GRID_COLUMNS, step: 1 }"
          @update:model-value="setWidth"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;
$root: '.miraicms-form-settings';


#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(12);

  &__type {
    margin: 0;
    font-size: math-rem(12);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: $color-muted;
  }

  &__row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: math-rem(8);
  }

  &__options {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);

    &-label {
      font-size: math-rem(13);
      font-weight: 600;
    }
  }

  &__option {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: math-rem(8);
    align-items: end;
  }
}
</style>
