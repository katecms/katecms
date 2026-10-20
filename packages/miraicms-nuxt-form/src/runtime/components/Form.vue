<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import type { FormField, LayoutItem, PublicForm, UploadedFile } from '../form/model'
import { baseBreakpoint, conditionInputValues, confirmationTarget, emptySubmissionError, fieldConditionStates, fieldForCondition, fieldSubmissionError, formBreakpoints, sanitizeHtml, submissionErrors, textStoredValue } from '../form/model'
import type { FormFieldConditionState } from '../form/model'
import { applyInputMask, checkPositionStyle, choiceMatches, defaultTextOptions, fileAccept, headingTag, iconUrl, isRichFieldType, isTemporalType, layoutFlexStyle, listedChoiceOptions, passwordRuleStates, ratingIconSrc, ratingSelectedIndex, RATING_FILTER_OFF, RATING_FILTER_ON, resolveChoiceEntries, temporalInputType } from '../form/text-options'
import { clientFormBreakpoints } from '../form/runtime-config'
import { stepIconSvg } from '../form/icons'

const rootClass = 'mirai-form'


/**
 * Unstyled public form.
 * Each cell carries a 60-column layout. The base breakpoint (`desktop` by default)
 * uses data-x, data-y, and data-w. Other breakpoints use data-x-{name}, data-y-{name}, and data-w-{name}.
 * Columns and rows are 0-based. data-state is loading, missing, idle, submitting, success, invalid, or error.
 */
const props = defineProps<{
  /** Published form id. */
  form: number
}>()

function formId(): number | null {
  const id = Number(props.form)
  if (!Number.isInteger(id) || id < 1) {
    return null
  }
  return id
}

clientFormBreakpoints()

const definition = ref<PublicForm | null>(null)
const state = ref<'loading' | 'missing' | 'idle' | 'submitting' | 'success' | 'invalid' | 'error'>('loading')
const fieldErrors = ref<Record<string, string>>({})
const alertMessage = ref('')
const drafts = ref<Record<string, string>>({})
const liveValues = ref<Record<string, string | string[]>>({})
const selectQuery = ref<Record<string, string>>({})
const chosenFiles = ref<Record<string, { name: string, size: number, url: string }[]>>({})
const revealed = ref<Record<string, boolean>>({})
const hoverRating = ref<Record<string, string>>({})

const locked = computed(() => state.value === 'submitting' || state.value === 'success')
const conditionStates = computed(() => {
  const content = definition.value?.content
  if (!content) {
    return {} as Record<string, FormFieldConditionState>
  }
  return fieldConditionStates(content, liveValues.value)
})
const successHtml = computed(() => sanitizeHtml(definition.value?.content.confirmation?.successMessage || ''))

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
  const id = formId()
  if (id == null) {
    state.value = 'missing'
    return
  }
  try {
    definition.value = await $fetch<PublicForm>(`/api/_miraicms/forms/view/${id}`)
    const next: Record<string, string> = {}
    for (const field of definition.value.content.fields) {
      if (isRichFieldType(field.type)) {
        next[field.id] = field.text?.defaultValue || field.text?.ratingOptions.find(item => item.checked)?.value || ''
      }
    }
    drafts.value = next
    liveValues.value = withoutHiddenValues(definition.value.content, seedConditionValues(definition.value.content, next))
    state.value = 'idle'
  }
  catch {
    state.value = 'missing'
  }
}

function readFormPayload(form: HTMLFormElement, fields: FormField[]) {
  const data = new FormData(form)
  const input: Record<string, unknown> = {}
  const files: Record<string, UploadedFile | UploadedFile[] | null> = {}
  for (const field of fields) {
    if (field.type === 'checkbox' || (field.type === 'image_select' && field.text?.allowMultiple) || (field.type === 'select' && field.text?.selectMultiple.enabled)) {
      input[field.key] = data.getAll(field.key).map(value => String(value))
    }
    else if (field.type === 'file') {
      const selected = data.getAll(field.key).filter((value): value is File => value instanceof File && value.size > 0)
      files[field.key] = selected.length > 1
        ? selected.map(item => ({ name: item.name, type: item.type, size: item.size }))
        : selected[0]
          ? { name: selected[0].name, type: selected[0].type, size: selected[0].size }
        : null
    }
    else if (field.type !== 'html' && field.type !== 'button') {
      input[field.key] = String(data.get(field.key) ?? '')
      if (field.text?.confirm.enabled) {
        input[`${field.key}__confirm`] = String(data.get(`${field.key}__confirm`) ?? '')
      }
    }
  }
  return { input, files }
}

function onFormInput(event: Event) {
  const form = event.currentTarget
  if (form instanceof HTMLFormElement) {
    syncLiveValues(form)
  }
}

function seedConditionValues(content: PublicForm['content'], defaults: Record<string, string>): Record<string, string | string[]> {
  const seeded: Record<string, string | string[]> = {}
  for (const field of content.fields) {
    const multiple = field.type === 'checkbox'
      || (field.type === 'image_select' && field.text?.allowMultiple === true)
      || (field.type === 'select' && field.text?.selectMultiple.enabled === true)
    if (multiple && field.text) {
      seeded[field.id] = listedChoiceOptions(field.text).filter(option => option.checked).map(option => option.value)
    }
    else if (field.type === 'decision_box') {
      seeded[field.id] = textStoredValue(field, field.text?.decisionChecked ? 'on' : '')
    }
    else if ((field.type === 'radio' || field.type === 'image_select' || field.type === 'select') && field.text) {
      seeded[field.id] = listedChoiceOptions(field.text).find(option => option.checked)?.value || ''
    }
    else {
      seeded[field.id] = defaults[field.id] || field.text?.defaultValue || ''
    }
  }
  return seeded
}

function withoutHiddenValues(content: PublicForm['content'], values: Record<string, string | string[]>): Record<string, string | string[]> {
  const next = { ...values }
  for (let pass = 0; pass < content.fields.length; pass += 1) {
    const states = fieldConditionStates(content, next)
    let changed = false
    for (const field of content.fields) {
      const current = next[field.id]
      const empty = Array.isArray(current) ? current.length === 0 : !String(current ?? '').trim()
      if (states[field.id]?.hidden && !empty) {
        next[field.id] = Array.isArray(current) ? [] : ''
        changed = true
      }
    }
    if (!changed) {
      break
    }
  }
  return next
}

function readControlValues(form: HTMLFormElement, fields: FormField[]): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  for (const field of fields) {
    const nodes = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${CSS.escape(field.key)}"]`)]
    const multiple = field.type === 'checkbox'
      || (field.type === 'image_select' && field.text?.allowMultiple === true)
      || (field.type === 'select' && field.text?.selectMultiple.enabled === true)
    if (multiple && nodes[0] instanceof HTMLSelectElement) {
      input[field.key] = [...nodes[0].selectedOptions].map(option => option.value)
    }
    else if (multiple) {
      input[field.key] = nodes.flatMap(node => node instanceof HTMLInputElement && node.checked ? [node.value] : [])
    }
    else if (field.type === 'decision_box') {
      const checked = nodes.find(node => node instanceof HTMLInputElement && node.checked)
      input[field.key] = textStoredValue(field, checked instanceof HTMLInputElement ? checked.value : '')
    }
    else if (nodes.some(node => node instanceof HTMLInputElement && (node.type === 'radio' || node.type === 'checkbox'))) {
      const checked = nodes.find(node => node instanceof HTMLInputElement && node.checked)
      input[field.key] = checked instanceof HTMLInputElement ? checked.value : ''
    }
    else {
      input[field.key] = nodes[0]?.value ?? ''
    }
  }
  return input
}

function syncLiveValues(form: HTMLFormElement) {
  const current = definition.value
  if (!current) {
    return
  }
  liveValues.value = withoutHiddenValues(current.content, conditionInputValues(current.content, readControlValues(form, current.content.fields)))
}

function conditionState(fieldId: string): FormFieldConditionState {
  return conditionStates.value[fieldId] ?? { hidden: false, disabled: false, readonly: false, required: false }
}

function fieldDisabled(field: FormField): boolean {
  return locked.value || textOptions(field).disabled || conditionState(field.id).disabled
}

function fieldReadonly(field: FormField): boolean {
  return textOptions(field).readOnly || conditionState(field.id).readonly
}

function fieldRequired(field: FormField): boolean {
  return conditionState(field.id).required
}

function onFieldFocusOut(field: FormField, event: FocusEvent) {
  const current = definition.value
  if (!current || current.content.validateOnBlur === false || locked.value) {
    return
  }
  const cell = event.currentTarget
  if (!(cell instanceof HTMLElement)) {
    return
  }
  if (event.relatedTarget instanceof Node && cell.contains(event.relatedTarget)) {
    return
  }
  const form = cell.closest('form')
  if (!(form instanceof HTMLFormElement)) {
    return
  }
  const { input, files } = readFormPayload(form, current.content.fields)
  syncLiveValues(form)
  const fieldState = conditionState(field.id)
  if (fieldState.hidden || fieldState.disabled) {
    const next = Object.fromEntries(Object.entries(fieldErrors.value).filter(([key]) => key !== field.key))
    fieldErrors.value = next
    if (!Object.keys(next).length && state.value === 'invalid') {
      state.value = 'idle'
    }
    return
  }
  const message = fieldSubmissionError(fieldForCondition(field, fieldState), input, files[field.key] ?? null, current.maxFileBytes)
  const next = Object.fromEntries(Object.entries(fieldErrors.value).filter(([key]) => key !== field.key))
  fieldErrors.value = message ? { ...next, [field.key]: message } : next
  if (Object.keys(fieldErrors.value).length) {
    state.value = 'invalid'
  }
  else if (state.value === 'invalid') {
    state.value = 'idle'
    alertMessage.value = ''
  }
}

async function onSubmit(event: Event) {
  const form = event.target
  const current = definition.value
  if (!(form instanceof HTMLFormElement) || !current || locked.value) {
    return
  }
  const { input, files } = readFormPayload(form, current.content.fields)
  const empty = emptySubmissionError(current.content, input, files)
  if (empty) {
    fieldErrors.value = {}
    alertMessage.value = empty
    state.value = 'invalid'
    return
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
    const id = formId()
    if (id == null) {
      state.value = 'missing'
      return
    }
    await $fetch(`/api/_miraicms/forms/submit/${id}`, {
      method: 'POST',
      body: new FormData(form),
    })
    state.value = 'success'
    const target = confirmationTarget(current.content.confirmation?.redirectPage || '')
    if (target) {
      window.location.assign(target)
    }
  }
  catch (error) {
    const body = (error as { data?: { message?: string, errors?: Record<string, string>, data?: { message?: string, errors?: Record<string, string> } } }).data
    const errors = body?.errors || body?.data?.errors
    if (errors && Object.keys(errors).length) {
      fieldErrors.value = errors
      state.value = 'invalid'
      return
    }
    const message = typeof body?.message === 'string'
      ? body.message
      : typeof body?.data?.message === 'string'
        ? body.data.message
        : ''
    if (message) {
      alertMessage.value = message
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
    if (item.h != null) {
      attrs[`data-h${suffix}`] = item.h
    }
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

function isDisplay(type: FormField['type']) {
  return type === 'title' || type === 'image' || type === 'divider' || type === 'html' || type === 'spacer'
}

function liveInputType(field: FormField, revealed: boolean) {
  if (field.type === 'textarea') {
    return 'textarea'
  }
  if (field.type === 'password') {
    return revealed ? 'text' : 'password'
  }
  if (field.type === 'phone') {
    return 'tel'
  }
  if (field.type === 'email' || field.type === 'number' || field.type === 'url' || field.type === 'color' || field.type === 'range') {
    return field.type
  }
  if (isTemporalType(field.type)) {
    return temporalInputType(field.type)
  }
  return 'text'
}

function textOptions(field: FormField) {
  return field.text ?? defaultTextOptions(field.label)
}

function choiceEntries(field: FormField) {
  return resolveChoiceEntries(textOptions(field))
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

function clearSelect(id: string) {
  const el = document.getElementById(id)
  if (el instanceof HTMLSelectElement) {
    for (const option of el.options) {
      option.selected = false
    }
    el.value = ''
  }
  document.querySelectorAll<HTMLInputElement>(`[data-select="${id}"] input`).forEach((input) => {
    input.checked = false
  })
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

function onChosenFiles(field: FormField, event: Event) {
  const el = event.target
  if (!(el instanceof HTMLInputElement)) {
    return
  }
  const previous = chosenFiles.value[field.id] ?? []
  for (const item of previous) {
    if (item.url) {
      URL.revokeObjectURL(item.url)
    }
  }
  const next = [...(el.files ?? [])].map(file => ({
    name: file.name,
    size: file.size,
    url: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
  }))
  chosenFiles.value = { ...chosenFiles.value, [field.id]: next }
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <pre>{{ definition }}</pre>

  <form
    :class="rootClass"
    :data-form="form"
    :data-state="state"
    novalidate
    @input="onFormInput"
    @change="onFormInput"
    @submit.prevent="onSubmit"
  >
    <div
      v-if="alertMessage"
      :class="`${rootClass}__alert`"
      data-alert="error"
    >
      {{ alertMessage }}
    </div>
    <div
      v-if="state === 'success' && successHtml"
      :class="`${rootClass}__alert`"
      data-alert="success"
      v-html="successHtml"
    />
    <template v-if="definition">
      <div
        v-for="group in stepGroups"
        :key="group.step.id"
        :class="`${rootClass}__step`"
        :data-step="group.number"
      >
        <div
          v-if="definition.content.stepHeader.show"
          :class="`${rootClass}__step-header`"
        >
          <span
            v-if="definition.content.stepHeader.showIcon && stepIconSvg(group.step.icon)"
            :class="`${rootClass}__step-icon`"
            v-html="stepIconSvg(group.step.icon)"
          />
          <span
            v-if="definition.content.stepHeader.showLabel"
            :class="`${rootClass}__step-label`"
          >
            <span
              v-if="stepIconSvg(group.step.labelPrefix)"
              :class="`${rootClass}__step-affix`"
              v-html="stepIconSvg(group.step.labelPrefix)"
            />
            <span>{{ group.step.label }}</span>
            <span
              v-if="stepIconSvg(group.step.labelSuffix)"
              :class="`${rootClass}__step-affix`"
              v-html="stepIconSvg(group.step.labelSuffix)"
            />
          </span>
          <span
            v-if="definition.content.stepHeader.showSubtitle"
            :class="`${rootClass}__step-subtitle`"
          >
            <span
              v-if="stepIconSvg(group.step.subtitlePrefix)"
              :class="`${rootClass}__step-affix`"
              v-html="stepIconSvg(group.step.subtitlePrefix)"
            />
            <span>{{ group.step.subtitle }}</span>
            <span
              v-if="stepIconSvg(group.step.subtitleSuffix)"
              :class="`${rootClass}__step-affix`"
              v-html="stepIconSvg(group.step.subtitleSuffix)"
            />
          </span>
        </div>
        <div :class="`${rootClass}__grid`">
          <div
            v-for="cell in group.cells"
        :key="cell.field.id"
            :class="[`${rootClass}__cell`, cell.field.containerClass || undefined]"
        :data-field="cell.field.key"
        :data-type="cell.field.type"
            :data-step="stepNumber(cell.field.stepId)"
            :data-required="fieldRequired(cell.field) ? 'true' : undefined"
        :data-invalid="fieldErrors[cell.field.key] ? 'true' : undefined"
            :data-hidden="conditionState(cell.field.id).hidden ? 'true' : undefined"
            v-bind="layoutAttrs(cell.layouts)"
            :hidden="(conditionState(cell.field.id).hidden || (richField(cell.field) && textOptions(cell.field).hidden)) ? true : undefined"
            @focusout="onFieldFocusOut(cell.field, $event)"
          >
            <template v-if="!conditionState(cell.field.id).hidden">
            <template v-if="richField(cell.field)">
              <div
                v-if="cell.field.type === 'title'"
                :style="layoutFlexStyle(textOptions(cell.field).layoutDirection, textOptions(cell.field).layoutAlign)"
              >
                <component
                  :is="headingTag(textOptions(cell.field).heading.tag)"
                  v-if="textOptions(cell.field).heading.enabled"
                >
                  <img
                    v-if="iconUrl(textOptions(cell.field).heading.prefix)"
                    :src="iconUrl(textOptions(cell.field).heading.prefix)"
                    alt=""
                  >
                  <span>{{ textOptions(cell.field).heading.text }}</span>
                  <img
                    v-if="iconUrl(textOptions(cell.field).heading.suffix)"
                    :src="iconUrl(textOptions(cell.field).heading.suffix)"
                    alt=""
                  >
                </component>
                <component
                  :is="headingTag(textOptions(cell.field).subheading.tag)"
                  v-if="textOptions(cell.field).subheading.enabled"
                >
                  <img
                    v-if="iconUrl(textOptions(cell.field).subheading.prefix)"
                    :src="iconUrl(textOptions(cell.field).subheading.prefix)"
                    alt=""
                  >
                  <span>{{ textOptions(cell.field).subheading.text }}</span>
                  <img
                    v-if="iconUrl(textOptions(cell.field).subheading.suffix)"
                    :src="iconUrl(textOptions(cell.field).subheading.suffix)"
                    alt=""
                  >
                </component>
              </div>
              <template v-else-if="cell.field.type === 'image'">
                <img
                  v-if="iconUrl(textOptions(cell.field).elementImage)"
                  :src="iconUrl(textOptions(cell.field).elementImage)"
                  :alt="textOptions(cell.field).imageAlt"
                  :style="{ width: textOptions(cell.field).imageWidth ? `${textOptions(cell.field).imageWidth}px` : undefined, height: textOptions(cell.field).imageHeight ? `${textOptions(cell.field).imageHeight}px` : undefined }"
                >
              </template>
              <div
                v-else-if="cell.field.type === 'divider'"
                style="width: 100%; border-top: 1px solid currentColor"
              />
              <div
                v-else-if="cell.field.type === 'spacer'"
                :style="{ height: `${cell.layouts[baseBreakpoint()]?.h ?? textOptions(cell.field).spacerHeight ?? 40}px` }"
              />
              <div
                v-else-if="cell.field.type === 'html'"
                v-html="sanitizeHtml(cell.field.html)"
              />
              <div
                v-if="!isDisplay(cell.field.type) && textOptions(cell.field).label.enabled"
                :class="`${rootClass}__label`"
              >
                <img
                  v-if="iconUrl(textOptions(cell.field).label.prefix)"
                  :class="`${rootClass}__icon`"
                  :src="iconUrl(textOptions(cell.field).label.prefix)"
                  alt=""
                >
                <span
                  v-if="fieldRequired(cell.field) && textOptions(cell.field).required.showAsterisk && textOptions(cell.field).required.asteriskPosition === 'left'"
                  :class="`${rootClass}__required`"
                >*</span>
                <label :for="controlId(cell.field)">
                  <span
                    v-if="fieldRequired(cell.field) && textOptions(cell.field).required.showAsterisk && textOptions(cell.field).required.asteriskPosition === 'before'"
                    :class="`${rootClass}__required`"
                  >*</span>
                  <span>{{ textOptions(cell.field).label.text }}</span>
                  <span
                    v-if="fieldRequired(cell.field) && textOptions(cell.field).required.showAsterisk && textOptions(cell.field).required.asteriskPosition === 'after'"
                    :class="`${rootClass}__required`"
                  >*</span>
                </label>
                <img
                  v-if="iconUrl(textOptions(cell.field).label.suffix)"
                  :class="`${rootClass}__icon`"
                  :src="iconUrl(textOptions(cell.field).label.suffix)"
                  alt=""
                >
                <span
                  v-if="fieldRequired(cell.field) && textOptions(cell.field).required.showAsterisk && textOptions(cell.field).required.asteriskPosition === 'right'"
                  :class="`${rootClass}__required`"
                >*</span>
              </div>
              <div
                v-if="textOptions(cell.field).subtitle.enabled && textOptions(cell.field).subtitle.text"
                :class="`${rootClass}__subtitle`"
              >
                <img
                  v-if="iconUrl(textOptions(cell.field).subtitle.prefix)"
                  :class="`${rootClass}__icon`"
                  :src="iconUrl(textOptions(cell.field).subtitle.prefix)"
                  alt=""
                >
                <span>{{ textOptions(cell.field).subtitle.text }}</span>
                <img
                  v-if="iconUrl(textOptions(cell.field).subtitle.suffix)"
                  :class="`${rootClass}__icon`"
                  :src="iconUrl(textOptions(cell.field).subtitle.suffix)"
                  alt=""
                >
              </div>
              <span
                v-if="!isDisplay(cell.field.type)"
                :class="`${rootClass}__control-row`"
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
                  :class="`${rootClass}__icon`"
                  :src="iconUrl(textOptions(cell.field).prefix)"
                  alt=""
                >
                <div
                  v-if="cell.field.type === 'rating'"
                  :class="`${rootClass}__rating`"
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
                      :class="`${rootClass}__icon`"
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
                  :class="`${rootClass}__button`"
                  :type="textOptions(cell.field).buttonType"
                  :disabled="fieldDisabled(cell.field)"
                  :data-align="textOptions(cell.field).fullWidth ? undefined : textOptions(cell.field).buttonAlign"
                  :data-full-width="textOptions(cell.field).fullWidth ? 'true' : undefined"
                  :style="{ width: textOptions(cell.field).fullWidth ? '100%' : undefined }"
                >
                  <img
                    v-if="iconUrl(textOptions(cell.field).buttonText.prefix)"
                    :class="`${rootClass}__icon`"
                    :src="iconUrl(textOptions(cell.field).buttonText.prefix)"
                    alt=""
                  >
                  <span>{{ textOptions(cell.field).buttonText.text }}</span>
                  <img
                    v-if="iconUrl(textOptions(cell.field).buttonText.suffix)"
                    :class="`${rootClass}__icon`"
                    :src="iconUrl(textOptions(cell.field).buttonText.suffix)"
                    alt=""
                  >
                </button>
                <div
                  v-else-if="cell.field.type === 'select'"
                  :data-select="controlId(cell.field)"
                >
                  <input
                    v-if="textOptions(cell.field).showSearch"
                    type="search"
                    :placeholder="textOptions(cell.field).searchPlaceholder || undefined"
                    :value="selectQuery[cell.field.id] || ''"
                    @input="selectQuery[cell.field.id] = ($event.target as HTMLInputElement).value"
                  >
                  <button
                    v-if="textOptions(cell.field).showSearch && textOptions(cell.field).searchClearable && selectQuery[cell.field.id]"
                    type="button"
                    @click="selectQuery[cell.field.id] = ''"
                  >
                    Clear
                  </button>
                  <select
                    v-if="!textOptions(cell.field).optionIcon"
                    :id="controlId(cell.field)"
                    :class="`${rootClass}__control`"
                    :name="cell.field.key"
                    :multiple="textOptions(cell.field).selectMultiple.enabled || undefined"
                    :required="fieldRequired(cell.field)"
                    :disabled="fieldDisabled(cell.field) || fieldReadonly(cell.field)"
                  >
                    <option
                      v-if="!textOptions(cell.field).selectMultiple.enabled"
                      value=""
                    >
                      {{ textOptions(cell.field).placeholder }}
                    </option>
                    <template
                      v-for="entry in choiceEntries(cell.field)"
                      :key="entry.type === 'group' ? entry.group.id : entry.option.id"
                    >
                      <option
                        v-if="entry.type === 'option' && choiceMatches(entry.option, selectQuery[cell.field.id] || '')"
                        :value="entry.option.value"
                        :selected="entry.option.checked"
                        :disabled="entry.option.disabled"
                      >
                        {{ entry.option.label }}
                      </option>
                      <optgroup
                        v-else-if="entry.type === 'group'"
                        :label="entry.group.label"
                      >
                        <option
                          v-for="option in entry.group.options.filter(item => choiceMatches(item, selectQuery[cell.field.id] || ''))"
                          :key="option.id"
                          :value="option.value"
                          :selected="option.checked"
                          :disabled="option.disabled"
                        >
                          {{ option.label }}
                        </option>
                      </optgroup>
                    </template>
                  </select>
                  <div v-else>
                    <template
                      v-for="entry in choiceEntries(cell.field)"
                      :key="entry.type === 'group' ? entry.group.id : entry.option.id"
                    >
                      <label
                        v-if="entry.type === 'option' && choiceMatches(entry.option, selectQuery[cell.field.id] || '')"
                      >
                        <input
                          :type="textOptions(cell.field).selectMultiple.enabled ? 'checkbox' : 'radio'"
                          :name="cell.field.key"
                          :value="entry.option.value"
                          :checked="entry.option.checked"
                          :disabled="fieldDisabled(cell.field) || entry.option.disabled"
                        >
                        <img
                          v-if="iconUrl(entry.option.image)"
                          :src="iconUrl(entry.option.image)"
                          alt=""
                        >
                        <span>{{ entry.option.label }}</span>
                      </label>
                      <div v-else-if="entry.type === 'group'">
                        <span>{{ entry.group.label }}</span>
                        <label
                          v-for="option in entry.group.options.filter(item => choiceMatches(item, selectQuery[cell.field.id] || ''))"
                          :key="option.id"
                        >
                          <input
                            :type="textOptions(cell.field).selectMultiple.enabled ? 'checkbox' : 'radio'"
                            :name="cell.field.key"
                            :value="option.value"
                            :checked="option.checked"
                            :disabled="fieldDisabled(cell.field) || option.disabled"
                          >
                          <img
                            v-if="iconUrl(option.image)"
                            :src="iconUrl(option.image)"
                            alt=""
                          >
                          <span>{{ option.label }}</span>
                        </label>
                      </div>
                    </template>
                  </div>
                  <button
                    v-if="textOptions(cell.field).selectedClearable"
                    type="button"
                    @click="clearSelect(controlId(cell.field))"
                  >
                    Clear
                  </button>
                </div>
                <label v-else-if="cell.field.type === 'decision_box'">
                  <input
                    type="checkbox"
                    :name="cell.field.key"
                    :value="textOptions(cell.field).decisionCheckedValue"
                    :checked="textOptions(cell.field).decisionChecked"
                    :disabled="fieldDisabled(cell.field) || fieldReadonly(cell.field)"
                    :required="fieldRequired(cell.field)"
                  >
                  <span v-html="sanitizeHtml(textOptions(cell.field).decisionLabel)" />
                </label>
                <div
                  v-else-if="cell.field.type === 'radio' || cell.field.type === 'checkbox'"
                  :style="{ display: 'grid', gridTemplateColumns: `repeat(${textOptions(cell.field).optionsColumn || 1}, minmax(0, 1fr))`, gap: '8px' }"
                >
                  <label
                    v-for="option in textOptions(cell.field).choiceOptions"
                    :key="option.id"
                  >
                    <input
                      :type="cell.field.type"
                      :name="cell.field.key"
                      :value="option.value"
                      :checked="option.checked"
                      :disabled="fieldDisabled(cell.field) || option.disabled"
                      :required="cell.field.type === 'checkbox' ? option.required : fieldRequired(cell.field)"
                    >
                    <span>{{ option.label }}</span>
                  </label>
                </div>
                <div
                  v-else-if="cell.field.type === 'image_select'"
                  :style="{ display: 'flex', flexWrap: 'wrap', gap: '8px' }"
                >
                  <label
                    v-for="option in textOptions(cell.field).choiceOptions"
                    :key="option.id"
                    :style="{ position: 'relative', width: `${textOptions(cell.field).itemSize || 200}px` }"
                  >
                    <input
                      :type="textOptions(cell.field).allowMultiple ? 'checkbox' : 'radio'"
                      :name="cell.field.key"
                      :value="option.value"
                      :checked="option.checked"
                      :disabled="fieldDisabled(cell.field) || option.disabled"
                      :required="option.required"
                      :style="checkPositionStyle(textOptions(cell.field).checkPosition)"
                    >
                    <img
                      v-if="iconUrl(option.image)"
                      :src="iconUrl(option.image)"
                      alt=""
                      :style="{ display: 'block', width: '100%' }"
                    >
                    <span v-if="!textOptions(cell.field).hideImageLabel">{{ option.label }}</span>
                  </label>
                </div>
                <input
                  v-else-if="cell.field.type === 'file'"
                  :id="controlId(cell.field)"
                  :class="`${rootClass}__control`"
                  type="file"
                  :name="cell.field.key"
                  :accept="fileAccept(textOptions(cell.field).fileType) || undefined"
                  :multiple="textOptions(cell.field).fileMultiple.enabled || undefined"
                  :required="fieldRequired(cell.field)"
                  :disabled="fieldDisabled(cell.field)"
                  @change="onChosenFiles(cell.field, $event)"
                >
                <input
                  v-else-if="isTemporalType(cell.field.type)"
                  :id="controlId(cell.field)"
                  :class="`${rootClass}__control`"
                  :type="temporalInputType(cell.field.type)"
                  :name="cell.field.key"
                  :value="drafts[cell.field.id]"
                  :required="fieldRequired(cell.field)"
                  :readonly="fieldReadonly(cell.field)"
                  :disabled="fieldDisabled(cell.field)"
                  :min="textOptions(cell.field).rangeMin || undefined"
                  :max="textOptions(cell.field).rangeMax || undefined"
                  @input="onDraft(cell.field, $event)"
                >
                <textarea
                  v-else-if="cell.field.type === 'textarea'"
                  :id="controlId(cell.field)"
                  :class="`${rootClass}__control`"
                  :name="cell.field.key"
                  :rows="cell.field.rows"
                  :value="drafts[cell.field.id]"
                  :placeholder="textOptions(cell.field).placeholder || undefined"
                  :required="fieldRequired(cell.field)"
                  :readonly="fieldReadonly(cell.field)"
                  :disabled="fieldDisabled(cell.field)"
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
                  :class="`${rootClass}__control`"
                  :type="liveInputType(cell.field, revealed[cell.field.id] === true)"
                  :name="cell.field.key"
                  :value="drafts[cell.field.id]"
                  :placeholder="textOptions(cell.field).placeholder || undefined"
                  :required="fieldRequired(cell.field)"
                  :readonly="fieldReadonly(cell.field)"
                  :disabled="fieldDisabled(cell.field)"
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
                <span v-if="cell.field.type === 'file'">{{ textOptions(cell.field).uploadButtonText }}</span>
                <span v-if="cell.field.type === 'file' && !(chosenFiles[cell.field.id]?.length)">{{ textOptions(cell.field).fileSelectStatus }}</span>
                <span v-if="cell.field.type === 'file' && (chosenFiles[cell.field.id]?.length || 0) > 1 && !textOptions(cell.field).fileMultiple.enabled">{{ textOptions(cell.field).fileExistMessage }}</span>
                <span v-if="cell.field.type === 'file' && textOptions(cell.field).showMaximumSize">{{ textOptions(cell.field).showMaximumSize }}</span>
                <span
                  v-for="item in cell.field.type === 'file' ? (chosenFiles[cell.field.id] || []) : []"
                  :key="`${cell.field.id}-${item.name}`"
                >
                  <img
                    v-if="textOptions(cell.field).showFilePreview && item.url"
                    :src="item.url"
                    alt=""
                  >
                  <span>{{ item.name }}</span>
                  <span v-if="textOptions(cell.field).showFileSize">{{ formatBytes(item.size) }}</span>
                </span>
                <img
                  v-if="iconUrl(textOptions(cell.field).suffix)"
                  :class="`${rootClass}__icon`"
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
                :class="`${rootClass}__help`"
              >
                <img
                  v-if="textOptions(cell.field).helper.enabled && iconUrl(textOptions(cell.field).helper.prefix)"
                  :class="`${rootClass}__icon`"
                  :src="iconUrl(textOptions(cell.field).helper.prefix)"
                  alt=""
                >
                <span v-if="textOptions(cell.field).helper.enabled">{{ textOptions(cell.field).helper.text }}</span>
                <img
                  v-if="textOptions(cell.field).helper.enabled && iconUrl(textOptions(cell.field).helper.suffix)"
                  :class="`${rootClass}__icon`"
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
                :class="`${rootClass}__error`"
              >
                <img
                  v-if="iconUrl(textOptions(cell.field).required.errorPrefix)"
                  :class="`${rootClass}__icon`"
                  :src="iconUrl(textOptions(cell.field).required.errorPrefix)"
                  alt=""
                >
                <span>{{ fieldErrors[cell.field.key] }}</span>
                <img
                  v-if="iconUrl(textOptions(cell.field).required.errorSuffix)"
                  :class="`${rootClass}__icon`"
                  :src="iconUrl(textOptions(cell.field).required.errorSuffix)"
                  alt=""
                >
              </div>
              <span
                v-if="textOptions(cell.field).confirm.enabled"
                :class="`${rootClass}__confirm`"
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
                  :class="`${rootClass}__control`"
                  :type="liveInputType(cell.field, revealed[cell.field.id] === true)"
                  :name="`${cell.field.key}__confirm`"
                  :placeholder="textOptions(cell.field).confirm.placeholder || undefined"
                  :disabled="fieldDisabled(cell.field)"
                >
                <span v-if="textOptions(cell.field).confirm.helper.enabled">
                  {{ textOptions(cell.field).confirm.helper.text }}
                </span>
              </span>
            </template>

            <template v-else-if="isText(cell.field)">
          <label
                :class="`${rootClass}__label`"
            :for="controlId(cell.field)"
          >
            {{ cell.field.label }}
            <span
              v-if="cell.field.required"
                  :class="`${rootClass}__required`"
            >*</span>
          </label>
          <input
            :id="controlId(cell.field)"
                :class="`${rootClass}__control`"
            :type="inputType(cell.field.type)"
            :name="cell.field.key"
            :placeholder="cell.field.placeholder || undefined"
                :required="fieldRequired(cell.field)"
                :disabled="fieldDisabled(cell.field)"
            :min="cell.field.type === 'number' && cell.field.min ? cell.field.min : undefined"
            :max="cell.field.type === 'number' && cell.field.max ? cell.field.max : undefined"
            :step="cell.field.type === 'number' && cell.field.step ? cell.field.step : undefined"
          >
        </template>

        <template v-else-if="cell.field.type === 'select'">
          <label
                :class="`${rootClass}__label`"
            :for="controlId(cell.field)"
          >
            {{ cell.field.label }}
            <span
              v-if="cell.field.required"
                  :class="`${rootClass}__required`"
            >*</span>
          </label>
          <select
            :id="controlId(cell.field)"
                :class="`${rootClass}__control`"
            :name="cell.field.key"
                :required="fieldRequired(cell.field)"
                :disabled="fieldDisabled(cell.field)"
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
              :class="`${rootClass}__choices`"
          role="group"
          :aria-labelledby="controlId(cell.field)"
        >
          <div
            :id="controlId(cell.field)"
                :class="`${rootClass}__label`"
          >
            {{ cell.field.label }}
            <span
              v-if="cell.field.required"
                  :class="`${rootClass}__required`"
            >*</span>
          </div>
          <label
            v-for="option in cell.field.options"
            :key="option.value"
                :class="`${rootClass}__choice`"
          >
            <input
                  :class="`${rootClass}__control`"
              :type="cell.field.type === 'radio' ? 'radio' : 'checkbox'"
              :name="cell.field.key"
              :value="option.value"
                  :disabled="fieldDisabled(cell.field)"
            >
                <span :class="`${rootClass}__choice-label`">{{ option.label }}</span>
          </label>
        </div>

        <template v-else-if="cell.field.type === 'file'">
          <label
                :class="`${rootClass}__label`"
            :for="controlId(cell.field)"
          >
            {{ cell.field.label }}
            <span
              v-if="cell.field.required"
                  :class="`${rootClass}__required`"
            >*</span>
          </label>
          <input
            :id="controlId(cell.field)"
                :class="`${rootClass}__control`"
            type="file"
            :name="cell.field.key"
            :accept="cell.field.accept || undefined"
                :required="fieldRequired(cell.field)"
                :disabled="fieldDisabled(cell.field)"
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
              :class="`${rootClass}__html`"
          v-html="sanitizeHtml(cell.field.html)"
        />

        <button
          v-else-if="cell.field.type === 'button'"
              :class="`${rootClass}__button`"
          type="submit"
              :disabled="fieldDisabled(cell.field)"
        >
          {{ cell.field.buttonLabel || 'Submit' }}
        </button>

            <div
              v-if="cell.field.help && !richField(cell.field) && cell.field.type !== 'hidden' && cell.field.type !== 'html' && cell.field.type !== 'button'"
              :class="`${rootClass}__help`"
        >
          {{ cell.field.help }}
            </div>
            <div
              v-if="fieldErrors[cell.field.key] && !richField(cell.field)"
              :class="`${rootClass}__error`"
        >
          {{ fieldErrors[cell.field.key] }}
            </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </form>
</template>
