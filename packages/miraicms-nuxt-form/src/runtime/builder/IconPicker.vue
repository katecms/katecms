<script setup lang="ts">
import { ref } from 'vue'
import { STEP_ICONS, stepIconSvg } from '../form/icons'

const props = withDefaults(defineProps<{
  label: string
  modelValue: string
  compact?: boolean
}>(), {
  compact: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)

function choose(id: string) {
  emit('update:modelValue', id)
  open.value = false
}
</script>

<template>
  <div
    class="miraicms-form-icon-picker"
    :class="{ 'is-compact': compact }"
  >
    <span
      v-if="!compact"
      class="miraicms-form-icon-picker__label"
    >{{ label }}</span>
    <button
      type="button"
      class="miraicms-form-icon-picker__trigger"
      :aria-label="compact ? label : undefined"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span
        v-if="stepIconSvg(modelValue)"
        class="miraicms-form-icon-picker__preview"
        v-html="stepIconSvg(modelValue)"
      />
      <span
        v-else
        class="miraicms-form-icon-picker__empty"
      >{{ compact ? '' : 'None' }}</span>
    </button>
    <div
      v-if="open"
      class="miraicms-form-icon-picker__grid"
    >
      <button
        type="button"
        class="miraicms-form-icon-picker__choice"
        :class="{ 'is-active': !modelValue }"
        aria-label="No icon"
        @click="choose('')"
      >
        <span>—</span>
      </button>
      <button
        v-for="icon in STEP_ICONS"
        :key="icon.id"
        type="button"
        class="miraicms-form-icon-picker__choice"
        :class="{ 'is-active': icon.id === props.modelValue }"
        :aria-label="icon.label"
        @click="choose(icon.id)"
      >
        <span v-html="icon.svg" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;

.miraicms-form-icon-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: math-rem(4);
  min-width: 0;

  &.is-compact {
    width: math-rem(36);
  }

  &__label {
    font-size: math-rem(13);
    font-weight: 600;
  }

  &__trigger,
  &__choice {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    color: $color-ink;
    cursor: pointer;
  }

  &__trigger {
    width: math-rem(36);
    height: math-rem(36);
    padding: 0;
  }

  &__empty {
    color: $color-muted;
    font-size: math-rem(12);
  }

  &__preview,
  &__choice span {
    display: flex;
    width: math-rem(16);
    height: math-rem(16);

    :deep(svg) {
      width: 100%;
      height: 100%;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(6, math-rem(32));
    gap: math-rem(4);
  }

  &.is-compact &__grid {
    position: absolute;
    z-index: 3;
    padding: math-rem(6);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    box-shadow: $shadow-md;
  }

  &__choice {
    width: math-rem(32);
    height: math-rem(32);
    padding: 0;

    &.is-active {
      border-color: $color-accent;
      background: $color-accent-wash;
      color: $color-accent;
    }
  }
}
</style>
