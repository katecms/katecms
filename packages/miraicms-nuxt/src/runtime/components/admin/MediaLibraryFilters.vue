<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SelectModelValue } from '@miraicms/core'
import {
  MEDIA_TYPE_CHOICES,
  isMediaTypeFilter,
  monthLabel,
  searchNeedle,
} from '../../utils/media-library-query'
import type { MediaLibraryFilterState, MediaTypeFilter } from '../../utils/media-library-query'

const props = withDefaults(defineProps<{
  filters: MediaLibraryFilterState
  months?: string[]
  idPrefix?: string
}>(), {
  months: () => [],
  idPrefix: 'media',
})

const emit = defineEmits<{
  'update:filters': [filters: MediaLibraryFilterState]
}>()

const rootClass = 'miraicms-media-filters'
const searchDraft = ref(props.filters.search)
let searchTimer: ReturnType<typeof setTimeout> | undefined

const typeChoices = MEDIA_TYPE_CHOICES

const monthChoices = computed(() => {
  const values = [...props.months]
  if (props.filters.month !== 'all' && !values.includes(props.filters.month)) {
    values.push(props.filters.month)
  }
  values.sort((a, b) => b.localeCompare(a))
  return [
    { val: 'all', lbl: 'All dates' },
    ...values.map(value => ({ val: value, lbl: monthLabel(value) })),
  ]
})

const typeModel = computed({
  get(): SelectModelValue {
    return props.filters.type
  },
  set(value: SelectModelValue) {
    const raw = typeof value === 'string' ? value : 'all'
    const type: MediaTypeFilter = isMediaTypeFilter(raw) ? raw : 'all'
    emitChange({ ...props.filters, type, search: searchDraft.value })
  },
})

const monthModel = computed({
  get(): SelectModelValue {
    return props.filters.month
  },
  set(value: SelectModelValue) {
    const raw = typeof value === 'string' ? value : 'all'
    const month = raw === 'all' || /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : 'all'
    emitChange({ ...props.filters, month, search: searchDraft.value })
  },
})

watch(() => props.filters.search, (value) => {
  searchDraft.value = value
})

watch(searchDraft, (value) => {
  if (searchNeedle(value) === searchNeedle(props.filters.search) && value.trim() === props.filters.search.trim()) {
    return
  }
  window.clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    emitChange({ ...props.filters, search: value })
  }, 300)
})

onBeforeUnmount(() => {
  window.clearTimeout(searchTimer)
})

function emitChange(next: MediaLibraryFilterState) {
  if (
    next.type === props.filters.type
    && next.month === props.filters.month
    && next.search === props.filters.search
  ) {
    return
  }
  emit('update:filters', next)
}

function flushSearch() {
  window.clearTimeout(searchTimer)
  emitChange({ ...props.filters, search: searchDraft.value })
}
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__field`">
      <MiraiCmsUiSelect
        :id="`${idPrefix}-type`"
        v-model="typeModel"
        :choices="typeChoices"
        aria-label="Media type"
      />
    </div>
    <div :class="`${rootClass}__field`">
      <MiraiCmsUiSelect
        :id="`${idPrefix}-month`"
        v-model="monthModel"
        :choices="monthChoices"
        aria-label="Date"
      />
    </div>
    <form
      :class="`${rootClass}__search`"
      @submit.prevent="flushSearch"
    >
      <MiraiCmsInputControl
        v-model="searchDraft"
        :field-key="`${idPrefix}-search`"
        :field="{ placeholder: 'Search media' }"
      />
    </form>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-media-filters';

#{$root} {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: math-rem(8);

  &__field {
    flex: 1 1 math-rem(200);
    min-width: math-rem(180);
    max-width: math-rem(260);
  }

  &__search {
    flex: 1 1 math-rem(220);
    min-width: math-rem(180);
    max-width: math-rem(360);

    :deep(.miraicms-input-control) {
      width: 100%;
    }
  }
}
</style>
