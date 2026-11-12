<script setup lang="ts">
defineProps<{
  title: string
  /** When set, a back button is shown before the title. */
  backTo?: string
  /** Secondary line under the title. */
  meta?: string
  /** Shown after the title, for example a result count. */
  count?: string | number
}>()

const rootClass = 'katecms-admin-header'
</script>

<template>
  <div :class="rootClass">
    <KateCmsUiButton
      v-if="backTo"
      tag="a"
      :variant="['secondary', 'icon']"
      :link="{ url: backTo, title: 'Back' }"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 640 640"
      ><path
        d="M73 297a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L173 352h371a32 32 0 1 0 0-64H173l106-105a32 32 0 0 0-46-46z"
        fill="currentColor"
      /></svg>
    </KateCmsUiButton>

    <div :class="`${rootClass}__main`">
      <div :class="`${rootClass}__title`">
        {{ title }}
        <span
          v-if="count != null && count !== ''"
          :class="`${rootClass}__count`"
        >{{ count }}</span>
      </div>
      <div
        v-if="meta"
        :class="`${rootClass}__meta`"
      >
        {{ meta }}
      </div>
    </div>

    <div
      v-if="$slots.default"
      :class="`${rootClass}__actions`"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-admin-header';

@include katecms-wrapper {
  #{$root} {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: math-rem(16);
    min-width: 0;
    padding: math-rem(8) 0;
    background: $color-surface;

    &__main {
      display: flex;
      flex-direction: column;
      gap: math-rem(4);
      min-width: 0;
    }

    &__title {
      display: flex;
      align-items: baseline;
      gap: math-rem(8);
      font-size: math-rem(18);
      font-weight: 600;
    }

    &__count {
      color: $color-muted;
      font-size: math-rem(16);
      font-weight: 400;
    }

    &__meta {
      font-size: math-rem(13);
      color: $color-muted;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: math-rem(8);
      margin-left: auto;
    }
  }
}
</style>
