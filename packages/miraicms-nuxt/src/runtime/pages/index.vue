<script setup lang="ts">
import { computed } from 'vue'
import { useHead, useRoute } from '#imports'
import { useCmsPaths } from '../composables/useCmsPaths'

useHead({
  bodyAttrs: {
    id: 'miraicms-body',
  },
  titleTemplate: title => title ? `${title} - MiraiCMS` : 'MiraiCMS',
})

const route = useRoute()
const paths = useCmsPaths()
const rootClass = 'miraicms'
const isAuthPage = computed(() => {
  const path = route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path
  return path === paths.login || path === paths.register
})
</script>

<template>
  <NuxtPage v-if="isAuthPage" />
  <div
    v-else
    :class="[rootClass]"
  >
    <div :class="[`${rootClass}-header`]">
      <MiraiCmsAppUser />
    </div>

    <div :class="[`${rootClass}-sidebar`]">
      <MiraiCmsAppMenu />
    </div>

    <div :class="[`${rootClass}-main`]">
      <NuxtPage />
    </div>
  </div>
</template>

<style lang="scss">
@use "../assets/styles" as *;

@include miraicms-document;
</style>

<style scoped lang="scss">
@use "../assets/styles" as *;

$root: '.miraicms';

@include miraicms-wrapper {
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
      gap: math-rem(12);
      padding: 0 math-rem(12);
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
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }
  }
}
</style>
