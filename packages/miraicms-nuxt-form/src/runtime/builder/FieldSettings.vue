<script setup lang="ts">
import { computed } from 'vue'
import type { FormField, LayoutItem } from '../form/model'
import { FIELD_LABELS, GRID_COLUMNS } from '../form/model'

const props = defineProps<{
  field: FormField
  item: LayoutItem
}>()

const emit = defineEmits<{
  update: [field: FormField]
  layout: [item: LayoutItem]
  remove: []
}>()

const choice = computed(() => props.field.type === 'select' || props.field.type === 'radio' || props.field.type === 'checkbox')
const textLike = computed(() => ['text', 'textarea', 'email', 'phone', 'number'].includes(props.field.type))

function patch(partial: Partial<FormField>) {
  emit('update', { ...props.field, ...partial })
}

function patchLayout(partial: Partial<LayoutItem>) {
  emit('layout', { ...props.item, ...partial })
}

function setColumn(raw: string) {
  const column = Number(raw)
  if (!Number.isFinite(column)) {
    return
  }
  patchLayout({ x: column - 1 })
}

function setRow(raw: string) {
  const row = Number(raw)
  if (!Number.isFinite(row)) {
    return
  }
  patchLayout({ y: row - 1 })
}

function setWidth(raw: string) {
  const width = Number(raw)
  if (!Number.isFinite(width)) {
    return
  }
  patchLayout({ w: width })
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
  <div class="miraicms-form-settings">
    <p class="miraicms-form-settings__type">
      {{ FIELD_LABELS[field.type] }}
    </p>

    <label class="miraicms-form-settings__field">
      <span>Label</span>
      <input
        :value="field.label"
        type="text"
        maxlength="200"
        @input="patch({ label: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label
      v-if="field.type !== 'button'"
      class="miraicms-form-settings__field"
    >
      <span>Name</span>
      <input
        :value="field.key"
        type="text"
        maxlength="64"
        spellcheck="false"
        @input="patch({ key: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label
      v-if="textLike"
      class="miraicms-form-settings__field"
    >
      <span>Placeholder</span>
      <input
        :value="field.placeholder"
        type="text"
        maxlength="200"
        @input="patch({ placeholder: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label
      v-if="field.type === 'select'"
      class="miraicms-form-settings__field"
    >
      <span>Empty option</span>
      <input
        :value="field.placeholder"
        type="text"
        maxlength="200"
        @input="patch({ placeholder: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label
      v-if="field.type !== 'html' && field.type !== 'button' && field.type !== 'hidden'"
      class="miraicms-form-settings__check"
    >
      <input
        :checked="field.required"
        type="checkbox"
        @change="patch({ required: ($event.target as HTMLInputElement).checked })"
      >
      <span>Required</span>
    </label>

    <label
      v-if="field.type !== 'hidden' && field.type !== 'html' && field.type !== 'button'"
      class="miraicms-form-settings__field"
    >
      <span>Help text</span>
      <input
        :value="field.help"
        type="text"
        maxlength="400"
        @input="patch({ help: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label
      v-if="field.type === 'textarea'"
      class="miraicms-form-settings__field"
    >
      <span>Rows</span>
      <input
        :value="field.rows"
        type="number"
        min="2"
        max="20"
        @input="patch({ rows: Number(($event.target as HTMLInputElement).value) })"
      >
    </label>

    <div
      v-if="field.type === 'number'"
      class="miraicms-form-settings__row"
    >
      <label class="miraicms-form-settings__field">
        <span>Min</span>
        <input
          :value="field.min"
          type="text"
          inputmode="decimal"
          @input="patch({ min: ($event.target as HTMLInputElement).value })"
        >
      </label>
      <label class="miraicms-form-settings__field">
        <span>Max</span>
        <input
          :value="field.max"
          type="text"
          inputmode="decimal"
          @input="patch({ max: ($event.target as HTMLInputElement).value })"
        >
      </label>
      <label class="miraicms-form-settings__field">
        <span>Step</span>
        <input
          :value="field.step"
          type="text"
          inputmode="decimal"
          @input="patch({ step: ($event.target as HTMLInputElement).value })"
        >
      </label>
    </div>

    <label
      v-if="field.type === 'file'"
      class="miraicms-form-settings__field"
    >
      <span>Accepted types</span>
      <input
        :value="field.accept"
        type="text"
        maxlength="200"
        placeholder=".pdf,image/*"
        @input="patch({ accept: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label
      v-if="field.type === 'hidden'"
      class="miraicms-form-settings__field"
    >
      <span>Value</span>
      <input
        :value="field.value"
        type="text"
        maxlength="2000"
        @input="patch({ value: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label
      v-if="field.type === 'html'"
      class="miraicms-form-settings__field"
    >
      <span>HTML</span>
      <textarea
        :value="field.html"
        rows="8"
        @input="patch({ html: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>

    <label
      v-if="field.type === 'button'"
      class="miraicms-form-settings__field"
    >
      <span>Button text</span>
      <input
        :value="field.buttonLabel"
        type="text"
        maxlength="80"
        @input="patch({ buttonLabel: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <div
      v-if="choice"
      class="miraicms-form-settings__options"
    >
      <span class="miraicms-form-settings__options-label">Options</span>
      <div
        v-for="(option, index) in field.options"
        :key="index"
        class="miraicms-form-settings__option"
      >
        <input
          :value="option.label"
          type="text"
          aria-label="Option label"
          placeholder="Label"
          @input="updateOption(index, { label: ($event.target as HTMLInputElement).value })"
        >
        <input
          :value="option.value"
          type="text"
          aria-label="Option value"
          placeholder="Value"
          spellcheck="false"
          @input="updateOption(index, { value: ($event.target as HTMLInputElement).value })"
        >
        <button
          type="button"
          aria-label="Remove option"
          @click="removeOption(index)"
        >
          ×
        </button>
      </div>
      <button
        type="button"
        class="miraicms-form-settings__add"
        @click="addOption"
      >
        Add option
      </button>
    </div>

    <div class="miraicms-form-settings__row">
      <label class="miraicms-form-settings__field">
        <span>Column</span>
        <input
          :value="item.x + 1"
          type="number"
          min="1"
          :max="GRID_COLUMNS"
          @change="setColumn(($event.target as HTMLInputElement).value)"
        >
      </label>
      <label class="miraicms-form-settings__field">
        <span>Row</span>
        <input
          :value="item.y + 1"
          type="number"
          min="1"
          max="401"
          @change="setRow(($event.target as HTMLInputElement).value)"
        >
      </label>
      <label class="miraicms-form-settings__field">
        <span>Width</span>
        <input
          :value="item.w"
          type="number"
          min="1"
          :max="GRID_COLUMNS"
          @change="setWidth(($event.target as HTMLInputElement).value)"
        >
      </label>
    </div>

    <button
      type="button"
      class="miraicms-form-settings__remove"
      @click="emit('remove')"
    >
      Remove field
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "../assets/admin" as *;

.miraicms-form-settings {
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

  &__field,
  &__check {
    display: flex;
    flex-direction: column;
    gap: math-rem(4);
    margin: 0;
    font-size: math-rem(13);
    color: $color-ink;

    span {
      font-weight: 600;
    }

    input,
    textarea {
      width: 100%;
      padding: math-rem(8) math-rem(10);
      border: 1px solid $color-border;
      border-radius: $border-radius;
      background: $color-surface;
      color: $color-ink;
      font: inherit;
    }
  }

  &__check {
    flex-direction: row;
    align-items: center;
    gap: math-rem(8);

    input {
      width: auto;
    }
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
  }

  &__options-label {
    font-size: math-rem(13);
    font-weight: 600;
  }

  &__option {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) math-rem(32);
    gap: math-rem(6);

    input,
    button {
      min-width: 0;
      padding: math-rem(8);
      border: 1px solid $color-border;
      border-radius: $border-radius;
      background: $color-surface;
      color: $color-ink;
      font: inherit;
    }
  }

  &__add,
  &__remove {
    align-self: flex-start;
    padding: math-rem(6) math-rem(10);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    color: $color-ink;
    font: inherit;
    cursor: pointer;
  }

  &__remove {
    color: $color-danger;
    border-color: $color-danger;
  }
}
</style>
