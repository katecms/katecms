<script setup lang="ts">
import { useHead } from '#imports'
import { useAuth } from '../composables/useAuth'

useHead({
  bodyAttrs: {
    id: 'miraicms-body',
  },
  titleTemplate: title => title ? `${title} - MiraiCMS` : 'MiraiCMS',
})

const rootClass = 'miraicms'
const { user, logout, loggingOut } = useAuth()
</script>

<template>
  <div :class="[rootClass]">
    <div :class="[`${rootClass}-header`]">
      <button
        v-if="user"
        type="button"
        :class="[`${rootClass}-header-logout`]"
        :disabled="loggingOut"
        @click="logout"
      >
        {{ loggingOut ? 'Выхожу…' : 'Выйти' }}
      </button>
    </div>

    <div :class="[`${rootClass}-sidebar`]">
      <!--      <NuxtCmsAppSidebar /> -->
    </div>

    <div :class="[`${rootClass}-main`]">
      <div :class="[`${rootClass}-main-wrapper`]">
        <NuxtPage />
      </div>
    </div>

    <!--    <NuxtCmsIndexSyncModal /> -->
  </div>
</template>

<style lang="scss">
@use "../assets/styles" as *;

body#miraicms-body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  font-family: system-ui, sans-serif;
  font-size: math-rem(15);
  font-weight: 400;
  font-style: normal;
  font-variant: normal;
  font-stretch: normal;
  line-height: 1.5;
  letter-spacing: normal;
  word-spacing: normal;
  text-align: start;
  text-indent: 0;
  text-transform: none;
  text-shadow: none;
  text-rendering: optimizeLegibility;
  color: $color-ink;
  background-color: $color-surface;
  background-image: none;
  caret-color: $color-ink;
  accent-color: $color-accent;
  color-scheme: light;
  tab-size: 4;
  hyphens: none;
  word-break: normal;
  overflow-wrap: break-word;
  direction: ltr;
  margin: 0;
  padding: 0;
  border: 0;
  min-height: 100%;
  overflow: hidden;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: $color-muted transparent;
    font-family: inherit;
  }

  img,
  svg,
  video,
  canvas {
    max-width: 100%;
    height: auto;
  }
}

html:has(> body#miraicms-body) {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>

<style scoped lang="scss">
@use "../assets/styles" as *;

$root: '.miraicms';

#{$root} {
  display: grid;
  grid-template-columns: $sidebar-w 1fr;
  grid-template-rows: auto 1fr;
  gap: 0;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  width: 100%;
  height: 100vh;

  &-header {
    grid-area: header;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 math-rem(12);
    border-bottom: 1px solid $color-border;
    box-shadow: $shadow-sm;
    min-height: $topbar-h;

    &-logout {
      padding: math-rem(6) math-rem(12);
      border: 1px solid $color-border;
      border-radius: math-rem(6);
      background: $color-bg;
      color: $color-ink;
      font: inherit;
      font-size: math-rem(13);
      cursor: pointer;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }

  &-sidebar {
    grid-area: sidebar;
    border-right: 1px solid $color-border;
    background-color: $color-bg;
  }

  &-main {
    grid-area: main;
    overflow: auto;
    min-height: 0;

    &-wrapper {
      padding: math-rem(8);
    }
  }
}
</style>
