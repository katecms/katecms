<script setup lang="ts">
import { useHead } from '#imports'

useHead({
  bodyAttrs: {
    id: 'miraicms-body',
  },
  titleTemplate: title => title ? `${title} - MiraiCMS` : 'MiraiCMS',
})

const rootClass = 'miraicms'
</script>

<template>
  <div :class="[rootClass]">
    <div :class="[`${rootClass}-header`]">
      <!--      <NuxtCmsAppHeader /> -->
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
    scrollbar-color: $color-accent transparent;
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
    border-bottom: 1px solid $color-border;
    box-shadow: $shadow-sm;
    min-height: $topbar-h;
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
