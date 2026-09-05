<script setup lang="ts">
import { ref } from 'vue'
import type { Field } from '@miraicms/core'

type PasswordFieldConfig = Extract<Field, { type: 'password' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: PasswordFieldConfig
}>(), {
  field: () => ({ type: 'password', label: '' }),
})

const model = defineModel<string>()

const visible = ref(false)

const rootClass = 'miraicms-password-field'
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
  >
    <MiraiCmsInputControl
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :field-key="fieldKey"
      :field="field"
      autocomplete="new-password"
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
          {{ visible ? 'Hide' : 'Show' }}
        </button>
      </template>
    </MiraiCmsInputControl>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-password-field';

#{$root}__toggle {
  flex: 0 0 auto;
  padding: 0 math-rem(12);
  background-color: $color-bg;
  border: 1px solid $color-border;
  border-left: 0;
  border-radius: 0 $border-radius-inter $border-radius-inter 0;
  color: $color-ink;
  cursor: pointer;

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
