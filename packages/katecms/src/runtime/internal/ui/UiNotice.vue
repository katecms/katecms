<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'

type UiNoticeVariant = 'success' | 'info' | 'warning' | 'danger'
type UiNoticePlacement = 'fixed' | 'static'

const DEFAULT_TIMEOUT_MS = 4000

const props = withDefaults(defineProps<{
  variant?: UiNoticeVariant
  message?: string
  /** Overlay toast (`fixed`) or in-flow banner (`static`). */
  placement?: UiNoticePlacement
  /**
   * Autoclose delay in ms. Applies only to `fixed`.
   * `0` or `false` disables the timer.
   */
  timeout?: number | false
  /** When `false`, the close button is hidden. */
  closable?: boolean
}>(), {
  variant: 'success',
  message: '',
  placement: 'fixed',
  timeout: DEFAULT_TIMEOUT_MS,
  closable: true,
})

const emit = defineEmits<{
  close: []
}>()

const rootClass = 'katecms-notice'

const isFixed = computed(() => props.placement === 'fixed')
const live = computed(() => (props.variant === 'danger' ? 'assertive' : 'polite'))

const timeoutMs = computed(() => {
  if (!isFixed.value || props.timeout === false) {
    return 0
  }
  const ms = Number(props.timeout)
  if (!Number.isFinite(ms) || ms <= 0) {
    return 0
  }
  return ms
})

let timer: ReturnType<typeof setTimeout> | undefined

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = undefined
  }
}

function startTimer() {
  clearTimer()
  if (timeoutMs.value <= 0) {
    return
  }
  timer = setTimeout(() => emit('close'), timeoutMs.value)
}

onMounted(startTimer)
watch(timeoutMs, startTimer)
onBeforeUnmount(clearTimer)
</script>

<template>
  <Teleport
    to="body"
    :disabled="!isFixed"
  >
    <div
      :class="[rootClass, `${rootClass}--${variant}`, `${rootClass}--${placement}`]"
      role="status"
      :aria-live="live"
    >
      <div
        :class="`${rootClass}__icon`"
        aria-hidden="true"
      >
        <svg
          v-if="variant === 'success'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <path d="M8 12.5l2.5 2.5 5.5-6" />
        </svg>
        <svg
          v-else-if="variant === 'info'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <path d="M12 11v6" />
          <path d="M12 8h.01" />
        </svg>
        <svg
          v-else-if="variant === 'warning'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
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
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <path d="M15 9l-6 6" />
          <path d="M9 9l6 6" />
        </svg>
      </div>
      <div :class="`${rootClass}__text`">
        <slot>{{ message }}</slot>
      </div>
      <button
        v-if="closable"
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

$root: '.katecms-notice';

@include katecms-wrapper {
  #{$root} {
    display: flex;
    align-items: flex-start;
    gap: math-rem(12);
    padding: math-rem(12) math-rem(12) math-rem(12) math-rem(14);
    border: 1px solid;
    border-radius: $border-radius;
    font-size: math-rem(14);
    line-height: 1.45;

    &--fixed {
      position: fixed;
      // top: calc(#{$topbar-h} + #{math-rem(12)});
      bottom: math-rem(12);
      right: math-rem(16);
      z-index: 10000;
      width: min(math-rem(360), calc(100vw - #{math-rem(32)}));
      box-shadow: $shadow-md;
    }

    &--static {
      position: static;
      width: 100%;
    }

    &--success {
      background: $color-success-bg;
      border-color: $color-success;
      color: $color-success;
    }

    &--info {
      background: $color-info-bg;
      border-color: $color-info;
      color: $color-info;
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

    &__icon {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: math-rem(28);
      height: math-rem(28);
      margin-top: math-rem(1);

      svg {
        display: block;
        width: 100%;
        height: 100%;
        max-width: none;
      }
    }

    &__text {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: math-rem(4);
      margin: 0;
      min-width: 0;
      font-weight: 600;
      align-self: center;

      :deep(div) {
        margin: 0;
      }
    }

    &__close {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: math-rem(28);
      height: math-rem(28);
      margin: 0;
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
