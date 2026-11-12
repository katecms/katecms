<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  choiceMapLookup,
  decodeChoiceValue,
  encodeChoiceValue,
} from '@katecms/core'
import type { ChoiceMap, Field } from '@katecms/core'

type RadioFieldConfig = Extract<Field, { type: 'radio' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: RadioFieldConfig
}>(), {
  field: () => ({ type: 'radio', label: '', choices: {} }),
})

const model = defineModel<unknown>()

const rootClass = 'katecms-radio-field'
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

const lookup = computed(() => choiceMapLookup(displayChoices.value))

function format(raw: string): unknown {
  return encodeChoiceValue(raw, lookup.value, props.field?.returnFormat)
}

function unformat(value: unknown): string {
  return decodeChoiceValue(value, lookup.value, props.field?.returnFormat)
}

const selected = computed<string>({
  get: () => unformat(model.value),
  set: (raw) => {
    model.value = raw === '' ? '' : format(raw)
  },
})

watch(selected, (raw) => {
  rememberCustom(raw ? [raw] : [])
}, { immediate: true })

const canAddCustom = computed(() =>
  !!props.field?.allowCustomChoices && customDraft.value.trim().length > 0,
)

const addLabel = computed(() => props.field?.customChoiceButtonText || 'Add')

function addCustom() {
  const term = customDraft.value.trim()
  if (!term || !props.field?.allowCustomChoices) {
    return
  }
  rememberCustom([term])
  selected.value = term
  customDraft.value = ''
}

onMounted(() => {
  const raw = selected.value
  model.value = raw === '' ? '' : format(raw)
})

function onRadioClick(value: string) {
  if (props.field?.allowNull && selected.value === value) {
    selected.value = ''
  }
}
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div
        :class="[
          `${rootClass}__choices`,
          `${rootClass}__choices--${field?.layout || 'vertical'}`,
        ]"
      >
        <label
          v-for="(label, value) in displayChoices"
          :key="value"
          :class="`${rootClass}__item`"
        >
          <input
            v-model="selected"
            type="radio"
            :name="fieldKey"
            :value="value"
            @click="onRadioClick(value)"
          >
          <span>{{ label }}</span>
        </label>
      </div>

      <form
        v-if="field?.allowCustomChoices"
        :class="`${rootClass}__add`"
        @submit.prevent="addCustom"
      >
        <KateCmsInputControl
          v-model="customDraft"
          :field-key="`${fieldKey}_custom`"
          :field="{ placeholder: 'Other' }"
        />
        <KateCmsUiButton
          tag="button"
          type="submit"
          variant="secondary"
          :disabled="!canAddCustom"
        >
          {{ addLabel }}
        </KateCmsUiButton>
      </form>
    </div>
  </KateCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-radio-field';

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
  }

  &__add {
    display: flex;
    align-items: center;
    gap: math-rem(8);

    :deep(.katecms-input-control) {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
}
</style>
