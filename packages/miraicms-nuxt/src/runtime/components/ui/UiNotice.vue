<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'

type UiNoticeVariant = 'success' | 'warning' | 'danger'

const DISMISS_MS = 3000

const props = withDefaults(defineProps<{
  variant?: UiNoticeVariant
  message?: string
}>(), {
  variant: 'success',
  message: '',
})

const emit = defineEmits<{
  close: []
}>()

const rootClass = 'miraicms-notice'

const live = computed(() => (props.variant === 'danger' ? 'assertive' : 'polite'))

let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  timer = setTimeout(() => emit('close'), DISMISS_MS)
})

onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      :class="[rootClass, `${rootClass}--${variant}`]"
      role="status"
      :aria-live="live"
    >
      <p :class="`${rootClass}__text`">
        <slot>{{ message }}</slot>
      </p>
      <button
        type="button"
        :class="`${rootClass}__close`"
        aria-label="Close"
        @click="emit('close')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"
          />
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-notice';

@include miraicms-wrapper {
  #{$root} {
    position: fixed;
    top: calc(#{$topbar-h} + #{math-rem(12)});
    right: math-rem(16);
    z-index: 2000;
    display: flex;
    align-items: flex-start;
    gap: math-rem(12);
    width: min(math-rem(360), calc(100vw - #{math-rem(32)}));
    padding: math-rem(12) math-rem(12) math-rem(12) math-rem(14);
    border: 1px solid;
    border-radius: $border-radius;
    box-shadow: $shadow-md;
    font-size: math-rem(14);
    line-height: 1.45;

    &--success {
      background: $color-success-bg;
      border-color: $color-success;
      color: $color-success;
    }

    &--warning {
      background: $color-warning-bg;
      border-color: $color-warning;
      color: $color-warning;
    }

    &--danger {
      background: $color-danger-bg;
      border-color: $color-danger;
      color: $color-danger;
    }

    &__text {
      flex: 1 1 auto;
      margin: 0;
      min-width: 0;
    }

    &__close {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: math-rem(28);
      height: math-rem(28);
      margin: math-rem(-4) math-rem(-4) 0 0;
      padding: 0;
      border: 0;
      border-radius: $border-radius-inter;
      background: transparent;
      color: inherit;
      cursor: pointer;

      svg {
        display: block;
        width: 14px;
        height: 14px;
        max-width: none;
      }

      &:hover {
        background: rgba(20, 26, 42, 0.06);
      }

      &:focus {
        outline: none;
      }

      &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 1px;
      }
    }
  }
}
</style>
