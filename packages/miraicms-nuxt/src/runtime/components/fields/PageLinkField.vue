<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { pageLinkUrl } from '@miraicms/core'
import type { Field, SelectChoice, SelectModelValue } from '@miraicms/core'
import { relationEntriesApi } from '../../utils/relation'
import type { RelationArchiveOption, RelationEntriesResponse, RelationPickerEntry } from '../../utils/relation'

type PageLinkFieldConfig = Extract<Field, { type: 'page_link' }>

type LinkOption = {
  url: string
  title: string
  type: string
}

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: PageLinkFieldConfig
}>(), {
  field: () => ({ type: 'page_link', label: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-page-link-field'
const options = ref<LinkOption[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

function optionLabel(option: LinkOption): string {
  return option.title || option.url
}

const selectChoices = computed<SelectChoice[]>(() => options.value.map(option => ({
  val: option.url,
  lbl: optionLabel(option),
})))

function findOption(url: string): LinkOption | undefined {
  if (!url) {
    return undefined
  }
  return options.value.find(option => option.url === url)
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
      const items = Array.isArray(model.value) ? model.value : []
      return items.map(pageLinkUrl).filter(Boolean)
    }
    return pageLinkUrl(model.value)
  },
  set(raw) {
    if (props.field?.multiple) {
      const urls = Array.isArray(raw) ? raw.map(item => String(item)) : []
      model.value = urls.filter(url => !!findOption(url))
      return
    }
    if (raw === '' || raw == null) {
      model.value = emptyValue()
      return
    }
    const option = findOption(String(raw))
    model.value = option ? option.url : emptyValue()
  },
})

const placeholder = computed(() => {
  if (props.field?.multiple) {
    return 'Select links'
  }
  if (props.field?.allowNull || !props.field?.required) {
    return 'Select link'
  }
  return ''
})

function mergeOptions(fetched: RelationPickerEntry[], archives: RelationArchiveOption[] = []) {
  const next: LinkOption[] = [
    ...archives,
    ...fetched.map(entry => ({
      url: entry.url,
      title: entry.title || entry.slug,
      type: entry.type,
    })),
  ]
  const byUrl = new Map(next.map(option => [option.url, option]))
  for (const url of (Array.isArray(model.value) ? model.value : [model.value]).map(pageLinkUrl)) {
    if (url && !byUrl.has(url)) {
      byUrl.set(url, { url, title: url, type: '' })
    }
  }
  options.value = [...byUrl.values()]
}

function syncModel() {
  if (props.field?.multiple) {
    const urls = Array.isArray(model.value) ? model.value.map(pageLinkUrl) : []
    model.value = urls.filter(url => !!findOption(url))
    return
  }
  const url = pageLinkUrl(model.value)
  if (!url) {
    if (props.field?.allowNull && (model.value === undefined || model.value === '')) {
      model.value = null
    }
    return
  }
  if (!findOption(url)) {
    return
  }
  model.value = url
}

async function loadEntries() {
  loading.value = true
  loadError.value = null
  try {
    const res = await $fetch<RelationEntriesResponse>(relationEntriesApi({
      postType: props.field?.postType,
      dictionary: props.field?.dictionary,
      archives: !!props.field?.allowArchives,
    }))
    mergeOptions(res.entries, res.archives)
  }
  catch {
    loadError.value = 'Could not load links.'
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
      search-placeholder="Search links"
      :selected-opt-clearable="!!field?.allowNull"
      no-results-text="No links found"
      :aria-label="field?.label || fieldKey"
    />
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-page-link-field';

#{$root} {
  &__error {
    margin: 0 0 math-rem(8);
    color: $color-danger;
    font-size: math-rem(13);
  }
}
</style>
