<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SelectChoice, SelectChoiceItem, SelectModelValue } from '@katecms/core'
import { sanitizeHtml, type FormField } from '../form/model'
import { applyInputMask, checkPositionStyle, defaultTextOptions, fileAccept, headingTag, iconUrl, isRichFieldType, isTemporalType, layoutFlexStyle, listedChoiceOptions, passwordRuleStates, ratingIconSrc, ratingSelectedIndex, RATING_FILTER_OFF, RATING_FILTER_ON, resolveChoiceEntries, temporalInputType } from '../form/text-options'

const rootClass = 'katecms-field-face'

const props = withDefaults(defineProps<{
  field?: FormField
  preview?: boolean
  disabled?: boolean
  logicReadonly?: boolean
  invalid?: boolean
  error?: string
  height?: number
}>(), {
  preview: false,
  disabled: false,
  logicReadonly: false,
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
const choiceDraft = ref<string[]>([])
const decisionDraft = ref<boolean | null>(null)
const decisionLabel = computed(() => sanitizeHtml(options.value.decisionLabel))
const decisionIsChecked = computed(() => decisionDraft.value ?? options.value.decisionChecked)

watch(() => props.field?.id, () => {
  draft.value = props.field?.value || options.value.defaultValue || ''
  choiceDraft.value = listedChoiceOptions(options.value).filter(item => item.checked).map(item => item.value)
  decisionDraft.value = null
  revealed.value = false
}, { immediate: true })

watch(() => options.value.decisionChecked, () => {
  decisionDraft.value = null
})

function onChoiceChange(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) {
    return
  }
  if (input.type === 'radio') {
    choiceDraft.value = input.checked ? [input.value] : []
    return
  }
  const next = new Set(choiceDraft.value)
  if (input.checked) {
    next.add(input.value)
  }
  else {
    next.delete(input.value)
  }
  choiceDraft.value = [...next]
}

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
  if (props.field?.type === 'phone') {
    return 'tel'
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
    :class="[
      rootClass,
      {
        'is-preview': preview,
        'is-hidden': options.hidden && preview,
        'is-inline': options.confirm.enabled && options.confirm.placement === 'inline',
      }]"
    :hidden="options.hidden && !preview ? true : undefined"
    :data-invalid="invalid ? 'true' : undefined"
  >
    <div
      v-if="options.label.enabled"
      :class="`${rootClass}__label-row`"
    >
      <img
        v-if="iconUrl(options.label.prefix)"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.label.prefix)"
        alt=""
      >
      <span
        v-if="options.required.enabled && options.required.showAsterisk && options.required.asteriskPosition === 'left'"
        :class="`${rootClass}__asterisk`"
      >*</span>
      <label
        :class="`${rootClass}__label`"
        :for="controlId"
      >
        <span
          v-if="options.required.enabled && options.required.showAsterisk && options.required.asteriskPosition === 'before'"
          :class="`${rootClass}__asterisk`"
        >*</span>
        <span>{{ options.label.text }}</span>
        <span
          v-if="options.required.enabled && options.required.showAsterisk && options.required.asteriskPosition === 'after'"
          :class="`${rootClass}__asterisk`"
        >*</span>
      </label>
      <img
        v-if="iconUrl(options.label.suffix)"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.label.suffix)"
        alt=""
      >
      <span
        v-if="options.required.enabled && options.required.showAsterisk && options.required.asteriskPosition === 'right'"
        :class="`${rootClass}__asterisk`"
      >*</span>
    </div>

    <div
      v-if="options.subtitle.enabled && options.subtitle.text"
      :class="`${rootClass}__note`"
    >
      <img
        v-if="iconUrl(options.subtitle.prefix)"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.subtitle.prefix)"
        alt=""
      >
      <span>{{ options.subtitle.text }}</span>
      <img
        v-if="iconUrl(options.subtitle.suffix)"
        :class="`${rootClass}__icon`"
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
          :class="`${rootClass}__icon`"
          :src="iconUrl(options.heading.prefix)"
          alt=""
        >
        <span>{{ options.heading.text }}</span>
        <img
          v-if="iconUrl(options.heading.suffix)"
          :class="`${rootClass}__icon`"
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
          :class="`${rootClass}__icon`"
          :src="iconUrl(options.subheading.prefix)"
          alt=""
        >
        <span>{{ options.subheading.text }}</span>
        <img
          v-if="iconUrl(options.subheading.suffix)"
          :class="`${rootClass}__icon`"
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
      :class="`${rootClass}__divider`"
    />
    <div
      v-else-if="field.type === 'spacer'"
      :class="`${rootClass}__spacer`"
      :style="{ height: `${height ?? options.spacerHeight ?? 40}px` }"
    />
    <div
      v-else-if="field.type === 'html'"
      v-html="sanitizeHtml(field.html)"
    />
    <template v-else-if="field.type === 'repeater' || field.type === 'section'" />
    <div
      v-else
      :class="`${rootClass}__control`"
      :data-align="field.type === 'button' && !options.fullWidth ? options.buttonAlign : undefined"
    >
      <img
        v-if="iconUrl(options.prefix)"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.prefix)"
        alt=""
      >
      <div
        v-if="field.type === 'rating'"
        :class="`${rootClass}__rating`"
        :data-position="options.ratingPosition"
        @pointerdown.stop
      >
        <button
          v-for="(option, index) in options.ratingOptions"
          :key="option.id"
          type="button"
          :class="[
            `${rootClass}__star`,
            { 'is-on': ratingSelectedIndex(options.ratingOptions, draft) >= index },
          ]"
          @mouseenter="hoverRating = option.label"
          @mouseleave="hoverRating = ''"
          @click="chooseRating(index)"
        >
          <img
            :class="`${rootClass}__icon`"
            :src="ratingIconSrc(option.icon, options.ratingIcon)"
            alt=""
            :style="{ filter: ratingSelectedIndex(options.ratingOptions, draft) >= index ? RATING_FILTER_ON : RATING_FILTER_OFF }"
          >
        </button>
        <span v-if="ratingMessage">{{ ratingMessage }}</span>
        <input
          type="hidden"
          :name="field.key"
          :value="draft"
        >
      </div>
      <KateCmsUiButton
        v-else-if="field.type === 'button'"
        tag="button"
        :type="preview ? 'button' : options.buttonType"
        :disabled="disabled || options.disabled"
        :variant="options.fullWidth ? ['full'] : undefined"
        :aria-label="options.buttonText.text || 'Button'"
      >
        <img
          v-if="iconUrl(options.buttonText.prefix)"
          :class="`${rootClass}__icon`"
          :src="iconUrl(options.buttonText.prefix)"
          alt=""
        >
        <span>{{ options.buttonText.text }}</span>
        <img
          v-if="iconUrl(options.buttonText.suffix)"
          :class="`${rootClass}__icon`"
          :src="iconUrl(options.buttonText.suffix)"
          alt=""
        >
      </KateCmsUiButton>
      <KateCmsUiSelect
        v-else-if="field.type === 'select'"
        :id="controlId"
        v-model="selectModel"
        :name="field.key"
        :choices="selectChoices"
        :placeholder="options.placeholder"
        :multiple="options.selectMultiple.enabled"
        :required="options.required.enabled"
        :disabled="disabled || logicReadonly || options.disabled || options.readOnly"
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
      <label
        v-else-if="field.type === 'decision_box'"
        :class="`${rootClass}__decision`"
      >
        <input
          type="checkbox"
          :name="field.key"
          :value="options.decisionCheckedValue"
          :checked="decisionIsChecked"
          :disabled="disabled || logicReadonly || options.disabled"
          :required="options.required.enabled"
          @change="decisionDraft = ($event.target as HTMLInputElement).checked"
        >
        <span v-html="decisionLabel" />
      </label>
      <div
        v-else-if="field.type === 'radio' || field.type === 'checkbox'"
        :class="`${rootClass}__choices`"
        :style="{ display: 'grid', gridTemplateColumns: `repeat(${options.optionsColumn || 1}, minmax(0, 1fr))`, gap: '8px' }"
      >
        <label
          v-for="option in options.choiceOptions"
          :key="option.id"
        >
          <input
            :type="field.type"
            :name="field.key"
            :value="option.value"
            :checked="preview ? choiceDraft.includes(option.value) : option.checked"
            :disabled="option.disabled || disabled || options.disabled"
            :required="field.type === 'checkbox' ? option.required : options.required.enabled"
            @change="onChoiceChange"
          >
          <span>{{ option.label }}</span>
        </label>
      </div>
      <div
        v-else-if="field.type === 'image_select'"
        :class="`${rootClass}__images`"
        :style="{ display: 'flex', flexWrap: 'wrap', gap: '8px' }"
      >
        <label
          v-for="option in options.choiceOptions"
          :key="option.id"
          :style="{ position: 'relative', width: `${options.itemSize || 200}px` }"
        >
          <input
            :type="options.allowMultiple ? 'checkbox' : 'radio'"
            :name="field.key"
            :value="option.value"
            :checked="preview ? choiceDraft.includes(option.value) : option.checked"
            :disabled="option.disabled || disabled || options.disabled"
            :required="option.required"
            @change="onChoiceChange"
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
        :class="`${rootClass}__input`"
        type="file"
        :name="field.key"
        :accept="fileAccept(options.fileType) || undefined"
        :multiple="options.fileMultiple.enabled || undefined"
        :required="options.required.enabled"
        :disabled="disabled || options.disabled"
      >
      <input
        v-else-if="isTemporalType(field.type)"
        :id="controlId"
        v-model="draft"
        :class="`${rootClass}__input`"
        :type="temporalInputType(field.type)"
        :name="field.key"
        :required="options.required.enabled"
        :readonly="logicReadonly || options.readOnly"
        :disabled="disabled || options.disabled"
        :min="options.rangeMin || undefined"
        :max="options.rangeMax || undefined"
      >
      <textarea
        v-else-if="field.type === 'textarea'"
        :id="controlId"
        v-model="draft"
        :class="`${rootClass}__input`"
        :name="field?.key"
        :rows="field?.rows || 4"
        :placeholder="options.placeholder || undefined"
        :required="options.required.enabled"
        :readonly="logicReadonly || options.readOnly"
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
        :class="`${rootClass}__input`"
        :type="controlType()"
        :name="field?.key"
        :placeholder="options.placeholder || undefined"
        :required="options.required.enabled"
        :readonly="logicReadonly || options.readOnly"
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
        :class="`${rootClass}__reveal`"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        @click="revealed = !revealed"
      >
        {{ revealed ? 'Hide' : 'Show' }}
      </button>
      <img
        v-if="iconUrl(options.suffix) && field.type !== 'file'"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.suffix)"
        alt=""
      >
      <span v-if="field.type === 'file'">{{ options.uploadButtonText }}</span>
      <span v-if="field.type === 'file'">{{ options.fileSelectStatus }}</span>
      <span v-if="field.type === 'file' && options.showMaximumSize">{{ options.showMaximumSize }}</span>
      <img
        v-if="field.type === 'file' && iconUrl(options.suffix)"
        :class="`${rootClass}__icon`"
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
      :class="`${rootClass}__note`"
    >
      <img
        v-if="options.helper.enabled && iconUrl(options.helper.prefix)"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.helper.prefix)"
        alt=""
      >
      <span v-if="options.helper.enabled && options.helper.text">{{ options.helper.text }}</span>
      <img
        v-if="options.helper.enabled && iconUrl(options.helper.suffix)"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.helper.suffix)"
        alt=""
      >
      <span
        v-for="(rule, index) in rules"
        :key="index"
        :class="`${rootClass}__rule`"
        :style="{ color: rule.ok ? 'green' : 'red', marginRight: '20px' }"
      >{{ rule.ok ? '✔' : '✖' }} {{ rule.label }}</span>
    </div>

    <div
      v-if="showError"
      :class="`${rootClass}__error`"
    >
      <img
        v-if="iconUrl(options.required.errorPrefix)"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.required.errorPrefix)"
        alt=""
      >
      <span>{{ error }}</span>
      <img
        v-if="iconUrl(options.required.errorSuffix)"
        :class="`${rootClass}__icon`"
        :src="iconUrl(options.required.errorSuffix)"
        alt=""
      >
    </div>
    <div
      v-if="options.confirm.enabled"
      :class="`${rootClass}__confirm`"
    >
      <div
        v-if="options.confirm.label.enabled"
        :class="`${rootClass}__label`"
      >
        {{ options.confirm.label.text }}
      </div>
      <input
        :class="`${rootClass}__input`"
        :type="field?.type === 'password' && !revealed ? 'password' : field?.type === 'email' ? 'email' : 'text'"
        :placeholder="options.confirm.placeholder || undefined"
        :readonly="logicReadonly"
      >
      <div
        v-if="options.confirm.helper.enabled && options.confirm.helper.text"
        :class="`${rootClass}__note`"
      >
        {{ options.confirm.helper.text }}
      </div>
    </div>
  </div>

  <div
    v-else-if="field"
    :class="[rootClass, 'is-preview']"
  >
    <div
      v-if="field.type !== 'hidden' && field.type !== 'html' && field.type !== 'button'"
      :class="`${rootClass}__label`"
    >
      {{ field.label }}
    </div>
    <select
      v-if="field.type === 'select'"
      :class="`${rootClass}__input`"
    >
      <option>{{ field.placeholder || field.label }}</option>
    </select>
    <div
      v-else-if="field.type === 'radio' || field.type === 'checkbox'"
      :class="`${rootClass}__choices`"
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
      :class="`${rootClass}__input`"
      type="file"
    >
    <input
      v-else-if="field.type === 'email' || field.type === 'phone' || field.type === 'number' || field.type === 'date'"
      :class="`${rootClass}__input`"
      :type="field.type === 'phone' ? 'tel' : field.type"
      :placeholder="field.placeholder || undefined"
      :value="field.value"
    >
    <span
      v-else-if="field.type === 'hidden'"
      :class="`${rootClass}__note`"
    >Hidden</span>
    <div
      v-else-if="field.type === 'html'"
      v-html="sanitizeHtml(field.html)"
    />
    <KateCmsUiButton
      v-else-if="field.type === 'button'"
      tag="button"
      type="button"
      :aria-label="field.buttonLabel || 'Submit'"
    >
      {{ field.buttonLabel || 'Submit' }}
    </KateCmsUiButton>
    <div
      v-if="field.help && field.type !== 'hidden' && field.type !== 'html' && field.type !== 'button'"
      :class="`${rootClass}__note`"
    >
      {{ field.help }}
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "katecms/styles" as *;
$root: '.katecms-field-face';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(6);
  min-width: 0;
  width: 100%;

  &__divider {
    width: 100%;
    border-top: 1px solid currentColor;
  }

  &__spacer {
    background: repeating-linear-gradient(-45deg, #e5e5e5, #e5e5e5 15px, #fff 0, #fff 30px);
  }

  &.is-hidden {
    opacity: 0.45;
  }

  &.is-inline {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: math-rem(8);
  }
  &.is-inline {
    > :not(#{$root}__confirm) {
      grid-column: 1;
    }
  }
  &.is-inline {
    > #{$root}__confirm {
      grid-column: 2;
      grid-row: 1 / span 8;
    }
  }

  &__label {
    &-row {
      display: flex;
      align-items: center;
      gap: math-rem(6);
      min-width: 0;
    }

    min-width: 0;
    font-size: math-rem(13);
    font-weight: 600;
  }
  &__note {
    display: flex;
    align-items: center;
    gap: math-rem(6);
    min-width: 0;

  }

  &__control {
    display: flex;
    align-items: center;
    gap: math-rem(6);
    min-width: 0;

    &[data-align='center'] {
      justify-content: center;
    }

    &[data-align='right'] {
      justify-content: flex-end;
    }
  }
  &__error {
    display: flex;
    align-items: center;
    gap: math-rem(6);
    min-width: 0;

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

  &__decision {
    display: flex;
    align-items: flex-start;
    gap: math-rem(8);
    font-size: math-rem(13);

    input {
      margin-top: math-rem(3);
    }
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

}
</style>
