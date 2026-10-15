<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  choiceMapLookup,
  decodeChoiceValue,
  encodeChoiceValue,
} from '@miraicms/core'
import type { ChoiceMap, Field } from '@miraicms/core'

type CheckboxFieldConfig = Extract<Field, { type: 'checkbox' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: CheckboxFieldConfig
}>(), {
  field: () => ({ type: 'checkbox', label: '', choices: {} }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-checkbox-field'
const customKeys = ref<string[]>([])
const customDraft = ref('')

const configuredChoices = computed<ChoiceMap>(() => props.field?.choices ?? {})

function rememberCustom(keys: string[]) {
  const configured = configuredChoices.value
  for (const key of keys) {
    if (!key || key in configured || customKeys.value.includes(key)) {
      continue
    }
    customKeys.value = [...customKeys.value, key]
  }
}

const displayChoices = computed<ChoiceMap>(() => {
  const map: ChoiceMap = { ...configuredChoices.value }
  for (const key of customKeys.value) {
    if (!(key in map)) {
      map[key] = key
    }
  }
  return map
})

const choiceKeys = computed(() => Object.keys(displayChoices.value))
const lookup = computed(() => choiceMapLookup(displayChoices.value))

function format(raw: string): unknown {
  return encodeChoiceValue(raw, lookup.value, props.field?.returnFormat)
}

function unformat(value: unknown): string {
  return decodeChoiceValue(value, lookup.value, props.field?.returnFormat)
}

const selected = computed<string[]>({
  get() {
    const value = model.value
    const arr = Array.isArray(value)
      ? value
      : value == null || value === ''
        ? []
        : [value]
    return arr.map(unformat)
  },
  set(raw) {
    model.value = raw.map(format)
  },
})

watch(selected, (keys) => {
  rememberCustom(keys)
}, { immediate: true })

const allChecked = computed<boolean>({
  get: () => choiceKeys.value.length > 0 && choiceKeys.value.every(key => selected.value.includes(key)),
  set: (checked) => {
    selected.value = checked ? [...choiceKeys.value] : []
  },
})

const canAddCustom = computed(() =>
  !!props.field?.allowCustomChoices && customDraft.value.trim().length > 0,
)

const toggleLabel = computed(() => {
  if (props.field?.allowCustomChoices) {
    return 'Select all'
  }
  return props.field?.customChoiceButtonText || 'Select all'
})

const addLabel = computed(() => props.field?.customChoiceButtonText || 'Add')

function addCustom() {
  const term = customDraft.value.trim()
  if (!term || !props.field?.allowCustomChoices) {
    return
  }
  rememberCustom([term])
  if (!selected.value.includes(term)) {
    selected.value = [...selected.value, term]
  }
  customDraft.value = ''
}

onMounted(() => {
  model.value = selected.value.map(format)
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <div :class="rootClass">
      <div
        :class="[
          `${rootClass}__choices`,
          `${rootClass}__choices--${field?.layout || 'vertical'}`,
        ]"
      >
        <label
          v-if="field?.toggle"
          :class="[`${rootClass}__item`, `${rootClass}__item--toggle`]"
        >
          <input
            v-model="allChecked"
            type="checkbox"
          >
          <span>{{ toggleLabel }}</span>
        </label>

        <label
          v-for="(label, value) in displayChoices"
          :key="value"
          :class="`${rootClass}__item`"
        >
          <input
            v-model="selected"
            type="checkbox"
            :name="`${fieldKey}[]`"
            :value="value"
          >
          <span>{{ label }}</span>
        </label>
      </div>

      <form
        v-if="field?.allowCustomChoices"
        :class="`${rootClass}__add`"
        @submit.prevent="addCustom"
      >
        <MiraiCmsInputControl
          v-model="customDraft"
          :field-key="`${fieldKey}_custom`"
          :field="{ placeholder: 'Other' }"
        />
        <MiraiCmsUiButton
          tag="button"
          type="submit"
          variant="secondary"
          :disabled="!canAddCustom"
        >
          {{ addLabel }}
        </MiraiCmsUiButton>
      </form>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-checkbox-field';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(10);

  &__choices {
    display: flex;
    gap: math-rem(8) math-rem(16);

    &--vertical {
      flex-direction: column;
    }

    &--horizontal {
      flex-direction: row;
      flex-wrap: wrap;
    }
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

    &--toggle {
      font-weight: 600;
      padding-bottom: math-rem(6);
      border-bottom: 1px solid $color-border;
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
