<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import type { FormField, LayoutItem, PublicForm, UploadedFile } from '../form/model'
import { submissionErrors } from '../form/model'
import { stepIconSvg } from '../form/icons'

/**
 * Unstyled public form.
 * Each cell carries a 60-column layout for three breakpoints:
 * data-x, data-y, data-w (desktop), data-x-tablet, data-y-tablet, data-w-tablet, data-x-phone, data-y-phone, data-w-phone.
 * Columns and rows are 0-based. data-state is loading, missing, idle, submitting, success, invalid, or error.
 */
const props = defineProps<{
  form: string
}>()

const definition = ref<PublicForm | null>(null)
const state = ref<'loading' | 'missing' | 'idle' | 'submitting' | 'success' | 'invalid' | 'error'>('loading')
const fieldErrors = ref<Record<string, string>>({})
const alertMessage = ref('')

const locked = computed(() => state.value === 'submitting' || state.value === 'success')

const cells = computed(() => {
  const content = definition.value?.content
  if (!content) {
    return []
  }
  return content.fields
    .map((field) => {
      const desktop = findLayout(content.layouts.desktop, field.id)
      const tablet = findLayout(content.layouts.tablet, field.id)
      const phone = findLayout(content.layouts.phone, field.id)
      if (!desktop || !tablet || !phone) {
        return null
      }
      return { field, desktop, tablet, phone }
    })
    .filter((cell): cell is { field: FormField, desktop: LayoutItem, tablet: LayoutItem, phone: LayoutItem } => !!cell)
    .sort((a, b) => {
      const stepA = content.steps.findIndex(step => step.id === a.field.stepId)
      const stepB = content.steps.findIndex(step => step.id === b.field.stepId)
      return stepA - stepB || a.desktop.y - b.desktop.y || a.desktop.x - b.desktop.x
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

function findLayout(items: LayoutItem[], fieldId: string): LayoutItem | undefined {
  return items.find(item => item.fieldId === fieldId)
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
  return field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number' || field.type === 'date'
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
    <p
      v-if="alertMessage"
      class="mirai-form__alert"
      data-alert="error"
    >
      {{ alertMessage }}
    </p>
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
        :data-x="cell.desktop.x"
        :data-y="cell.desktop.y"
        :data-w="cell.desktop.w"
        :data-x-tablet="cell.tablet.x"
        :data-y-tablet="cell.tablet.y"
        :data-w-tablet="cell.tablet.w"
        :data-x-phone="cell.phone.x"
        :data-y-phone="cell.phone.y"
        :data-w-phone="cell.phone.w"
      >
        <template v-if="isText(cell.field)">
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

        <template v-else-if="cell.field.type === 'textarea'">
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
          <textarea
            :id="controlId(cell.field)"
            class="mirai-form__control"
            :name="cell.field.key"
            :rows="cell.field.rows"
            :placeholder="cell.field.placeholder || undefined"
            :required="cell.field.required"
            :disabled="locked"
          />
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

        <p
          v-if="cell.field.help && cell.field.type !== 'hidden' && cell.field.type !== 'html' && cell.field.type !== 'button'"
          class="mirai-form__help"
        >
          {{ cell.field.help }}
        </p>
        <p
          v-if="fieldErrors[cell.field.key]"
          class="mirai-form__error"
        >
          {{ fieldErrors[cell.field.key] }}
        </p>
          </div>
        </div>
      </div>
    </template>
  </form>
</template>
