<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const rootClass = 'katecms-option-popup'


const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{
  title?: string
}>(), {
  title: 'Options',
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
  }
}

watch(open, (value) => {
  if (typeof document === 'undefined') {
    return
  }
  if (value) {
    document.addEventListener('keydown', onKeydown)
  }
  else {
    document.removeEventListener('keydown', onKeydown)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      :class="`${rootClass}__overlay`"
      @click.self="open = false"
    >
      <div
        :class="rootClass"
        role="dialog"
        aria-modal="true"
      >
        <div :class="`${rootClass}__head`">
          <span :class="`${rootClass}__title`">{{ title }}</span>
          <KateCmsUiButton
            tag="button"
            :variant="['secondary', 'small', 'icon']"
            @click="open = false"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.13379 2.07031L13.8671 13.9316"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M13.8671 2.07031L2.13379 13.9316"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </KateCmsUiButton>
        </div>
        <div :class="`${rootClass}__body`">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "katecms/styles" as *;
$root: '.katecms-option-popup';


#{$root} {
  display: flex;
  flex-direction: column;
  width: min(math-rem(1300), 100%);
  max-height: min(math-rem(900), 100%);
  background: $color-surface;
  border-radius: $border-radius;
  box-shadow: $shadow-md;

  &__overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: math-rem(16);
    background-color: $color-overlay;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(12);
    padding: math-rem(14) math-rem(16);
    border-bottom: 1px solid $color-border;
  }

  &__title {
    font-size: math-rem(16);
    font-weight: 600;
  }

  &__body {
    overflow: auto;
    padding: math-rem(16);
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
  }
}
</style>
