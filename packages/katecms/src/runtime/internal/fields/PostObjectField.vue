<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  encodeRelationEntryValue,
  isRelationEntryValue,
  relationFieldId,
} from '@katecms/core'
import type { Field, RelationEntryValue, SelectChoice, SelectModelValue } from '@katecms/core'
import { relationEntriesApi } from '../../utils/relation'
import type { RelationEntriesResponse, RelationPickerEntry } from '../../utils/relation'

type PostObjectFieldConfig = Extract<Field, { type: 'post_object' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: PostObjectFieldConfig
}>(), {
  field: () => ({ type: 'post_object', label: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'katecms-post-object-field'

function entriesFromModel(value: unknown): RelationEntryValue[] {
  const items = Array.isArray(value) ? value : value != null && value !== '' ? [value] : []
  return items.filter(isRelationEntryValue)
}

const entries = ref<RelationPickerEntry[]>(entriesFromModel(model.value))
const loading = ref(false)
const loadError = ref<string | null>(null)

function entryLabel(entry: RelationPickerEntry): string {
  return entry.title || entry.slug
}

const selectChoices = computed<SelectChoice[]>(() => entries.value.map(entry => ({
  val: entry.id,
  lbl: entryLabel(entry),
})))

function findEntry(id: string): RelationPickerEntry | undefined {
  if (!id) {
    return undefined
  }
  return entries.value.find(entry => String(entry.id) === id)
}

function emptyValue(): unknown {
  if (props.field?.multiple) {
    return []
  }
  return props.field?.allowNull ? null : ''
}

const selected = computed<SelectModelValue>({
  get() {
    if (props.field?.multiple) {
      return Array.isArray(model.value) ? model.value.map(relationFieldId).filter(Boolean) : []
    }
    return relationFieldId(model.value)
  },
  set(raw) {
    if (props.field?.multiple) {
      const ids = Array.isArray(raw) ? raw.map(id => String(id)) : []
      model.value = ids
        .map(id => findEntry(id))
        .filter((entry): entry is RelationPickerEntry => !!entry)
        .map(entry => encodeRelationEntryValue(entry, props.field?.returnFormat))
      return
    }
    if (raw === '' || raw == null) {
      model.value = emptyValue()
      return
    }
    const entry = findEntry(String(raw))
    model.value = entry
      ? encodeRelationEntryValue(entry, props.field?.returnFormat)
      : emptyValue()
  },
})

const placeholder = computed(() => {
  if (props.field?.multiple) {
    return 'Select entries'
  }
  if (props.field?.allowNull || !props.field?.required) {
    return 'Select entry'
  }
  return ''
})

function mergeEntries(fetched: RelationPickerEntry[]) {
  const byId = new Map(fetched.map(entry => [entry.id, entry]))
  for (const existing of entries.value) {
    if (!byId.has(existing.id)) {
      byId.set(existing.id, existing)
    }
  }
  entries.value = [...byId.values()]
}

function syncModel() {
  if (props.field?.multiple) {
    const ids = Array.isArray(model.value) ? model.value.map(relationFieldId).filter(Boolean) : []
    const next = ids
      .map(id => findEntry(id))
      .filter((entry): entry is RelationPickerEntry => !!entry)
    if (next.length !== ids.length) {
      model.value = next.map(entry => encodeRelationEntryValue(entry, props.field?.returnFormat))
    }
    return
  }
  const id = relationFieldId(model.value)
  if (!id && props.field?.allowNull && (model.value === undefined || model.value === '')) {
    model.value = null
  }
}

async function loadEntries() {
  loading.value = true
  loadError.value = null
  try {
    const res = await $fetch<RelationEntriesResponse>(relationEntriesApi({
      postType: props.field?.postType,
      dictionary: props.field?.dictionary,
    }))
    mergeEntries(res.entries)
  }
  catch {
    loadError.value = 'Could not load entries.'
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadEntries()
  syncModel()
})
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <div
      v-if="loadError"
      :class="`${rootClass}__error`"
    >
      {{ loadError }}
    </div>
    <KateCmsUiSelect
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
      search-placeholder="Search entries"
      :selected-opt-clearable="!!field?.allowNull"
      no-results-text="No entries found"
      :aria-label="field?.label || fieldKey"
    />
  </KateCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-post-object-field';

#{$root} {
  &__error {
    margin: 0 0 math-rem(8);
    color: $color-danger;
    font-size: math-rem(13);
  }
}
</style>
