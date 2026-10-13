<script setup lang="ts">
import { computed } from 'vue'
import type { FormField, LayoutItem } from '../../form/model'
import { GRID_COLUMNS } from '../../form/model'
import type { FormMarkedText, FormTextOptions } from '../../form/text-options'
import { AUTOCOMPLETE_CHOICES, INPUT_MODE_CHOICES, PATTERN_PRESETS, defaultTextOptions, fieldHasOption, normalizeIcon } from '../../form/text-options'
import DecoratedText from './DecoratedText.vue'
import OptionAccordion from './OptionAccordion.vue'
import SuggestionRepeater from './SuggestionRepeater.vue'

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
  emit('update', {
    ...props.field,
    text,
    label: text.label.text,
    placeholder: text.placeholder,
    required: text.required.enabled,
    help: text.helper.enabled ? text.helper.text : '',
    value: text.defaultValue,
    min: props.field.type === 'number' ? (text.valueMin == null ? '' : String(text.valueMin)) : props.field.min,
    max: props.field.type === 'number' ? (text.valueMax == null ? '' : String(text.valueMax)) : props.field.max,
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
      v-if="has(5) && field.type !== 'textarea'"
      :model-value="options.defaultValue"
      :field-key="`${field.id}-default`"
      :field="{ type: 'text', label: 'Default value', maxLength: 20000 }"
      @update:model-value="patch({ defaultValue: String($event ?? '') })"
    />

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

  &__icon-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    :deep(.miraicms-field) {
      width: 100%;
      min-width: 0;
    }
  }
}
</style>
