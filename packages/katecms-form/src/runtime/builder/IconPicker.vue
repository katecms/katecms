<script setup lang="ts">
import { ref } from 'vue'
import { STEP_ICONS, stepIconSvg } from '../form/icons'

const rootClass = 'katecms-form-icon-picker'


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
    :class="[rootClass, { 'is-compact': compact }]"
  >
    <span
      v-if="!compact"
      :class="`${rootClass}__label`"
    >{{ label }}</span>
    <button
      type="button"
      :class="`${rootClass}__trigger`"
      :aria-label="compact ? label : undefined"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span
        v-if="stepIconSvg(modelValue)"
        :class="`${rootClass}__preview`"
        v-html="stepIconSvg(modelValue)"
      />
      <span
        v-else
        :class="`${rootClass}__empty`"
      >{{ compact ? '' : 'None' }}</span>
    </button>
    <div
      v-if="open"
      :class="`${rootClass}__grid`"
    >
      <button
        type="button"
        :class="[`${rootClass}__choice`, { 'is-active': !modelValue }]"
        aria-label="No icon"
        @click="choose('')"
      >
        <span>—</span>
      </button>
      <button
        v-for="icon in STEP_ICONS"
        :key="icon.id"
        type="button"
        :class="[`${rootClass}__choice`, { 'is-active': icon.id === props.modelValue }]"
        :aria-label="icon.label"
        @click="choose(icon.id)"
      >
        <span v-html="icon.svg" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "katecms/styles" as *;
$root: '.katecms-form-icon-picker';


#{$root} {
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
  &.is-compact {
    #{$root}__grid {
      position: absolute;
      z-index: 3;
      padding: math-rem(6);
      border: 1px solid $color-border;
      border-radius: $border-radius;
      background: $color-surface;
      box-shadow: $shadow-md;
    }
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
