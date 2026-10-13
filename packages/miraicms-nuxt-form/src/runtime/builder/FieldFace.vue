<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FormField } from '../form/model'
import { applyInputMask, defaultTextOptions, iconUrl } from '../form/text-options'

const props = withDefaults(defineProps<{
  field?: FormField
  preview?: boolean
  disabled?: boolean
  invalid?: boolean
  error?: string
}>(), {
  preview: false,
  disabled: false,
  invalid: false,
  error: '',
})

const options = computed(() => props.field?.text ?? defaultTextOptions(props.field?.label || ''))
const rich = computed(() => props.field?.type === 'text' || props.field?.type === 'textarea')
const draft = ref(props.field?.value || '')

watch(() => props.field?.id, () => {
  draft.value = props.field?.value || options.value.defaultValue || ''
}, { immediate: true })

watch(() => options.value.defaultValue, (value) => {
  if (props.preview) {
    draft.value = value
  }
})

const listId = computed(() => `mirai-suggest-${props.field?.id || 'field'}`)
const controlId = computed(() => `mirai-${props.field?.id || 'field'}`)
const showError = computed(() => props.invalid && options.value.required.showError && !!props.error)

function onInput(event: Event) {
  const el = event.target
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    return
  }
  const next = applyInputMask(el.value, options.value.mask)
  draft.value = next
  if (el.value !== next) {
    el.value = next
  }
}
</script>

<template>
  <div
    v-if="field && rich"
    class="miraicms-field-face"
    :class="{ 'is-preview': preview, 'is-hidden': options.hidden && preview }"
    :hidden="options.hidden && !preview ? true : undefined"
    :data-invalid="invalid ? 'true' : undefined"
  >
    <div
      v-if="options.label.enabled"
      class="miraicms-field-face__label-row"
    >
      <img
        v-if="iconUrl(options.label.prefix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.label.prefix)"
        alt=""
      >
      <span
        v-if="options.required.enabled && options.required.showAsterisk && options.required.asteriskPosition === 'left'"
        class="miraicms-field-face__asterisk"
      >*</span>
      <label
        class="miraicms-field-face__label"
        :for="controlId"
      >
        <span
          v-if="options.required.enabled && options.required.showAsterisk && options.required.asteriskPosition === 'before'"
          class="miraicms-field-face__asterisk"
        >*</span>
        <span>{{ options.label.text }}</span>
        <span
          v-if="options.required.enabled && options.required.showAsterisk && options.required.asteriskPosition === 'after'"
          class="miraicms-field-face__asterisk"
        >*</span>
      </label>
      <img
        v-if="iconUrl(options.label.suffix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.label.suffix)"
        alt=""
      >
      <span
        v-if="options.required.enabled && options.required.showAsterisk && options.required.asteriskPosition === 'right'"
        class="miraicms-field-face__asterisk"
      >*</span>
    </div>

    <div
      v-if="options.subtitle.enabled && options.subtitle.text"
      class="miraicms-field-face__note"
    >
      <img
        v-if="iconUrl(options.subtitle.prefix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.subtitle.prefix)"
        alt=""
      >
      <span>{{ options.subtitle.text }}</span>
      <img
        v-if="iconUrl(options.subtitle.suffix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.subtitle.suffix)"
        alt=""
      >
    </div>

    <div class="miraicms-field-face__control">
      <img
        v-if="iconUrl(options.prefix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.prefix)"
        alt=""
      >
      <textarea
        v-if="field.type === 'textarea'"
        :id="controlId"
        v-model="draft"
        class="miraicms-field-face__input"
        :name="preview ? undefined : field?.key"
        :rows="field?.rows || 4"
        :placeholder="options.placeholder || undefined"
        :required="options.required.enabled"
        :readonly="preview || options.readOnly"
        :disabled="disabled || options.disabled"
        :maxlength="options.maxLength ?? undefined"
        :minlength="options.minLength ?? undefined"
        :autocomplete="options.autocomplete || undefined"
        :inputmode="options.inputMode || undefined"
        :list="options.suggestions.length ? listId : undefined"
        @input="onInput"
      />
      <input
        v-else
        :id="controlId"
        v-model="draft"
        class="miraicms-field-face__input"
        type="text"
        :name="preview ? undefined : field?.key"
        :placeholder="options.placeholder || undefined"
        :required="options.required.enabled"
        :readonly="preview || options.readOnly"
        :disabled="disabled || options.disabled"
        :maxlength="options.maxLength ?? undefined"
        :minlength="options.minLength ?? undefined"
        :autocomplete="options.autocomplete || undefined"
        :inputmode="options.inputMode || undefined"
        :pattern="options.pattern || undefined"
        :list="options.suggestions.length ? listId : undefined"
        @input="onInput"
      >
      <img
        v-if="iconUrl(options.suffix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.suffix)"
        alt=""
      >
      <datalist
        v-if="options.suggestions.length"
        :id="listId"
      >
        <option
          v-for="item in options.suggestions"
          :key="item.id"
          :value="item.value"
          :label="item.label || undefined"
        />
      </datalist>
    </div>

    <div
      v-if="options.helper.enabled && options.helper.text"
      class="miraicms-field-face__note"
    >
      <img
        v-if="iconUrl(options.helper.prefix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.helper.prefix)"
        alt=""
      >
      <span>{{ options.helper.text }}</span>
      <img
        v-if="iconUrl(options.helper.suffix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.helper.suffix)"
        alt=""
      >
    </div>

    <div
      v-if="showError"
      class="miraicms-field-face__error"
    >
      <img
        v-if="iconUrl(options.required.errorPrefix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.required.errorPrefix)"
        alt=""
      >
      <span>{{ error }}</span>
      <img
        v-if="iconUrl(options.required.errorSuffix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.required.errorSuffix)"
        alt=""
      >
    </div>
  </div>

  <div
    v-else-if="field"
    class="miraicms-field-face is-preview"
  >
    <div
      v-if="field.type !== 'hidden' && field.type !== 'html' && field.type !== 'button'"
      class="miraicms-field-face__label"
    >
      {{ field.label }}
    </div>
    <select
      v-if="field.type === 'select'"
      class="miraicms-field-face__input"
    >
      <option>{{ field.placeholder || field.label }}</option>
    </select>
    <div
      v-else-if="field.type === 'radio' || field.type === 'checkbox'"
      class="miraicms-field-face__choices"
    >
      <label
        v-for="option in field.options"
        :key="option.value"
      >
        <input
          :type="field.type"
        >
        <span>{{ option.label }}</span>
      </label>
    </div>
    <input
      v-else-if="field.type === 'file'"
      class="miraicms-field-face__input"
      type="file"
    >
    <input
      v-else-if="field.type === 'email' || field.type === 'phone' || field.type === 'number' || field.type === 'date'"
      class="miraicms-field-face__input"
      :type="field.type === 'phone' ? 'tel' : field.type"
      :placeholder="field.placeholder || undefined"
      :value="field.value"
    >
    <span
      v-else-if="field.type === 'hidden'"
      class="miraicms-field-face__note"
    >Hidden</span>
    <div
      v-else-if="field.type === 'html'"
      v-html="field.html"
    />
    <button
      v-else-if="field.type === 'button'"
      type="button"
      class="miraicms-field-face__button"
    >
      {{ field.buttonLabel || 'Submit' }}
    </button>
    <div
      v-if="field.help && field.type !== 'hidden' && field.type !== 'html' && field.type !== 'button'"
      class="miraicms-field-face__note"
    >
      {{ field.help }}
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../assets/styles" as *;

.miraicms-field-face {
  display: flex;
  flex-direction: column;
  gap: math-rem(6);
  min-width: 0;
  width: 100%;

  &.is-preview {
    pointer-events: none;
  }

  &.is-hidden {
    opacity: 0.45;
  }

  &__label-row,
  &__note,
  &__control,
  &__error {
    display: flex;
    align-items: center;
    gap: math-rem(6);
    min-width: 0;
  }

  &__label {
    min-width: 0;
    font-size: math-rem(13);
    font-weight: 600;
  }

  &__asterisk {
    color: $color-danger;
  }

  &__input {
    flex: 1;
    min-width: 0;
    width: 100%;
    padding: math-rem(8) math-rem(10);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    color: $color-ink;
    font: inherit;
    font-size: math-rem(13);
  }

  &__icon {
    flex: 0 0 auto;
    width: math-rem(16);
    height: math-rem(16);
    object-fit: contain;
  }

  &__note,
  &__error {
    font-size: math-rem(12);
    color: $color-muted;
  }

  &__error {
    color: $color-danger;
  }

  &__choices {
    display: flex;
    flex-direction: column;
    gap: math-rem(4);
    font-size: math-rem(13);
  }

  &__button {
    align-self: flex-start;
    padding: math-rem(8) math-rem(14);
    border: 1px solid $color-accent;
    border-radius: $border-radius;
    background: $color-accent;
    color: $color-surface;
    font: inherit;
  }
}
</style>
