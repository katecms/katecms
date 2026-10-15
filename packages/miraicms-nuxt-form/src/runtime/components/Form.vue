<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import type { FormField, LayoutItem, PublicForm, UploadedFile } from '../form/model'
import { baseBreakpoint, formBreakpoints, submissionErrors } from '../form/model'
import { applyInputMask, defaultTextOptions, iconUrl, isRichFieldType, passwordRuleStates, ratingIconSrc, ratingSelectedIndex, RATING_FILTER_OFF, RATING_FILTER_ON } from '../form/text-options'
import { clientFormBreakpoints } from '../form/runtime-config'
import { stepIconSvg } from '../form/icons'

/**
 * Unstyled public form.
 * Each cell carries a 60-column layout. The base breakpoint (`desktop` by default)
 * uses data-x, data-y, and data-w. Other breakpoints use data-x-{name}, data-y-{name}, and data-w-{name}.
 * Columns and rows are 0-based. data-state is loading, missing, idle, submitting, success, invalid, or error.
 */
const props = defineProps<{
  form: string
}>()

clientFormBreakpoints()

const definition = ref<PublicForm | null>(null)
const state = ref<'loading' | 'missing' | 'idle' | 'submitting' | 'success' | 'invalid' | 'error'>('loading')
const fieldErrors = ref<Record<string, string>>({})
const alertMessage = ref('')
const drafts = ref<Record<string, string>>({})
const revealed = ref<Record<string, boolean>>({})
const hoverRating = ref<Record<string, string>>({})

const locked = computed(() => state.value === 'submitting' || state.value === 'success')

const cells = computed(() => {
  const content = definition.value?.content
  if (!content) {
    return []
  }
  const names = formBreakpoints()
  const base = baseBreakpoint()
  return content.fields
    .map((field) => {
      const layouts: Record<string, LayoutItem> = {}
      for (const name of names) {
        const item = findLayout(content.layouts[name], field.id)
        if (!item) {
          return null
        }
        layouts[name] = item
      }
      return { field, layouts }
    })
    .filter((cell): cell is { field: FormField, layouts: Record<string, LayoutItem> } => !!cell)
    .sort((a, b) => {
      const stepA = content.steps.findIndex(step => step.id === a.field.stepId)
      const stepB = content.steps.findIndex(step => step.id === b.field.stepId)
      const baseA = a.layouts[base]
      const baseB = b.layouts[base]
      return stepA - stepB || (baseA?.y ?? 0) - (baseB?.y ?? 0) || (baseA?.x ?? 0) - (baseB?.x ?? 0)
    })
})

const stepGroups = computed(() => {
  const content = definition.value?.content
  if (!content) {
    return []
  }
  return content.steps.map((step, index) => ({
    step,
    number: index + 1,
    cells: cells.value.filter(cell => cell.field.stepId === step.id),
  }))
})

watch(() => props.form, () => {
  void load()
}, { immediate: true })

async function load() {
  state.value = 'loading'
  fieldErrors.value = {}
  alertMessage.value = ''
  definition.value = null
  if (!props.form) {
    state.value = 'missing'
    return
  }
  try {
    definition.value = await $fetch<PublicForm>(`/api/_miraicms/forms/view/${encodeURIComponent(props.form)}`)
    const next: Record<string, string> = {}
    for (const field of definition.value.content.fields) {
      if (isRichFieldType(field.type)) {
        next[field.id] = field.text?.defaultValue || field.text?.ratingOptions.find(item => item.checked)?.value || ''
      }
    }
    drafts.value = next
    state.value = 'idle'
  }
  catch {
    state.value = 'missing'
  }
}

async function onSubmit(event: Event) {
  const form = event.target
  const current = definition.value
  if (!(form instanceof HTMLFormElement) || !current || locked.value) {
    return
  }
  const data = new FormData(form)
  const input: Record<string, unknown> = {}
  const files: Record<string, UploadedFile | null> = {}
  for (const field of current.content.fields) {
    if (field.type === 'checkbox') {
      input[field.key] = data.getAll(field.key).map(value => String(value))
    }
    else if (field.type === 'file') {
      const file = data.get(field.key)
      files[field.key] = file instanceof File && file.size > 0
        ? { name: file.name, type: file.type, size: file.size }
        : null
    }
    else if (field.type !== 'html' && field.type !== 'button') {
      input[field.key] = String(data.get(field.key) ?? '')
      if (field.text?.confirm.enabled) {
        input[`${field.key}__confirm`] = String(data.get(`${field.key}__confirm`) ?? '')
      }
    }
  }
  const errors = submissionErrors(current.content, input, files, current.maxFileBytes)
  fieldErrors.value = errors
  alertMessage.value = ''
  if (Object.keys(errors).length) {
    state.value = 'invalid'
    return
  }
  state.value = 'submitting'
  try {
    await $fetch(`/api/_miraicms/forms/submit/${encodeURIComponent(props.form)}`, {
      method: 'POST',
      body: data,
    })
    state.value = 'success'
  }
  catch (error) {
    const body = (error as { data?: { errors?: Record<string, string>, data?: { errors?: Record<string, string> } } }).data
    const errors = body?.errors || body?.data?.errors
    if (errors && Object.keys(errors).length) {
      fieldErrors.value = errors
      state.value = 'invalid'
      return
    }
    state.value = 'error'
    alertMessage.value = 'Could not submit the form.'
  }
}

function findLayout(items: LayoutItem[] | undefined, fieldId: string): LayoutItem | undefined {
  return items?.find(item => item.fieldId === fieldId)
}

function layoutAttrs(layouts: Record<string, LayoutItem>) {
  const attrs: Record<string, number> = {}
  const base = baseBreakpoint()
  for (const name of formBreakpoints()) {
    const item = layouts[name]
    if (!item) {
      continue
    }
    const suffix = name === base ? '' : `-${name}`
    attrs[`data-x${suffix}`] = item.x
    attrs[`data-y${suffix}`] = item.y
    attrs[`data-w${suffix}`] = item.w
  }
  return attrs
}

function stepNumber(stepId: string): number {
  const index = definition.value?.content.steps.findIndex(step => step.id === stepId) ?? -1
  return index < 0 ? 1 : index + 1
}

function controlId(field: FormField): string {
  return `mirai-${field.id}`
}

function inputType(type: FormField['type']): string {
  if (type === 'phone') {
    return 'tel'
  }
  if (type === 'email' || type === 'number' || type === 'date') {
    return type
  }
  return 'text'
}

function isText(field: FormField): boolean {
  return field.type === 'phone' || field.type === 'date'
}

function richField(field: FormField) {
  return isRichFieldType(field.type)
}

function liveInputType(field: FormField, revealed: boolean) {
  if (field.type === 'textarea') {
    return 'textarea'
  }
  if (field.type === 'password') {
    return revealed ? 'text' : 'password'
  }
  if (field.type === 'email' || field.type === 'number' || field.type === 'url' || field.type === 'color' || field.type === 'range') {
    return field.type
  }
  return 'text'
}

function textOptions(field: FormField) {
  return field.text ?? defaultTextOptions(field.label)
}

function ratingLabel(field: FormField) {
  const options = textOptions(field)
  if (options.ratingHoverMessage && hoverRating.value[field.id]) {
    return hoverRating.value[field.id]
  }
  if (!options.ratingSelectedMessage) {
    return ''
  }
  return options.ratingOptions.find(item => item.value === drafts.value[field.id])?.label || ''
}

function chooseRating(field: FormField, index: number) {
  const list = textOptions(field).ratingOptions
  const current = drafts.value[field.id] || ''
  drafts.value = {
    ...drafts.value,
    [field.id]: ratingSelectedIndex(list, current) === index ? '' : (list[index]?.value || ''),
  }
}

function onDraft(field: FormField, event: Event) {
  const el = event.target
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    return
  }
  const next = applyInputMask(el.value, textOptions(field).mask)
  drafts.value = { ...drafts.value, [field.id]: next }
  if (el.value !== next) {
    el.value = next
  }
}
</script>

<template>
  <form
    class="mirai-form"
    :data-form="form"
    :data-state="state"
    novalidate
    @submit.prevent="onSubmit"
  >
    <div
      v-if="alertMessage"
      class="mirai-form__alert"
      data-alert="error"
    >
      {{ alertMessage }}
    </div>
    <template v-if="definition">
      <div
        v-for="group in stepGroups"
        :key="group.step.id"
        class="mirai-form__step"
        :data-step="group.number"
      >
        <div
          v-if="definition.content.stepHeader.show"
          class="mirai-form__step-header"
        >
          <span
            v-if="definition.content.stepHeader.showIcon && stepIconSvg(group.step.icon)"
            class="mirai-form__step-icon"
            v-html="stepIconSvg(group.step.icon)"
          />
          <span
            v-if="definition.content.stepHeader.showLabel"
            class="mirai-form__step-label"
          >
            <span
              v-if="stepIconSvg(group.step.labelPrefix)"
              class="mirai-form__step-affix"
              v-html="stepIconSvg(group.step.labelPrefix)"
            />
            <span>{{ group.step.label }}</span>
            <span
              v-if="stepIconSvg(group.step.labelSuffix)"
              class="mirai-form__step-affix"
              v-html="stepIconSvg(group.step.labelSuffix)"
            />
          </span>
          <span
            v-if="definition.content.stepHeader.showSubtitle"
            class="mirai-form__step-subtitle"
          >
            <span
              v-if="stepIconSvg(group.step.subtitlePrefix)"
              class="mirai-form__step-affix"
              v-html="stepIconSvg(group.step.subtitlePrefix)"
            />
            <span>{{ group.step.subtitle }}</span>
            <span
              v-if="stepIconSvg(group.step.subtitleSuffix)"
              class="mirai-form__step-affix"
              v-html="stepIconSvg(group.step.subtitleSuffix)"
            />
          </span>
        </div>
        <div class="mirai-form__grid">
          <div
            v-for="cell in group.cells"
        :key="cell.field.id"
        class="mirai-form__cell"
        :data-field="cell.field.key"
        :data-type="cell.field.type"
        :data-step="stepNumber(cell.field.stepId)"
        :data-required="cell.field.required ? 'true' : undefined"
        :data-invalid="fieldErrors[cell.field.key] ? 'true' : undefined"
        v-bind="layoutAttrs(cell.layouts)"
        :hidden="richField(cell.field) && textOptions(cell.field).hidden ? true : undefined"
      >
        <template v-if="richField(cell.field)">
          <div
            v-if="textOptions(cell.field).label.enabled"
            class="mirai-form__label"
          >
            <img
              v-if="iconUrl(textOptions(cell.field).label.prefix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).label.prefix)"
              alt=""
            >
            <span
              v-if="textOptions(cell.field).required.enabled && textOptions(cell.field).required.showAsterisk && textOptions(cell.field).required.asteriskPosition === 'left'"
              class="mirai-form__required"
            >*</span>
            <label :for="controlId(cell.field)">
              <span
                v-if="textOptions(cell.field).required.enabled && textOptions(cell.field).required.showAsterisk && textOptions(cell.field).required.asteriskPosition === 'before'"
                class="mirai-form__required"
              >*</span>
              <span>{{ textOptions(cell.field).label.text }}</span>
              <span
                v-if="textOptions(cell.field).required.enabled && textOptions(cell.field).required.showAsterisk && textOptions(cell.field).required.asteriskPosition === 'after'"
                class="mirai-form__required"
              >*</span>
            </label>
            <img
              v-if="iconUrl(textOptions(cell.field).label.suffix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).label.suffix)"
              alt=""
            >
            <span
              v-if="textOptions(cell.field).required.enabled && textOptions(cell.field).required.showAsterisk && textOptions(cell.field).required.asteriskPosition === 'right'"
              class="mirai-form__required"
            >*</span>
          </div>
          <div
            v-if="textOptions(cell.field).subtitle.enabled && textOptions(cell.field).subtitle.text"
            class="mirai-form__subtitle"
          >
            <img
              v-if="iconUrl(textOptions(cell.field).subtitle.prefix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).subtitle.prefix)"
              alt=""
            >
            <span>{{ textOptions(cell.field).subtitle.text }}</span>
            <img
              v-if="iconUrl(textOptions(cell.field).subtitle.suffix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).subtitle.suffix)"
              alt=""
            >
          </div>
          <span
            class="mirai-form__control-row"
            :style="cell.field.type === 'button' ? {
              display: 'flex',
              width: '100%',
              justifyContent: textOptions(cell.field).fullWidth
                ? 'flex-start'
                : textOptions(cell.field).buttonAlign === 'center'
                  ? 'center'
                  : textOptions(cell.field).buttonAlign === 'right'
                    ? 'flex-end'
                    : 'flex-start',
            } : undefined"
          >
            <img
              v-if="iconUrl(textOptions(cell.field).prefix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).prefix)"
              alt=""
            >
            <div
              v-if="cell.field.type === 'rating'"
              class="mirai-form__rating"
              :data-position="textOptions(cell.field).ratingPosition"
            >
              <button
                v-for="(option, index) in textOptions(cell.field).ratingOptions"
                :key="option.id"
                type="button"
                @mouseenter="hoverRating[cell.field.id] = option.label"
                @mouseleave="hoverRating[cell.field.id] = ''"
                @click="chooseRating(cell.field, index)"
              >
                <img
                  class="mirai-form__icon"
                  :src="ratingIconSrc(option.icon, textOptions(cell.field).ratingIcon)"
                  alt=""
                  :style="{ filter: ratingSelectedIndex(textOptions(cell.field).ratingOptions, drafts[cell.field.id] || '') >= index ? RATING_FILTER_ON : RATING_FILTER_OFF }"
                >
              </button>
              <span v-if="ratingLabel(cell.field)">{{ ratingLabel(cell.field) }}</span>
              <input
                type="hidden"
                :name="cell.field.key"
                :value="drafts[cell.field.id] || ''"
              >
            </div>
            <button
              v-else-if="cell.field.type === 'button'"
              class="mirai-form__button"
              :type="textOptions(cell.field).buttonType"
              :disabled="locked || textOptions(cell.field).disabled"
              :data-align="textOptions(cell.field).fullWidth ? undefined : textOptions(cell.field).buttonAlign"
              :data-full-width="textOptions(cell.field).fullWidth ? 'true' : undefined"
              :style="{ width: textOptions(cell.field).fullWidth ? '100%' : undefined }"
            >
              <img
                v-if="iconUrl(textOptions(cell.field).buttonText.prefix)"
                class="mirai-form__icon"
                :src="iconUrl(textOptions(cell.field).buttonText.prefix)"
                alt=""
              >
              <span>{{ textOptions(cell.field).buttonText.text }}</span>
              <img
                v-if="iconUrl(textOptions(cell.field).buttonText.suffix)"
                class="mirai-form__icon"
                :src="iconUrl(textOptions(cell.field).buttonText.suffix)"
                alt=""
              >
            </button>
            <textarea
              v-else-if="cell.field.type === 'textarea'"
              :id="controlId(cell.field)"
              class="mirai-form__control"
              :name="cell.field.key"
              :rows="cell.field.rows"
              :value="drafts[cell.field.id]"
              :placeholder="textOptions(cell.field).placeholder || undefined"
              :required="textOptions(cell.field).required.enabled"
              :readonly="textOptions(cell.field).readOnly"
              :disabled="locked || textOptions(cell.field).disabled"
              :maxlength="textOptions(cell.field).maxLength ?? undefined"
              :minlength="textOptions(cell.field).minLength ?? undefined"
              :autocomplete="textOptions(cell.field).autocomplete || undefined"
              :inputmode="textOptions(cell.field).inputMode || undefined"
              :list="textOptions(cell.field).suggestions.length ? `mirai-suggest-${cell.field.id}` : undefined"
              @input="onDraft(cell.field, $event)"
            />
            <input
              v-else
              :id="controlId(cell.field)"
              class="mirai-form__control"
              :type="liveInputType(cell.field, revealed[cell.field.id] === true)"
              :name="cell.field.key"
              :value="drafts[cell.field.id]"
              :placeholder="textOptions(cell.field).placeholder || undefined"
              :required="textOptions(cell.field).required.enabled"
              :readonly="textOptions(cell.field).readOnly"
              :disabled="locked || textOptions(cell.field).disabled"
              :maxlength="textOptions(cell.field).maxLength ?? undefined"
              :minlength="textOptions(cell.field).minLength ?? undefined"
              :autocomplete="cell.field.type === 'password' ? 'new-password' : (textOptions(cell.field).autocomplete || undefined)"
              :inputmode="textOptions(cell.field).inputMode || undefined"
              :pattern="textOptions(cell.field).pattern || undefined"
              :min="cell.field.type === 'number' || cell.field.type === 'range' ? textOptions(cell.field).valueMin ?? undefined : undefined"
              :max="cell.field.type === 'number' || cell.field.type === 'range' ? textOptions(cell.field).valueMax ?? undefined : undefined"
              :step="cell.field.type === 'range' ? textOptions(cell.field).step ?? undefined : undefined"
              :list="textOptions(cell.field).suggestions.length ? `mirai-suggest-${cell.field.id}` : undefined"
              @input="onDraft(cell.field, $event)"
            >
            <span v-if="cell.field.type === 'range'">{{ drafts[cell.field.id] }}</span>
            <button
              v-if="cell.field.type === 'password' && textOptions(cell.field).showPassword"
              type="button"
              :aria-label="revealed[cell.field.id] ? 'Hide password' : 'Show password'"
              @click="revealed[cell.field.id] = !revealed[cell.field.id]"
            >
              {{ revealed[cell.field.id] ? 'Hide' : 'Show' }}
            </button>
            <img
              v-if="iconUrl(textOptions(cell.field).suffix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).suffix)"
              alt=""
            >
            <datalist
              v-if="textOptions(cell.field).suggestions.length"
              :id="`mirai-suggest-${cell.field.id}`"
            >
              <option
                v-for="item in textOptions(cell.field).suggestions"
                :key="item.id"
                :value="item.value"
                :label="item.label || undefined"
              />
            </datalist>
          </span>
          <div
            v-if="(textOptions(cell.field).helper.enabled && textOptions(cell.field).helper.text) || passwordRuleStates(textOptions(cell.field), drafts[cell.field.id] || '').length"
            class="mirai-form__help"
          >
            <img
              v-if="textOptions(cell.field).helper.enabled && iconUrl(textOptions(cell.field).helper.prefix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).helper.prefix)"
              alt=""
            >
            <span v-if="textOptions(cell.field).helper.enabled">{{ textOptions(cell.field).helper.text }}</span>
            <img
              v-if="textOptions(cell.field).helper.enabled && iconUrl(textOptions(cell.field).helper.suffix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).helper.suffix)"
              alt=""
            >
            <span
              v-for="(rule, index) in passwordRuleStates(textOptions(cell.field), drafts[cell.field.id] || '')"
              :key="index"
              :style="{ color: rule.ok ? 'green' : 'red', marginRight: '20px' }"
            >{{ rule.ok ? '✔' : '✖' }} {{ rule.label }}</span>
          </div>
          <div
            v-if="fieldErrors[cell.field.key] && textOptions(cell.field).required.showError"
            class="mirai-form__error"
          >
            <img
              v-if="iconUrl(textOptions(cell.field).required.errorPrefix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).required.errorPrefix)"
              alt=""
            >
            <span>{{ fieldErrors[cell.field.key] }}</span>
            <img
              v-if="iconUrl(textOptions(cell.field).required.errorSuffix)"
              class="mirai-form__icon"
              :src="iconUrl(textOptions(cell.field).required.errorSuffix)"
              alt=""
            >
          </div>
          <span
            v-if="textOptions(cell.field).confirm.enabled"
            class="mirai-form__confirm"
            :data-placement="textOptions(cell.field).confirm.placement"
          >
            <label
              v-if="textOptions(cell.field).confirm.label.enabled"
              :for="`${controlId(cell.field)}-confirm`"
            >
              {{ textOptions(cell.field).confirm.label.text }}
            </label>
            <input
              :id="`${controlId(cell.field)}-confirm`"
              class="mirai-form__control"
              :type="liveInputType(cell.field, revealed[cell.field.id] === true)"
              :name="`${cell.field.key}__confirm`"
              :placeholder="textOptions(cell.field).confirm.placeholder || undefined"
              :disabled="locked || textOptions(cell.field).disabled"
            >
            <span v-if="textOptions(cell.field).confirm.helper.enabled">
              {{ textOptions(cell.field).confirm.helper.text }}
            </span>
          </span>
        </template>

        <template v-else-if="isText(cell.field)">
          <label
            class="mirai-form__label"
            :for="controlId(cell.field)"
          >
            {{ cell.field.label }}
            <span
              v-if="cell.field.required"
              class="mirai-form__required"
            >*</span>
          </label>
          <input
            :id="controlId(cell.field)"
            class="mirai-form__control"
            :type="inputType(cell.field.type)"
            :name="cell.field.key"
            :placeholder="cell.field.placeholder || undefined"
            :required="cell.field.required"
            :disabled="locked"
            :min="cell.field.type === 'number' && cell.field.min ? cell.field.min : undefined"
            :max="cell.field.type === 'number' && cell.field.max ? cell.field.max : undefined"
            :step="cell.field.type === 'number' && cell.field.step ? cell.field.step : undefined"
          >
        </template>

        <template v-else-if="cell.field.type === 'select'">
          <label
            class="mirai-form__label"
            :for="controlId(cell.field)"
          >
            {{ cell.field.label }}
            <span
              v-if="cell.field.required"
              class="mirai-form__required"
            >*</span>
          </label>
          <select
            :id="controlId(cell.field)"
            class="mirai-form__control"
            :name="cell.field.key"
            :required="cell.field.required"
            :disabled="locked"
          >
            <option value="">
              {{ cell.field.placeholder }}
            </option>
            <option
              v-for="option in cell.field.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </template>

        <div
          v-else-if="cell.field.type === 'radio' || cell.field.type === 'checkbox'"
          class="mirai-form__choices"
          role="group"
          :aria-labelledby="controlId(cell.field)"
        >
          <div
            :id="controlId(cell.field)"
            class="mirai-form__label"
          >
            {{ cell.field.label }}
            <span
              v-if="cell.field.required"
              class="mirai-form__required"
            >*</span>
          </div>
          <label
            v-for="option in cell.field.options"
            :key="option.value"
            class="mirai-form__choice"
          >
            <input
              class="mirai-form__control"
              :type="cell.field.type === 'radio' ? 'radio' : 'checkbox'"
              :name="cell.field.key"
              :value="option.value"
              :disabled="locked"
            >
            <span class="mirai-form__choice-label">{{ option.label }}</span>
          </label>
        </div>

        <template v-else-if="cell.field.type === 'file'">
          <label
            class="mirai-form__label"
            :for="controlId(cell.field)"
          >
            {{ cell.field.label }}
            <span
              v-if="cell.field.required"
              class="mirai-form__required"
            >*</span>
          </label>
          <input
            :id="controlId(cell.field)"
            class="mirai-form__control"
            type="file"
            :name="cell.field.key"
            :accept="cell.field.accept || undefined"
            :required="cell.field.required"
            :disabled="locked"
          >
        </template>

        <input
          v-else-if="cell.field.type === 'hidden'"
          type="hidden"
          :name="cell.field.key"
          :value="cell.field.value"
        >

        <div
          v-else-if="cell.field.type === 'html'"
          class="mirai-form__html"
          v-html="cell.field.html"
        />

        <button
          v-else-if="cell.field.type === 'button'"
          class="mirai-form__button"
          type="submit"
          :disabled="locked"
        >
          {{ cell.field.buttonLabel || 'Submit' }}
        </button>

        <div
          v-if="cell.field.help && !richField(cell.field) && cell.field.type !== 'hidden' && cell.field.type !== 'html' && cell.field.type !== 'button'"
          class="mirai-form__help"
        >
          {{ cell.field.help }}
        </div>
        <div
          v-if="fieldErrors[cell.field.key] && !richField(cell.field)"
          class="mirai-form__error"
        >
          {{ fieldErrors[cell.field.key] }}
        </div>
          </div>
        </div>
      </div>
    </template>
  </form>
</template>
