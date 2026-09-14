<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  encodeRelationTermValue,
  isRelationTermValue,
  relationFieldId,
} from '@miraicms/core'
import type { Field, RelationTermValue, SelectChoice, SelectModelValue } from '@miraicms/core'
import { dictionaryApi } from '../../utils/dictionaries'
import type { DictionaryTermResponse } from '../../utils/dictionaries'
import { relationTermsApi } from '../../utils/relation'
import type { RelationTermsResponse } from '../../utils/relation'
import { slugify } from '../../utils/slugify'

type DictionaryFieldConfig = Extract<Field, { type: 'dictionary' }>
type DictionaryFieldType = NonNullable<DictionaryFieldConfig['fieldType']>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: DictionaryFieldConfig
}>(), {
  field: () => ({ type: 'dictionary', label: '', dictionary: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-dictionary-field'

function termsFromModel(value: unknown): RelationTermValue[] {
  const items = Array.isArray(value) ? value : value != null && value !== '' ? [value] : []
  return items.filter(isRelationTermValue)
}

const terms = ref<RelationTermValue[]>(termsFromModel(model.value))
const loading = ref(false)
const loadError = ref<string | null>(null)
const canCreate = ref(false)
const adding = ref(false)
const newTitle = ref('')

const fieldType = computed<DictionaryFieldType>(() => props.field?.fieldType || 'checkbox')

const isMultiple = computed(() => {
  if (fieldType.value === 'checkbox' || fieldType.value === 'multi_select') {
    return true
  }
  if (fieldType.value === 'radio') {
    return false
  }
  return !!props.field?.multiple
})

const useSelect = computed(() => (
  fieldType.value === 'select' || fieldType.value === 'multi_select'
))

function termLabel(term: RelationTermValue): string {
  const depth = term.depth ?? 0
  return depth < 1 ? term.title : `${'— '.repeat(depth)}${term.title}`
}

const selectChoices = computed<SelectChoice[]>(() => terms.value.map(term => ({
  val: term.id,
  lbl: termLabel(term),
})))

function findTerm(id: string): RelationTermValue | undefined {
  if (!id) {
    return undefined
  }
  return terms.value.find(term => String(term.id) === id)
}

function emptyValue(): unknown {
  if (isMultiple.value) {
    return []
  }
  return props.field?.allowNull ? null : ''
}

function encode(term: RelationTermValue) {
  return encodeRelationTermValue(term, props.field?.returnFormat)
}

const selected = computed<SelectModelValue>({
  get() {
    if (isMultiple.value) {
      return Array.isArray(model.value) ? model.value.map(relationFieldId).filter(Boolean) : []
    }
    return relationFieldId(model.value)
  },
  set(raw) {
    if (isMultiple.value) {
      const ids = Array.isArray(raw) ? raw.map(id => String(id)) : []
      model.value = ids
        .map(id => findTerm(id))
        .filter((term): term is RelationTermValue => !!term)
        .map(encode)
      return
    }
    if (raw === '' || raw == null) {
      model.value = emptyValue()
      return
    }
    const term = findTerm(String(raw))
    model.value = term ? encode(term) : emptyValue()
  },
})

const selectedIds = computed(() => {
  const value = selected.value
  return Array.isArray(value) ? value.map(String) : value ? [String(value)] : []
})

const radioValue = computed<string>({
  get: () => Array.isArray(selected.value) ? '' : String(selected.value || ''),
  set: (raw) => {
    selected.value = raw
  },
})

const checkboxValue = computed<string[]>({
  get: () => selectedIds.value,
  set: (raw) => {
    selected.value = raw
  },
})

const placeholder = computed(() => {
  if (isMultiple.value) {
    return 'Select terms'
  }
  if (props.field?.allowNull || !props.field?.required) {
    return 'Select term'
  }
  return ''
})

const showAdd = computed(() => !!props.field?.addTerm && canCreate.value)

function mergeTerms(fetched: RelationTermValue[]) {
  const byId = new Map(fetched.map(term => [term.id, term]))
  for (const existing of terms.value) {
    if (!byId.has(existing.id)) {
      byId.set(existing.id, existing)
    }
  }
  terms.value = [...byId.values()]
}

function syncModel() {
  if (isMultiple.value) {
    const ids = Array.isArray(model.value) ? model.value.map(relationFieldId) : []
    model.value = ids
      .map(id => findTerm(id))
      .filter((term): term is RelationTermValue => !!term)
      .map(encode)
    return
  }
  const id = relationFieldId(model.value)
  if (!id) {
    if (props.field?.allowNull && (model.value === undefined || model.value === '')) {
      model.value = null
    }
    return
  }
  const term = findTerm(id)
  if (term) {
    model.value = encode(term)
  }
}

function onRadioClick(id: string) {
  if (props.field?.allowNull && radioValue.value === id) {
    radioValue.value = ''
  }
}

async function loadTerms() {
  const slug = props.field?.dictionary?.trim()
  if (!slug) {
    loadError.value = 'Dictionary is not configured.'
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const res = await $fetch<RelationTermsResponse>(relationTermsApi(slug))
    mergeTerms(res.terms)
    canCreate.value = res.canCreate
  }
  catch {
    loadError.value = 'Could not load terms.'
  }
  finally {
    loading.value = false
  }
}

async function addTerm() {
  const slug = props.field?.dictionary?.trim()
  const title = newTitle.value.trim()
  if (!slug || !title || adding.value) {
    return
  }
  adding.value = true
  loadError.value = null
  try {
    const res = await $fetch<DictionaryTermResponse>(dictionaryApi(slug), {
      method: 'POST',
      body: {
        title,
        slug: slugify(title) || 'term',
        fields: {},
      },
    })
    mergeTerms([{
      id: res.term.id,
      type: res.term.type,
      title: res.term.title,
      slug: res.term.slug,
      slugPath: res.term.slugPath,
      parentId: res.term.parentId ?? null,
      depth: res.term.depth,
    }])
    newTitle.value = ''
    if (isMultiple.value) {
      selected.value = [...selectedIds.value, String(res.term.id)]
    }
    else {
      selected.value = String(res.term.id)
    }
  }
  catch {
    loadError.value = 'Could not add the term.'
  }
  finally {
    adding.value = false
  }
}

onMounted(async () => {
  await loadTerms()
  syncModel()
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    :label-tag="useSelect ? 'label' : 'div'"
  >
    <div :class="rootClass">
      <div
        v-if="loadError"
        :class="`${rootClass}__error`"
      >
        {{ loadError }}
      </div>

      <MiraiCmsUiSelect
        v-if="useSelect"
        :id="fieldKey"
        v-model="selected"
        :name="fieldKey"
        :choices="selectChoices"
        :placeholder="placeholder"
        :multiple="isMultiple"
        :required="field?.required || false"
        :disabled="loading"
        search
        search-clearable
        search-placeholder="Search terms"
        :selected-opt-clearable="!!field?.allowNull"
        no-results-text="No terms found"
        :aria-label="field?.label || fieldKey"
      />

      <p
        v-else-if="!terms.length && !loading && !loadError"
        :class="`${rootClass}__empty`"
      >
        No terms
      </p>

      <div
        v-else-if="fieldType === 'radio'"
        :class="`${rootClass}__choices`"
      >
        <label
          v-for="term in terms"
          :key="term.id"
          :class="`${rootClass}__item`"
        >
          <input
            v-model="radioValue"
            type="radio"
            :name="fieldKey"
            :value="String(term.id)"
            :disabled="loading"
            @click="onRadioClick(String(term.id))"
          >
          <span>{{ termLabel(term) }}</span>
        </label>
      </div>

      <div
        v-else
        :class="`${rootClass}__choices`"
      >
        <label
          v-for="term in terms"
          :key="term.id"
          :class="`${rootClass}__item`"
        >
          <input
            v-model="checkboxValue"
            type="checkbox"
            :name="`${fieldKey}[]`"
            :value="String(term.id)"
            :disabled="loading"
          >
          <span>{{ termLabel(term) }}</span>
        </label>
      </div>

      <form
        v-if="showAdd"
        :class="`${rootClass}__add`"
        @submit.prevent="addTerm"
      >
        <MiraiCmsInputControl
          v-model="newTitle"
          :field-key="`${fieldKey}_new`"
          :field="{ placeholder: 'New term' }"
        />
        <MiraiCmsUiButton
          tag="button"
          type="submit"
          :variant="['secondary', 'small']"
          :disabled="adding || !newTitle.trim()"
        >
          {{ adding ? 'Adding…' : 'Add' }}
        </MiraiCmsUiButton>
      </form>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-dictionary-field';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(8);

  &__error,
  &__empty {
    margin: 0;
    font-size: math-rem(13);
  }

  &__error {
    color: $color-danger;
  }

  &__empty {
    color: $color-muted;
  }

  &__choices {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: math-rem(6);
    cursor: pointer;
    color: $color-ink;

    input {
      accent-color: $color-accent;
    }
  }

  &__add {
    display: flex;
    align-items: center;
    gap: math-rem(8);

    :deep(.miraicms-input-control) {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
}
</style>
