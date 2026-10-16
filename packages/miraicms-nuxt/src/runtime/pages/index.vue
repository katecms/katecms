<script setup lang="ts">
import { computed } from 'vue'
import { useCookie, useHead, useRoute } from '#imports'
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

const sidebarHidden = useCookie<boolean>('miraicms-sidebar-hidden', {
  default: () => false,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
  watch: true,
})

function toggleSidebar() {
  sidebarHidden.value = !sidebarHidden.value
}
</script>

<template>
  <NuxtPage v-if="isAuthPage" />
  <div
    v-else
    :class="[rootClass, { 'is-sidebar-hidden': sidebarHidden }]"
  >
    <div :class="[`${rootClass}-header`]">
      <MiraiCmsUiButton
        tag="button"
        :class="`${rootClass}-sidebar-toggle`"
        :variant="['tertiary', 'icon']"
        :title="sidebarHidden ? 'Show sidebar' : 'Hide sidebar'"
        :aria-label="sidebarHidden ? 'Show sidebar' : 'Hide sidebar'"
        :aria-expanded="sidebarHidden ? 'false' : 'true'"
        aria-controls="miraicms-sidebar"
        @click="toggleSidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 4.75h14c.69 0 1.25.56 1.25 1.25v12c0 .69-.56 1.25-1.25 1.25H5c-.69 0-1.25-.56-1.25-1.25V6c0-.69.56-1.25 1.25-1.25Z"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            d="M9 4.75v14.5"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            v-if="!sidebarHidden"
            d="M5.15 6.35h3.2v11.3H5.5a.8.8 0 0 1-.8-.8V7.15a.8.8 0 0 1 .8-.8Z"
            fill="currentColor"
          />
        </svg>
      </MiraiCmsUiButton>
      <MiraiCmsAppUser />
    </div>

    <div
      id="miraicms-sidebar"
      :class="[`${rootClass}-sidebar`]"
      :inert="sidebarHidden || undefined"
      :aria-hidden="sidebarHidden ? 'true' : undefined"
    >
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
    grid-template-columns: $sidebar-w minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    gap: 0;
    grid-template-areas:
      "sidebar header"
      "sidebar main";
    width: 100%;
    height: 100vh;

    @media (prefers-reduced-motion: no-preference) {
      transition: grid-template-columns .6s ease;
    }

    &.is-sidebar-hidden {
      grid-template-columns: 0 minmax(0, 1fr);

      #{$root}-sidebar {
        border-right-width: 0;
      }
    }

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

      :deep(.miraicms-btn.miraicms-sidebar-toggle) {
        margin-right: auto;
        color: $color-ink;
      }
    }

    &-sidebar {
      grid-area: sidebar;
      min-width: 0;
      overflow: hidden;
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
