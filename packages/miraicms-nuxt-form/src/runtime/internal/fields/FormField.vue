<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Field, SelectChoice, SelectModelValue } from '@miraicms/core'

type FormFieldConfig = Extract<Field, { type: 'form' }>

interface FormChoice {
  id: number
  name: string
  slug: string
}

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: FormFieldConfig
}>(), {
  field: () => ({ type: 'form', label: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-form-field'

const forms = ref<FormChoice[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

const returnFormat = computed(() => props.field?.returnFormat === 'slug' ? 'slug' : 'id')

function storedValue(form: FormChoice): number | string {
  return returnFormat.value === 'slug' ? form.slug : form.id
}

function emptyValue(): unknown {
  if (props.field?.multiple) {
    return []
  }
  return props.field?.allowNull ? null : ''
}

const selectChoices = computed<SelectChoice[]>(() => forms.value.map(form => ({
  val: storedValue(form),
  lbl: form.name || form.slug,
})))

function asStored(value: unknown): string | number | null {
  if (value == null || value === '') {
    return null
  }
  if (returnFormat.value === 'slug') {
    return String(value)
  }
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

const selected = computed<SelectModelValue>({
  get() {
    if (props.field?.multiple) {
      const items = Array.isArray(model.value) ? model.value : []
      return items
        .map(asStored)
        .filter((value): value is string | number => value != null)
    }
    return asStored(model.value) ?? ''
  },
  set(raw) {
    if (props.field?.multiple) {
      const items = Array.isArray(raw) ? raw : []
      model.value = items
        .map(item => returnFormat.value === 'slug' ? String(item) : Number(item))
        .filter(item => returnFormat.value === 'slug' ? item !== '' : Number.isFinite(item))
      return
    }
    if (raw === '' || raw == null) {
      model.value = emptyValue()
      return
    }
    model.value = returnFormat.value === 'slug' ? String(raw) : Number(raw)
  },
})

const placeholder = computed(() => {
  if (props.field?.multiple) {
    return 'Select forms'
  }
  if (props.field?.allowNull || !props.field?.required) {
    return 'Select form'
  }
  return ''
})

function normalizeModel() {
  if (props.field?.multiple) {
    if (!Array.isArray(model.value)) {
      model.value = []
    }
    return
  }
  if (props.field?.allowNull && (model.value === undefined || model.value === '')) {
    model.value = null
  }
}

async function loadForms() {
  loading.value = true
  loadError.value = null
  try {
    const res = await $fetch<FormChoice[]>('/api/_miraicms/forms')
    forms.value = Array.isArray(res)
      ? res.filter(form => Number.isFinite(form.id) && typeof form.slug === 'string')
      : []
  }
  catch {
    loadError.value = 'Could not load forms.'
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  normalizeModel()
  await loadForms()
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <div
      v-if="loadError"
      :class="`${rootClass}__error`"
    >
      {{ loadError }}
    </div>
    <MiraiCmsUiSelect
      :id="fieldKey"
      v-model="selected"
      :name="fieldKey"
      :choices="selectChoices"
      :placeholder="placeholder"
      :multiple="field?.multiple || false"
      :required="field?.required || false"
      :disabled="loading"
      search
      search-clearable
      search-placeholder="Search forms"
      :selected-opt-clearable="!!field?.allowNull"
      no-results-text="No forms found"
      :aria-label="field?.label || fieldKey"
    />
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-form-field';

#{$root} {
  &__error {
    margin: 0 0 math-rem(8);
    color: $color-danger;
    font-size: math-rem(13);
  }
}
</style>
