<script setup lang="ts">
import { computed } from 'vue'
import type { FormField, LayoutItem } from '../../form/model'
import { GRID_COLUMNS } from '../../form/model'
import type { FormMarkedText, FormTextOptions } from '../../form/text-options'
import { AUTOCOMPLETE_CHOICES, FILE_TYPE_ACCEPT, INPUT_MODE_CHOICES, PATTERN_PRESETS, defaultTextOptions, fieldHasOption, fileAccept, isTemporalType, normalizeIcon, temporalInputType } from '../../form/text-options'
import DecoratedText from './DecoratedText.vue'
import OptionAccordion from './OptionAccordion.vue'
import SuggestionRepeater from './SuggestionRepeater.vue'
import RatingOptions from './RatingOptions.vue'

const props = defineProps<{
  field: FormField
  item: LayoutItem
}>()

const emit = defineEmits<{
  update: [field: FormField]
  layout: [item: LayoutItem]
}>()

const options = computed(() => props.field.text ?? defaultTextOptions(props.field.label))

function has(id: number) {
  return fieldHasOption(props.field.type, id)
}

const patternPreset = computed(() => {
  return PATTERN_PRESETS.find(preset => preset.expression === options.value.pattern)?.id ?? ''
})

function commit(text: FormTextOptions) {
  const temporal = isTemporalType(props.field.type)
  emit('update', {
    ...props.field,
    text,
    label: text.label.text,
    placeholder: text.placeholder,
    required: text.required.enabled,
    help: text.helper.enabled ? text.helper.text : '',
    value: text.defaultValue,
    min: temporal ? text.rangeMin : props.field.type === 'number' || props.field.type === 'range' ? (text.valueMin == null ? '' : String(text.valueMin)) : props.field.min,
    max: temporal ? text.rangeMax : props.field.type === 'number' || props.field.type === 'range' ? (text.valueMax == null ? '' : String(text.valueMax)) : props.field.max,
    step: text.step == null ? '' : String(text.step),
    buttonLabel: props.field.type === 'button' ? text.buttonText.text : props.field.buttonLabel,
    accept: props.field.type === 'file' ? (fileAccept(text.fileType) || props.field.accept) : props.field.accept,
  })
}

function patch(partial: Partial<FormTextOptions>) {
  commit({ ...options.value, ...partial })
}

function patchMarked(key: 'label' | 'subtitle' | 'helper', value: FormMarkedText) {
  patch({ [key]: value })
}

function setCount(key: 'minLength' | 'maxLength' | 'minWords' | 'maxWords', value: number | null) {
  patch({ [key]: value == null || !Number.isFinite(value) ? null : Math.max(0, Math.floor(value)) })
}

function setPatternPreset(value: unknown) {
  const id = String(value ?? '')
  const preset = PATTERN_PRESETS.find(item => item.id === id)
  patch({ pattern: preset?.expression ?? options.value.pattern })
}

function setAxis(raw: number | null) {
  if (raw == null || !Number.isFinite(raw)) {
    return
  }
  emit('layout', { ...props.item, x: raw })
}

function setWidth(raw: number | null) {
  if (raw == null || !Number.isFinite(raw)) {
    return
  }
  emit('layout', { ...props.item, w: raw })
}
</script>

<template>
  <div class="miraicms-text-settings">
    <OptionAccordion
      v-if="has(1)"
      title="Label"
      :enabled="options.label.enabled"
      @update:enabled="patchMarked('label', { ...options.label, enabled: $event })"
    >
      <DecoratedText
        :field-key="`${field.id}-label`"
        :model="options.label"
        @update="patchMarked('label', $event)"
      />
    </OptionAccordion>

    <OptionAccordion
      v-if="has(2)"
      title="Required"
      :enabled="options.required.enabled"
      @update:enabled="patch({ required: { ...options.required, enabled: $event } })"
    >
      <MiraiCmsTrueFalseField
        :model-value="options.required.showError"
        :field-key="`${field.id}-show-error`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ required: { ...options.required, showError: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.required.customError"
        :field-key="`${field.id}-custom-error`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ required: { ...options.required, customError: $event === true } })"
      />
      <DecoratedText
        v-if="options.required.customError"
        :field-key="`${field.id}-error`"
        :model="{ enabled: true, text: options.required.errorText, prefix: options.required.errorPrefix, suffix: options.required.errorSuffix }"
        text-label="Error message"
        @update="patch({ required: { ...options.required, errorText: $event.text, errorPrefix: $event.prefix, errorSuffix: $event.suffix } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.required.showAsterisk"
        :field-key="`${field.id}-asterisk`"
        :field="{ type: 'true_false', label: 'Show Asterisk Symbol' }"
        @update:model-value="patch({ required: { ...options.required, showAsterisk: $event === true } })"
      />
      <MiraiCmsSelectField
        v-if="options.required.showAsterisk"
        :model-value="options.required.asteriskPosition"
        :field-key="`${field.id}-asterisk-position`"
        :field="{
          type: 'select',
          label: 'Asterisk Position',
          returnFormat: 'value',
          choices: [
            { val: 'left', lbl: 'Left' },
            { val: 'before', lbl: 'Before' },
            { val: 'after', lbl: 'After' },
            { val: 'right', lbl: 'Right' },
          ],
        }"
        @update:model-value="patch({ required: { ...options.required, asteriskPosition: $event === 'left' || $event === 'before' || $event === 'right' ? $event : 'after' } })"
      />
    </OptionAccordion>

    <OptionAccordion
      v-if="has(3)"
      title="Subtitle"
      :enabled="options.subtitle.enabled"
      @update:enabled="patchMarked('subtitle', { ...options.subtitle, enabled: $event })"
    >
      <DecoratedText
        :field-key="`${field.id}-subtitle`"
        :model="options.subtitle"
        @update="patchMarked('subtitle', $event)"
      />
    </OptionAccordion>

    <OptionAccordion
      v-if="has(35)"
      title="Allow Multiple"
      :enabled="options.fileMultiple.enabled"
      @update:enabled="patch({ fileMultiple: { ...options.fileMultiple, enabled: $event } })"
    >
      <MiraiCmsNumberField
        :model-value="options.fileMultiple.minimum.value"
        :field-key="`${field.id}-file-min`"
        :field="{ type: 'number', label: 'Minimum File', min: 0, step: 1 }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, minimum: { ...options.fileMultiple.minimum, value: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) } } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.fileMultiple.minimum.showError"
        :field-key="`${field.id}-file-min-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, minimum: { ...options.fileMultiple.minimum, showError: $event === true } } })"
      />
      <MiraiCmsTrueFalseField
        v-if="options.fileMultiple.minimum.showError"
        :model-value="options.fileMultiple.minimum.customError"
        :field-key="`${field.id}-file-min-custom`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, minimum: { ...options.fileMultiple.minimum, customError: $event === true } } })"
      />
      <MiraiCmsTextField
        v-if="options.fileMultiple.minimum.showError && options.fileMultiple.minimum.customError"
        :model-value="options.fileMultiple.minimum.errorText"
        :field-key="`${field.id}-file-min-text`"
        :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, minimum: { ...options.fileMultiple.minimum, errorText: String($event ?? '') } } })"
      />
      <MiraiCmsNumberField
        :model-value="options.fileMultiple.maximum.value"
        :field-key="`${field.id}-file-max`"
        :field="{ type: 'number', label: 'Maximum File', min: 0, step: 1 }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, maximum: { ...options.fileMultiple.maximum, value: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) } } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.fileMultiple.maximum.showError"
        :field-key="`${field.id}-file-max-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, maximum: { ...options.fileMultiple.maximum, showError: $event === true } } })"
      />
      <MiraiCmsTrueFalseField
        v-if="options.fileMultiple.maximum.showError"
        :model-value="options.fileMultiple.maximum.customError"
        :field-key="`${field.id}-file-max-custom`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, maximum: { ...options.fileMultiple.maximum, customError: $event === true } } })"
      />
      <MiraiCmsTextField
        v-if="options.fileMultiple.maximum.showError && options.fileMultiple.maximum.customError"
        :model-value="options.fileMultiple.maximum.errorText"
        :field-key="`${field.id}-file-max-text`"
        :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, maximum: { ...options.fileMultiple.maximum, errorText: String($event ?? '') } } })"
      />
    </OptionAccordion>

    <MiraiCmsSelectField
      v-if="has(36)"
      :model-value="options.fileType"
      :field-key="`${field.id}-file-type`"
      :field="{
        type: 'select',
        label: 'Allowed File Type',
        returnFormat: 'value',
        choices: Object.entries(FILE_TYPE_ACCEPT).map(([val, item]) => ({ val, lbl: item.label })),
      }"
      @update:model-value="patch({ fileType: typeof $event === 'string' ? $event as FormTextOptions['fileType'] : '' })"
    />

    <MiraiCmsTextField
      v-if="has(37)"
      :model-value="options.uploadButtonText"
      :field-key="`${field.id}-upload-text`"
      :field="{ type: 'text', label: 'Upload Button Text', maxLength: 80 }"
      @update:model-value="patch({ uploadButtonText: String($event ?? '') })"
    />

    <MiraiCmsTextField
      v-if="has(4)"
      :model-value="options.placeholder"
      :field-key="`${field.id}-placeholder`"
      :field="{ type: 'text', label: 'Placeholder', maxLength: 200 }"
      @update:model-value="patch({ placeholder: String($event ?? '') })"
    />

    <MiraiCmsTextareaField
      v-if="has(5) && field.type === 'textarea'"
      :model-value="options.defaultValue"
      :field-key="`${field.id}-default`"
      :field="{ type: 'textarea', label: 'Default value', rows: 4 }"
      @update:model-value="patch({ defaultValue: String($event ?? '') })"
    />
    <MiraiCmsTextField
      v-if="has(5) && field.type !== 'textarea' && !isTemporalType(field.type)"
      :model-value="options.defaultValue"
      :field-key="`${field.id}-default`"
      :field="{ type: 'text', label: 'Default value', maxLength: 20000 }"
      @update:model-value="patch({ defaultValue: String($event ?? '') })"
    />
    <div
      v-if="has(5) && isTemporalType(field.type)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Default value</span>
      <input
        class="miraicms-text-settings__native"
        :type="temporalInputType(field.type)"
        :value="options.defaultValue"
        @input="patch({ defaultValue: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <div
      v-if="has(6)"
      class="miraicms-text-settings__icons"
    >
      <span class="miraicms-text-settings__heading">Input Icons</span>
      <div class="miraicms-text-settings__icon-row">
        <MiraiCmsImageField
          :model-value="options.prefix"
          :field-key="`${field.id}-input-prefix`"
          :field="{ type: 'image', label: 'Prefix Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="patch({ prefix: normalizeIcon($event) })"
        />
        <MiraiCmsImageField
          :model-value="options.suffix"
          :field-key="`${field.id}-input-suffix`"
          :field="{ type: 'image', label: 'Suffix Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="patch({ suffix: normalizeIcon($event) })"
        />
      </div>
    </div>

    <OptionAccordion
      v-if="has(7)"
      title="Helper Text"
      :enabled="options.helper.enabled"
      @update:enabled="patchMarked('helper', { ...options.helper, enabled: $event })"
    >
      <DecoratedText
        :field-key="`${field.id}-helper`"
        :model="options.helper"
        @update="patchMarked('helper', $event)"
      />
    </OptionAccordion>

    <MiraiCmsTextField
      v-if="has(38)"
      :model-value="options.fileSelectStatus"
      :field-key="`${field.id}-file-status`"
      :field="{ type: 'text', label: 'File Select Status', instructions: 'By enabling this feature, you will see file select status.', maxLength: 120 }"
      @update:model-value="patch({ fileSelectStatus: String($event ?? '') })"
    />

    <MiraiCmsTextField
      v-if="has(39)"
      :model-value="options.showMaximumSize"
      :field-key="`${field.id}-file-size-label`"
      :field="{ type: 'text', label: 'Show Maximum Size', placeholder: 'Write a Max Size Label Ex:(Max 2MB)', instructions: 'By disabling this option, the field show maximum size will be hidden.', maxLength: 120 }"
      @update:model-value="patch({ showMaximumSize: String($event ?? '') })"
    />

    <OptionAccordion
      v-if="has(40)"
      title="Allow Maximum Upload Size"
      :enabled="options.maxUpload.enabled"
      @update:enabled="patch({ maxUpload: { ...options.maxUpload, enabled: $event } })"
    >
      <MiraiCmsNumberField
        :model-value="options.maxUpload.size"
        :field-key="`${field.id}-upload-size`"
        :field="{ type: 'number', label: 'Size (MB)', min: 20, step: 1 }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, size: $event == null || !Number.isFinite($event) ? null : Math.max(20, $event) } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.maxUpload.total"
        :field-key="`${field.id}-upload-total`"
        :field="{ type: 'true_false', label: 'Total Maximum Size' }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, total: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.maxUpload.showError"
        :field-key="`${field.id}-upload-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, showError: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        v-if="options.maxUpload.showError"
        :model-value="options.maxUpload.customError"
        :field-key="`${field.id}-upload-custom`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, customError: $event === true } })"
      />
      <MiraiCmsTextField
        v-if="options.maxUpload.showError && options.maxUpload.customError"
        :model-value="options.maxUpload.errorText"
        :field-key="`${field.id}-upload-error`"
        :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, errorText: String($event ?? '') } })"
      />
    </OptionAccordion>

    <div
      v-if="has(41)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Show File List</span>
      <MiraiCmsTrueFalseField
        :model-value="options.showFilePreview"
        :field-key="`${field.id}-file-preview`"
        :field="{ type: 'true_false', label: 'Show File Preview' }"
        @update:model-value="patch({ showFilePreview: $event === true })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.showFileSize"
        :field-key="`${field.id}-file-show-size`"
        :field="{ type: 'true_false', label: 'Show File Size' }"
        @update:model-value="patch({ showFileSize: $event === true })"
      />
    </div>

    <MiraiCmsTextField
      v-if="has(42)"
      :model-value="options.fileExistMessage"
      :field-key="`${field.id}-file-exists`"
      :field="{ type: 'text', label: 'File Exist Message', maxLength: 200 }"
      @update:model-value="patch({ fileExistMessage: String($event ?? '') })"
    />

    <div
      v-if="has(43)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Value Range (Min/Max)</span>
      <div class="miraicms-text-settings__grid">
        <div class="miraicms-text-settings__native-field">
          <span>Minimum</span>
          <input
            class="miraicms-text-settings__native"
            :type="temporalInputType(field.type)"
            :value="options.rangeMin"
            @input="patch({ rangeMin: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div class="miraicms-text-settings__native-field">
          <span>Maximum</span>
          <input
            class="miraicms-text-settings__native"
            :type="temporalInputType(field.type)"
            :value="options.rangeMax"
            @input="patch({ rangeMax: ($event.target as HTMLInputElement).value })"
          >
        </div>
      </div>
    </div>

    <OptionAccordion
      v-if="has(24)"
      title="Validations"
      plain
    >
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.digit"
        :field-key="`${field.id}-rule-digit`"
        :field="{ type: 'true_false', label: 'At least one digit (0-9)' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, digit: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.lowercase"
        :field-key="`${field.id}-rule-lower`"
        :field="{ type: 'true_false', label: 'At least one lowercase character (a-z)' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, lowercase: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.uppercase"
        :field-key="`${field.id}-rule-upper`"
        :field="{ type: 'true_false', label: 'At least one uppercase character (A-Z)' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, uppercase: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.special"
        :field-key="`${field.id}-rule-special`"
        :field="{ type: 'true_false', label: 'At least one special character (~!@#$%^&*(){}[]<>+-_=/|;:,.)' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, special: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.limitLength"
        :field-key="`${field.id}-rule-length`"
        :field="{ type: 'true_false', label: 'Limit Password Length' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, limitLength: $event === true } })"
      />
      <div
        v-if="options.passwordRules.limitLength"
        class="miraicms-text-settings__grid"
      >
        <MiraiCmsNumberField
          :model-value="options.passwordRules.min"
          :field-key="`${field.id}-pass-min`"
          :field="{ type: 'number', label: 'Min', min: 0, step: 1 }"
          @update:model-value="patch({ passwordRules: { ...options.passwordRules, min: $event == null ? 8 : Math.max(0, Math.floor($event)) } })"
        />
        <MiraiCmsNumberField
          :model-value="options.passwordRules.max"
          :field-key="`${field.id}-pass-max`"
          :field="{ type: 'number', label: 'Max', min: 0, step: 1 }"
          @update:model-value="patch({ passwordRules: { ...options.passwordRules, max: $event == null ? 32 : Math.max(0, Math.floor($event)) } })"
        />
      </div>
    </OptionAccordion>

    <div
      v-if="has(8)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Min/Max Text Length</span>
      <div class="miraicms-text-settings__grid">
        <MiraiCmsNumberField
          :model-value="options.minLength"
          :field-key="`${field.id}-min-length`"
          :field="{ type: 'number', label: 'Min Length', min: 0, step: 1 }"
          @update:model-value="setCount('minLength', $event)"
        />
        <MiraiCmsNumberField
          :model-value="options.maxLength"
          :field-key="`${field.id}-max-length`"
          :field="{ type: 'number', label: 'Max Length', min: 0, step: 1 }"
          @update:model-value="setCount('maxLength', $event)"
        />
        <MiraiCmsNumberField
          :model-value="options.minWords"
          :field-key="`${field.id}-min-words`"
          :field="{ type: 'number', label: 'Min Word', min: 0, step: 1 }"
          @update:model-value="setCount('minWords', $event)"
        />
        <MiraiCmsNumberField
          :model-value="options.maxWords"
          :field-key="`${field.id}-max-words`"
          :field="{ type: 'number', label: 'Max Word', min: 0, step: 1 }"
          @update:model-value="setCount('maxWords', $event)"
        />
      </div>
    </div>

    <div
      v-if="has(9)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Suggestion</span>
      <SuggestionRepeater
        :field-key="`${field.id}-suggestions`"
        :model="options.suggestions"
        @update="patch({ suggestions: $event })"
      />
    </div>

    <MiraiCmsSelectField
      v-if="has(10)"
      :model-value="options.autocomplete"
      :field-key="`${field.id}-autocomplete`"
      :field="{ type: 'select', label: 'Auto Complete', returnFormat: 'value', choices: AUTOCOMPLETE_CHOICES }"
      @update:model-value="patch({ autocomplete: String($event ?? 'off') })"
    />

    <MiraiCmsSelectField
      v-if="has(11)"
      :model-value="options.inputMode"
      :field-key="`${field.id}-input-mode`"
      :field="{ type: 'select', label: 'Input mode', returnFormat: 'value', choices: INPUT_MODE_CHOICES }"
      @update:model-value="patch({ inputMode: $event === 'none' || $event === 'decimal' || $event === 'numeric' || $event === 'tel' || $event === 'search' || $event === 'email' || $event === 'url' ? $event : 'text' })"
    />

    <MiraiCmsTextField
      v-if="has(12)"
      :model-value="options.mask"
      :field-key="`${field.id}-mask`"
      :field="{ type: 'text', label: 'Input Mask', placeholder: '(999) 999-9999', maxLength: 200 }"
      @update:model-value="patch({ mask: String($event ?? '') })"
    />

    <div
      v-if="has(13)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">RegEx Pattern</span>
      <MiraiCmsSelectField
        :model-value="patternPreset"
        :field-key="`${field.id}-pattern-preset`"
        :field="{
          type: 'select',
          label: 'Preset',
          returnFormat: 'value',
          choices: [
            { val: '', lbl: 'Custom' },
            ...PATTERN_PRESETS.map(preset => ({ val: preset.id, lbl: preset.label })),
          ],
        }"
        @update:model-value="setPatternPreset"
      />
      <MiraiCmsTextField
        :model-value="options.pattern"
        :field-key="`${field.id}-pattern`"
        :field="{ type: 'text', label: 'Expression', maxLength: 500 }"
        @update:model-value="patch({ pattern: String($event ?? '') })"
      />
      <MiraiCmsTextField
        :model-value="options.patternFlags"
        :field-key="`${field.id}-flags`"
        :field="{ type: 'text', label: 'Flags', placeholder: 'i', maxLength: 12 }"
        @update:model-value="patch({ patternFlags: String($event ?? '').replace(/[^gimsuy]/g, '') })"
      />
    </div>

    <MiraiCmsTrueFalseField
      v-if="has(14)"
      :model-value="options.readOnly"
      :field-key="`${field.id}-readonly`"
      :field="{ type: 'true_false', label: 'Read-only' }"
      @update:model-value="patch({ readOnly: $event === true })"
    />

    <MiraiCmsTrueFalseField
      v-if="has(15)"
      :model-value="options.hidden"
      :field-key="`${field.id}-hidden`"
      :field="{ type: 'true_false', label: 'Hidden' }"
      @update:model-value="patch({ hidden: $event === true })"
    />

    <div
      v-if="has(16)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Size & Position</span>
      <div class="miraicms-text-settings__grid">
        <MiraiCmsNumberField
          :model-value="item.x"
          :field-key="`${field.id}-x`"
          :field="{ type: 'number', label: 'X', min: 0, max: GRID_COLUMNS - 1, step: 1 }"
          @update:model-value="setAxis"
        />
        <MiraiCmsNumberField
          :model-value="item.w"
          :field-key="`${field.id}-w`"
          :field="{ type: 'number', label: 'W', min: 1, max: GRID_COLUMNS, step: 1 }"
          @update:model-value="setWidth"
        />
      </div>
    </div>

    <MiraiCmsTrueFalseField
      v-if="has(17)"
      :model-value="options.disabled"
      :field-key="`${field.id}-disabled`"
      :field="{ type: 'true_false', label: 'Disabled' }"
      @update:model-value="patch({ disabled: $event === true })"
    />

    <MiraiCmsTextField
      v-if="has(18)"
      :model-value="field.key"
      :field-key="`${field.id}-name`"
      :field="{
        type: 'text',
        label: 'Name Attribute',
        instructions: 'Name is the unique identifier for the field. It is used to reference the field in the form submission data.',
        maxLength: 64,
      }"
      @update:model-value="emit('update', { ...field, key: String($event ?? '') })"
    />

    <OptionAccordion
      v-if="has(19) || has(23)"
      :title="has(23) ? 'Enable confirm password field' : 'Enable confirm email field'"
      :enabled="options.confirm.enabled"
      @update:enabled="patch({ confirm: { ...options.confirm, enabled: $event } })"
    >
      <OptionAccordion
        title="Label"
        :enabled="options.confirm.label.enabled"
        @update:enabled="patch({ confirm: { ...options.confirm, label: { ...options.confirm.label, enabled: $event } } })"
      >
        <DecoratedText
          :field-key="`${field.id}-confirm-label`"
          :model="options.confirm.label"
          @update="patch({ confirm: { ...options.confirm, label: $event } })"
        />
      </OptionAccordion>
      <MiraiCmsTextField
        :model-value="options.confirm.placeholder"
        :field-key="`${field.id}-confirm-placeholder`"
        :field="{ type: 'text', label: 'Placeholder', maxLength: 200 }"
        @update:model-value="patch({ confirm: { ...options.confirm, placeholder: String($event ?? '') } })"
      />
      <OptionAccordion
        title="Helper Text"
        :enabled="options.confirm.helper.enabled"
        @update:enabled="patch({ confirm: { ...options.confirm, helper: { ...options.confirm.helper, enabled: $event } } })"
      >
        <DecoratedText
          :field-key="`${field.id}-confirm-helper`"
          :model="options.confirm.helper"
          @update="patch({ confirm: { ...options.confirm, helper: $event } })"
        />
      </OptionAccordion>
      <MiraiCmsSelectField
        :model-value="options.confirm.placement"
        :field-key="`${field.id}-confirm-placement`"
        :field="{
          type: 'select',
          label: 'Fields placement',
          returnFormat: 'value',
          choices: [
            { val: 'below', lbl: 'Below' },
            { val: 'inline', lbl: 'Inline' },
          ],
        }"
        @update:model-value="patch({ confirm: { ...options.confirm, placement: $event === 'inline' ? 'inline' : 'below' } })"
      />
    </OptionAccordion>

    <OptionAccordion
      v-if="has(20)"
      title="Invalid Error Message"
      :enabled="options.invalid.enabled"
      @update:enabled="patch({ invalid: { ...options.invalid, enabled: $event } })"
    >
      <MiraiCmsTrueFalseField
        :model-value="options.invalid.showError"
        :field-key="`${field.id}-invalid-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ invalid: { ...options.invalid, showError: $event === true } })"
      />
      <template v-if="options.invalid.showError">
        <MiraiCmsTrueFalseField
          :model-value="options.invalid.customError"
          :field-key="`${field.id}-invalid-custom`"
          :field="{ type: 'true_false', label: 'Custom Error Message' }"
          @update:model-value="patch({ invalid: { ...options.invalid, customError: $event === true } })"
        />
        <DecoratedText
          v-if="options.invalid.customError"
          :field-key="`${field.id}-invalid-text`"
          :model="{ enabled: true, text: options.invalid.errorText, prefix: options.invalid.errorPrefix, suffix: options.invalid.errorSuffix }"
          text-label="Error message"
          @update="patch({ invalid: { ...options.invalid, errorText: $event.text, errorPrefix: $event.prefix, errorSuffix: $event.suffix } })"
        />
      </template>
    </OptionAccordion>

    <div
      v-if="has(21)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Value Range (Min/Max)</span>
      <div class="miraicms-text-settings__grid">
        <MiraiCmsNumberField
          :model-value="options.valueMin"
          :field-key="`${field.id}-value-min`"
          :field="{ type: 'number', label: 'Minimum', step: 1 }"
          @update:model-value="patch({ valueMin: $event == null || !Number.isFinite($event) ? null : $event })"
        />
        <MiraiCmsNumberField
          :model-value="options.valueMax"
          :field-key="`${field.id}-value-max`"
          :field="{ type: 'number', label: 'Maximum', step: 1 }"
          @update:model-value="patch({ valueMax: $event == null || !Number.isFinite($event) ? null : $event })"
        />
      </div>
    </div>

    <MiraiCmsTrueFalseField
      v-if="has(22)"
      :model-value="options.showPassword"
      :field-key="`${field.id}-show-password`"
      :field="{ type: 'true_false', label: 'Include show/hide password icon', instructions: 'This allows to show the password icon. You can toggle this option to show or hide the password icon.' }"
      @update:model-value="patch({ showPassword: $event === true })"
    />

    <MiraiCmsNumberField
      v-if="has(25)"
      :model-value="options.step"
      :field-key="`${field.id}-step`"
      :field="{ type: 'number', label: 'Step', step: 1 }"
      @update:model-value="patch({ step: $event == null || !Number.isFinite($event) ? null : $event })"
    />

    <div
      v-if="has(26)"
      class="miraicms-text-settings__group"
    >
      <MiraiCmsImageField
        :model-value="options.ratingIcon"
        :field-key="`${field.id}-rating-icon`"
        :field="{ type: 'image', label: 'Rating Icon', iconMode: true, returnFormat: 'array' }"
        @update:model-value="patch({ ratingIcon: normalizeIcon($event) })"
      />
    </div>

    <div
      v-if="has(27)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Options</span>
      <RatingOptions
        :field-key="`${field.id}-rating-options`"
        :model="options.ratingOptions"
        @update="patch({ ratingOptions: $event, defaultValue: $event.find(item => item.checked)?.value || options.defaultValue })"
      />
    </div>

    <MiraiCmsSelectField
      v-if="has(28)"
      :model-value="options.ratingPosition"
      :field-key="`${field.id}-rating-position`"
      :field="{
        type: 'select',
        label: 'Rating Position',
        returnFormat: 'value',
        choices: [
          { val: 'left', lbl: 'Left' },
          { val: 'center', lbl: 'Center' },
          { val: 'right', lbl: 'Right' },
        ],
      }"
      @update:model-value="patch({ ratingPosition: $event === 'center' || $event === 'right' ? $event : 'left' })"
    />

    <MiraiCmsTrueFalseField
      v-if="has(29)"
      :model-value="options.ratingHoverMessage"
      :field-key="`${field.id}-rating-hover`"
      :field="{ type: 'true_false', label: 'Show rating message on hover', instructions: 'This allows to show the rating message on hover. You can toggle this option to show or hide the rating message on hover.' }"
      @update:model-value="patch({ ratingHoverMessage: $event === true })"
    />

    <MiraiCmsTrueFalseField
      v-if="has(30)"
      :model-value="options.ratingSelectedMessage"
      :field-key="`${field.id}-rating-selected`"
      :field="{ type: 'true_false', label: 'Show Rating Message On Selected', instructions: 'This allows to show the rating message on rating selected. You can toggle this option to show or hide the rating message on rating selected.' }"
      @update:model-value="patch({ ratingSelectedMessage: $event === true })"
    />

    <div
      v-if="has(31)"
      class="miraicms-text-settings__group"
    >
      <span class="miraicms-text-settings__heading">Button Text</span>
      <DecoratedText
        :field-key="`${field.id}-button-text`"
        :model="options.buttonText"
        text-label="Text"
        @update="patch({ buttonText: { ...$event, enabled: true } })"
      />
    </div>

    <MiraiCmsSelectField
      v-if="has(32)"
      :model-value="options.buttonType"
      :field-key="`${field.id}-button-type`"
      :field="{
        type: 'select',
        label: 'Button Type',
        returnFormat: 'value',
        choices: [
          { val: 'submit', lbl: 'Submit' },
          { val: 'button', lbl: 'Button' },
          { val: 'reset', lbl: 'Reset' },
        ],
      }"
      @update:model-value="patch({ buttonType: $event === 'button' || $event === 'reset' ? $event : 'submit' })"
    />

    <MiraiCmsTrueFalseField
      v-if="has(33)"
      :model-value="options.fullWidth"
      :field-key="`${field.id}-full-width`"
      :field="{ type: 'true_false', label: 'Full Width' }"
      @update:model-value="patch({ fullWidth: $event === true })"
    />

    <MiraiCmsSelectField
      v-if="has(34) && !options.fullWidth"
      :model-value="options.buttonAlign"
      :field-key="`${field.id}-button-align`"
      :field="{
        type: 'select',
        label: 'Button Align',
        returnFormat: 'value',
        choices: [
          { val: 'left', lbl: 'Left' },
          { val: 'center', lbl: 'Center' },
          { val: 'right', lbl: 'Right' },
        ],
      }"
      @update:model-value="patch({ buttonAlign: $event === 'center' || $event === 'right' ? $event : 'left' })"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

.miraicms-text-settings {
  display: flex;
  flex-direction: column;
  gap: math-rem(12);

  &__group,
  &__icons {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
  }

  &__heading {
    font-size: math-rem(13);
    font-weight: 600;
  }

  &__grid,
  &__icon-row {
    display: grid;
    gap: math-rem(8);
  }

  &__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &__native-field {
    display: flex;
    flex-direction: column;
    gap: math-rem(4);
    font-size: math-rem(13);
  }

  &__native {
    width: 100%;
    min-height: math-rem(36);
    padding: math-rem(6) math-rem(8);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    color: $color-ink;
    font: inherit;
  }

  &__icon-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    :deep(.miraicms-field) {
      width: 100%;
      min-width: 0;
    }
  }
}
</style>
