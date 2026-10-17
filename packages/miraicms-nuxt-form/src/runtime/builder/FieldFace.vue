<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SelectChoice, SelectChoiceItem, SelectModelValue } from '@miraicms/core'
import type { FormField } from '../form/model'
import { applyInputMask, checkPositionStyle, defaultTextOptions, fileAccept, headingTag, iconUrl, isRichFieldType, isTemporalType, layoutFlexStyle, listedChoiceOptions, passwordRuleStates, ratingIconSrc, ratingSelectedIndex, RATING_FILTER_OFF, RATING_FILTER_ON, resolveChoiceEntries, temporalInputType } from '../form/text-options'

const props = withDefaults(defineProps<{
  field?: FormField
  preview?: boolean
  disabled?: boolean
  invalid?: boolean
  error?: string
  height?: number
}>(), {
  preview: false,
  disabled: false,
  invalid: false,
  error: '',
})

const options = computed(() => props.field?.text ?? defaultTextOptions(props.field?.label || ''))
const rich = computed(() => isRichFieldType(props.field?.type || ''))
const hoverRating = ref('')
const revealed = ref(false)
const ratingMessage = computed(() => {
  if (options.value.ratingHoverMessage && hoverRating.value) {
    return hoverRating.value
  }
  if (!options.value.ratingSelectedMessage) {
    return ''
  }
  return options.value.ratingOptions.find(item => item.value === draft.value)?.label || ''
})
const rules = computed(() => props.field?.type === 'password' ? passwordRuleStates(options.value, draft.value) : [])
const draft = ref(props.field?.value || '')

watch(() => props.field?.id, () => {
  draft.value = props.field?.value || options.value.defaultValue || ''
  revealed.value = false
}, { immediate: true })

watch(() => options.value.defaultValue, (value) => {
  if (props.preview) {
    draft.value = value
  }
})

const selectModel = ref<SelectModelValue>('')
const listId = computed(() => `mirai-suggest-${props.field?.id || 'field'}`)
const controlId = computed(() => `mirai-${props.field?.id || 'field'}`)
const selectChoices = computed((): SelectChoice[] => {
  const leaf = (item: { value: string, label: string, image: { url: string } | null, disabled: boolean, checked: boolean }): SelectChoiceItem => ({
    val: item.value,
    lbl: item.label,
    img: options.value.optionIcon ? iconUrl(item.image) || undefined : undefined,
    disabled: item.disabled,
    check: item.checked,
  })
  const choices: SelectChoice[] = []
  for (const entry of resolveChoiceEntries(options.value)) {
    if (entry.type === 'option') {
      choices.push(leaf(entry.option))
      continue
    }
    choices.push({
      type: 'group',
      title: entry.group.label,
      childs: entry.group.options.map(leaf),
    })
  }
  return choices
})

function syncSelectModel() {
  const checked = listedChoiceOptions(options.value).filter(item => item.checked).map(item => item.value)
  selectModel.value = options.value.selectMultiple.enabled ? checked : (checked[0] ?? '')
}

watch(() => [
  props.field?.id,
  options.value.selectMultiple.enabled,
  resolveChoiceEntries(options.value).map(entry => entry.type === 'option'
    ? `o:${entry.option.value}:${entry.option.checked}`
    : `g:${entry.group.id}:${entry.group.options.map(item => `${item.value}:${item.checked}`).join('|')}`).join(';'),
], syncSelectModel, { immediate: true })
const showError = computed(() => props.invalid && options.value.required.showError && !!props.error)

function controlType() {
  if (props.field?.type === 'email') {
    return 'email'
  }
  if (props.field?.type === 'number') {
    return 'number'
  }
  if (props.field?.type === 'url') {
    return 'url'
  }
  if (props.field?.type === 'color') {
    return 'color'
  }
  if (props.field?.type === 'range') {
    return 'range'
  }
  if (props.field?.type === 'password') {
    return revealed.value ? 'text' : 'password'
  }
  return 'text'
}
function chooseRating(index: number) {
  const list = options.value.ratingOptions
  if (ratingSelectedIndex(list, draft.value) === index) {
    draft.value = ''
    return
  }
  draft.value = list[index]?.value || ''
}

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
    :class="{
      'is-preview': preview,
      'is-hidden': options.hidden && preview,
      'is-inline': options.confirm.enabled && options.confirm.placement === 'inline',
    }"
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

    <div
      v-if="field.type === 'title'"
      :style="layoutFlexStyle(options.layoutDirection, options.layoutAlign)"
    >
      <component
        :is="headingTag(options.heading.tag)"
        v-if="options.heading.enabled"
      >
        <img
          v-if="iconUrl(options.heading.prefix)"
          class="miraicms-field-face__icon"
          :src="iconUrl(options.heading.prefix)"
          alt=""
        >
        <span>{{ options.heading.text }}</span>
        <img
          v-if="iconUrl(options.heading.suffix)"
          class="miraicms-field-face__icon"
          :src="iconUrl(options.heading.suffix)"
          alt=""
        >
      </component>
      <component
        :is="headingTag(options.subheading.tag)"
        v-if="options.subheading.enabled"
      >
        <img
          v-if="iconUrl(options.subheading.prefix)"
          class="miraicms-field-face__icon"
          :src="iconUrl(options.subheading.prefix)"
          alt=""
        >
        <span>{{ options.subheading.text }}</span>
        <img
          v-if="iconUrl(options.subheading.suffix)"
          class="miraicms-field-face__icon"
          :src="iconUrl(options.subheading.suffix)"
          alt=""
        >
      </component>
    </div>
    <template v-else-if="field.type === 'image'">
      <img
        v-if="iconUrl(options.elementImage)"
        :src="iconUrl(options.elementImage)"
        :alt="options.imageAlt"
        :style="{ width: options.imageWidth ? `${options.imageWidth}px` : undefined, height: options.imageHeight ? `${options.imageHeight}px` : undefined }"
      >
    </template>
    <div
      v-else-if="field.type === 'divider'"
      class="miraicms-field-face__divider"
    />
    <div
      v-else-if="field.type === 'spacer'"
      :style="{ height: `${height ?? options.spacerHeight ?? 40}px` }"
    />
    <div
      v-else-if="field.type === 'html'"
      v-html="field.html"
    />
    <div
      v-else
      class="miraicms-field-face__control"
      :data-align="field.type === 'button' && !options.fullWidth ? options.buttonAlign : undefined"
    >
      <img
        v-if="iconUrl(options.prefix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.prefix)"
        alt=""
      >
      <div
        v-if="field.type === 'rating'"
        class="miraicms-field-face__rating"
        :data-position="options.ratingPosition"
        @pointerdown.stop
      >
        <button
          v-for="(option, index) in options.ratingOptions"
          :key="option.id"
          type="button"
          class="miraicms-field-face__star"
          :class="{ 'is-on': ratingSelectedIndex(options.ratingOptions, draft) >= index }"
          @mouseenter="hoverRating = option.label"
          @mouseleave="hoverRating = ''"
          @click="chooseRating(index)"
        >
          <img
            class="miraicms-field-face__icon"
            :src="ratingIconSrc(option.icon, options.ratingIcon)"
            alt=""
            :style="{ filter: ratingSelectedIndex(options.ratingOptions, draft) >= index ? RATING_FILTER_ON : RATING_FILTER_OFF }"
          >
        </button>
        <span v-if="ratingMessage">{{ ratingMessage }}</span>
        <input
          type="hidden"
          :name="preview ? undefined : field.key"
          :value="draft"
        >
      </div>
      <button
        v-else-if="field.type === 'button'"
        class="miraicms-field-face__button"
        :type="preview ? 'button' : options.buttonType"
        :disabled="disabled || options.disabled"
        :style="{ width: options.fullWidth ? '100%' : undefined }"
      >
        <img
          v-if="iconUrl(options.buttonText.prefix)"
          class="miraicms-field-face__icon"
          :src="iconUrl(options.buttonText.prefix)"
          alt=""
        >
        <span>{{ options.buttonText.text }}</span>
        <img
          v-if="iconUrl(options.buttonText.suffix)"
          class="miraicms-field-face__icon"
          :src="iconUrl(options.buttonText.suffix)"
          alt=""
        >
      </button>
      <MiraiCmsUiSelect
        v-else-if="field.type === 'select'"
        :id="controlId"
        v-model="selectModel"
        :name="preview ? undefined : field.key"
        :choices="selectChoices"
        :placeholder="options.placeholder"
        :multiple="options.selectMultiple.enabled"
        :required="options.required.enabled"
        :disabled="disabled || options.disabled || options.readOnly"
        :min="options.selectMultiple.enabled ? (options.selectMultiple.minimum.value ?? 0) : 0"
        :max="options.selectMultiple.enabled ? (options.selectMultiple.maximum.value ?? undefined) : undefined"
        :search="options.showSearch"
        :search-clearable="options.searchClearable"
        :search-placeholder="options.searchPlaceholder"
        :selected-opt-clearable="options.selectedClearable"
        :selected-opt-image="options.optionIcon"
        :option-icon="options.optionIcon"
        :aria-label="options.label.text || field.label"
      />
      <div
        v-else-if="field.type === 'radio' || field.type === 'checkbox'"
        class="miraicms-field-face__choices"
        :style="{ display: 'grid', gridTemplateColumns: `repeat(${options.optionsColumn || 1}, minmax(0, 1fr))`, gap: '8px' }"
      >
        <label
          v-for="option in options.choiceOptions"
          :key="option.id"
        >
          <input
            :type="field.type"
            :name="preview ? undefined : field.key"
            :value="option.value"
            :checked="option.checked"
            :disabled="option.disabled || disabled || options.disabled"
            :required="field.type === 'checkbox' ? option.required : options.required.enabled"
          >
          <span>{{ option.label }}</span>
        </label>
      </div>
      <div
        v-else-if="field.type === 'image_select'"
        class="miraicms-field-face__images"
        :style="{ display: 'flex', flexWrap: 'wrap', gap: '8px' }"
      >
        <label
          v-for="option in options.choiceOptions"
          :key="option.id"
          :style="{ position: 'relative', width: `${options.itemSize || 200}px` }"
        >
          <input
            :type="options.allowMultiple ? 'checkbox' : 'radio'"
            :name="preview ? undefined : field.key"
            :value="option.value"
            :checked="option.checked"
            :disabled="option.disabled || disabled || options.disabled"
            :required="option.required"
            :style="checkPositionStyle(options.checkPosition)"
          >
          <img
            v-if="iconUrl(option.image)"
            :src="iconUrl(option.image)"
            alt=""
            :style="{ display: 'block', width: '100%' }"
          >
          <span v-if="!options.hideImageLabel">{{ option.label }}</span>
        </label>
      </div>
      <input
        v-else-if="field.type === 'file'"
        :id="controlId"
        class="miraicms-field-face__input"
        type="file"
        :name="preview ? undefined : field.key"
        :accept="fileAccept(options.fileType) || undefined"
        :multiple="options.fileMultiple.enabled || undefined"
        :required="options.required.enabled"
        :disabled="disabled || options.disabled"
      >
      <input
        v-else-if="isTemporalType(field.type)"
        :id="controlId"
        v-model="draft"
        class="miraicms-field-face__input"
        :type="temporalInputType(field.type)"
        :name="preview ? undefined : field.key"
        :required="options.required.enabled"
        :readonly="preview || options.readOnly"
        :disabled="disabled || options.disabled"
        :min="options.rangeMin || undefined"
        :max="options.rangeMax || undefined"
      >
      <textarea
        v-else-if="field.type === 'textarea'"
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
        :type="controlType()"
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
        :min="field?.type === 'number' || field?.type === 'range' ? options.valueMin ?? undefined : undefined"
        :max="field?.type === 'number' || field?.type === 'range' ? options.valueMax ?? undefined : undefined"
        :step="field?.type === 'range' ? options.step ?? undefined : undefined"
        :list="options.suggestions.length ? listId : undefined"
        @input="onInput"
      >
      <span v-if="field?.type === 'range'">{{ draft }}</span>
      <button
        v-if="field?.type === 'password' && options.showPassword"
        type="button"
        class="miraicms-field-face__reveal"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        @click="revealed = !revealed"
      >
        {{ revealed ? 'Hide' : 'Show' }}
      </button>
      <img
        v-if="iconUrl(options.suffix) && field.type !== 'file'"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.suffix)"
        alt=""
      >
      <span v-if="field.type === 'file'">{{ options.uploadButtonText }}</span>
      <span v-if="field.type === 'file'">{{ options.fileSelectStatus }}</span>
      <span v-if="field.type === 'file' && options.showMaximumSize">{{ options.showMaximumSize }}</span>
      <img
        v-if="field.type === 'file' && iconUrl(options.suffix)"
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
      v-if="(options.helper.enabled && options.helper.text) || rules.length"
      class="miraicms-field-face__note"
    >
      <img
        v-if="options.helper.enabled && iconUrl(options.helper.prefix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.helper.prefix)"
        alt=""
      >
      <span v-if="options.helper.enabled && options.helper.text">{{ options.helper.text }}</span>
      <img
        v-if="options.helper.enabled && iconUrl(options.helper.suffix)"
        class="miraicms-field-face__icon"
        :src="iconUrl(options.helper.suffix)"
        alt=""
      >
      <span
        v-for="(rule, index) in rules"
        :key="index"
        class="miraicms-field-face__rule"
        :style="{ color: rule.ok ? 'green' : 'red', marginRight: '20px' }"
      >{{ rule.ok ? '✔' : '✖' }} {{ rule.label }}</span>
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
    <div
      v-if="options.confirm.enabled"
      class="miraicms-field-face__confirm"
    >
      <div
        v-if="options.confirm.label.enabled"
        class="miraicms-field-face__label"
      >
        {{ options.confirm.label.text }}
      </div>
      <input
        class="miraicms-field-face__input"
        :type="field?.type === 'password' && !revealed ? 'password' : field?.type === 'email' ? 'email' : 'text'"
        :placeholder="options.confirm.placeholder || undefined"
        :readonly="preview"
      >
      <div
        v-if="options.confirm.helper.enabled && options.confirm.helper.text"
        class="miraicms-field-face__note"
      >
        {{ options.confirm.helper.text }}
      </div>
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
@use "miraicms-nuxt/styles" as *;

.miraicms-field-face {
  display: flex;
  flex-direction: column;
  gap: math-rem(6);
  min-width: 0;
  width: 100%;

  &__divider {
    width: 100%;
    border-top: 1px solid currentColor;
  }

  &.is-hidden {
    opacity: 0.45;
  }

  &.is-inline {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: math-rem(8);
  }

  &.is-inline > :not(.miraicms-field-face__confirm) {
    grid-column: 1;
  }

  &.is-inline > .miraicms-field-face__confirm {
    grid-column: 2;
    grid-row: 1 / span 8;
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

  &__control[data-align='center'] {
    justify-content: center;
  }

  &__control[data-align='right'] {
    justify-content: flex-end;
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

  &__rating {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: math-rem(4);
    pointer-events: auto;

    &[data-position='center'] {
      justify-content: center;
    }

    &[data-position='right'] {
      justify-content: flex-end;
    }
  }

  &__star {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: math-rem(28);
    height: math-rem(28);
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;

    img {
      width: math-rem(20);
      height: math-rem(20);
    }
  }

  &__reveal {
    pointer-events: auto;
    flex: 0 0 auto;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-bg;
    color: $color-ink;
    font: inherit;
    font-size: math-rem(12);
    cursor: pointer;
  }

  &__button {
    display: inline-flex;
    align-items: center;
    gap: math-rem(6);
    align-self: center;
    padding: math-rem(8) math-rem(14);
    border: 1px solid $color-accent;
    border-radius: $border-radius;
    background: $color-accent;
    color: $color-surface;
    font: inherit;
  }
}
</style>
