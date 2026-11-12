<script setup lang="ts">
import { ref } from 'vue'
import type { Field } from '@katecms/core'

type PasswordFieldConfig = Extract<Field, { type: 'password' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: PasswordFieldConfig
  autocomplete?: string
}>(), {
  field: () => ({ type: 'password', label: '' }),
  autocomplete: 'new-password',
})

defineOptions({ inheritAttrs: false })

const model = defineModel<string>()

const visible = ref(false)

const rootClass = 'katecms-password-field'
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <KateCmsInputControl
      v-model="model"
      v-bind="$attrs"
      :type="visible ? 'text' : 'password'"
      :field-key="fieldKey"
      :field="field"
      :autocomplete="autocomplete"
    >
      <template #append>
        <button
          type="button"
          :class="[
            `${rootClass}__toggle`,
            { [`${rootClass}__toggle--before-addon`]: props.field?.append },
          ]"
          :aria-label="visible ? 'Hide password' : 'Show password'"
          :aria-pressed="visible"
          @click="visible = !visible"
        >
          <svg
            v-if="visible"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
            <path d="M9.4 5.5A9 9 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.1" />
            <path d="M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle
              cx="12"
              cy="12"
              r="3"
            />
          </svg>
        </button>
      </template>
    </KateCmsInputControl>
  </KateCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-password-field';

#{$root}__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: math-rem(38);
  padding: 0;
  background-color: $color-bg;
  border: 1px solid $color-border;
  border-left: 0;
  border-radius: 0 $border-radius-inter $border-radius-inter 0;
  color: $color-ink;
  cursor: pointer;

  svg {
    display: block;
    width: 18px;
    height: 18px;
  }

  &--before-addon {
    border-radius: 0;
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    border-color: $color-accent;
    color: $color-accent;
  }
}
</style>
