<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  title: string
  enabled?: boolean
  plain?: boolean
}>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
}>()

const open = ref(props.plain ? false : props.enabled)

watch(() => props.enabled, (value) => {
  if (props.plain) {
    return
  }
  open.value = value
})

function onCheck(event: Event) {
  const checked = event.target instanceof HTMLInputElement && event.target.checked
  emit('update:enabled', checked)
  open.value = checked
}

function toggle() {
  if (!props.plain && !props.enabled) {
    return
  }
  open.value = !open.value
}
</script>

<template>
  <div
    class="miraicms-option-accordion"
    :class="{ 'is-on': plain || enabled, 'is-open': (plain || enabled) && open }"
  >
    <div class="miraicms-option-accordion__bar">
      <input
        v-if="!plain"
        class="miraicms-option-accordion__check"
        type="checkbox"
        :checked="enabled"
        :aria-label="title"
        @change="onCheck"
      >
      <button
        type="button"
        class="miraicms-option-accordion__toggle"
        :disabled="!plain && !enabled"
        :aria-expanded="(plain || enabled) && open"
        @click="toggle"
      >
        <span>{{ title }}</span>
        <span class="miraicms-option-accordion__chevron" />
      </button>
    </div>
    <div
      v-if="(plain || enabled) && open"
      class="miraicms-option-accordion__body"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;

.miraicms-option-accordion {
  border: 1px solid $color-border;
  border-radius: $border-radius;
  background: $color-bg;

  &.is-on {
    background: $color-surface;
  }

  &.is-open {
    box-shadow: inset 3px 0 0 $color-accent;
  }

  &__bar {
    display: flex;
    align-items: center;
    gap: math-rem(8);
    min-height: math-rem(40);
    padding: 0 math-rem(10) 0 math-rem(12);
  }

  &__check {
    flex: 0 0 auto;
    margin: 0;
  }

  &__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(8);
    flex: 1;
    min-width: 0;
    padding: math-rem(8) 0;
    border: 0;
    background: transparent;
    color: $color-ink;
    font: inherit;
    font-size: math-rem(13);
    font-weight: 600;
    text-align: left;
    cursor: pointer;

    &:disabled {
      color: $color-muted;
      cursor: default;
    }
  }

  &__chevron {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-right: 2px solid $color-muted;
    border-bottom: 2px solid $color-muted;
    transform: rotate(45deg);
    transition: transform 0.15s ease;
  }

  &.is-open &__chevron {
    transform: rotate(-135deg);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: math-rem(10);
    padding: 0 math-rem(12) math-rem(12);
    border-top: 1px solid $color-border;
  }
}
</style>
