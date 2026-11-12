<script setup lang="ts">
import { computed } from 'vue'
import { useCookie, useHead, useRoute } from '#imports'
import { useCmsPaths } from '../composables/useCmsPaths'

type ThemeMode = 'system' | 'light' | 'dark'

const themeOrder: ThemeMode[] = ['system', 'light', 'dark']

const theme = useCookie<ThemeMode>('katecms-theme', {
  default: () => 'system',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
  watch: true,
})

const themeMode = computed<ThemeMode>(() => themeOrder.includes(theme.value) ? theme.value : 'system')

const themeClass = computed(() => themeMode.value === 'system' ? '' : `katecms-theme-${themeMode.value}`)

const themeLabel = computed(() => {
  if (themeMode.value === 'light') {
    return 'Light theme. Switch to dark'
  }
  if (themeMode.value === 'dark') {
    return 'Dark theme. Switch to system'
  }
  return 'System theme. Switch to light'
})

useHead(() => ({
  bodyAttrs: {
    id: 'katecms-body',
    class: themeClass.value,
  },
  titleTemplate: (title?: string) => title ? `${title} - KateCMS` : 'KateCMS',
}))

function cycleTheme() {
  const index = themeOrder.indexOf(themeMode.value)
  theme.value = themeOrder[(index + 1) % themeOrder.length] ?? 'system'
}

const route = useRoute()
const paths = useCmsPaths()
const rootClass = 'katecms'
const isAuthPage = computed(() => {
  const path = route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path
  return path === paths.login || path === paths.register
})

const sidebarHidden = useCookie<boolean>('katecms-sidebar-hidden', {
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
      <KateCmsUiButton
        tag="button"
        :class="`${rootClass}-sidebar-toggle`"
        :variant="['tertiary', 'icon']"
        :title="sidebarHidden ? 'Show sidebar' : 'Hide sidebar'"
        :aria-label="sidebarHidden ? 'Show sidebar' : 'Hide sidebar'"
        :aria-expanded="sidebarHidden ? 'false' : 'true'"
        aria-controls="katecms-sidebar"
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
        </svg>
      </KateCmsUiButton>
      <KateCmsUiButton
        tag="button"
        :class="`${rootClass}-theme-toggle`"
        :variant="['tertiary', 'icon']"
        :title="themeLabel"
        :aria-label="themeLabel"
        @click="cycleTheme"
      >
        <svg
          v-if="themeMode === 'system'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="3.75"
            y="4.75"
            width="16.5"
            height="11.5"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            d="M8.5 19.75h7M12 16.25v3.5"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <svg
          v-else-if="themeMode === 'light'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="4"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M16.2 14.8A6.2 6.2 0 0 1 9.4 4.6 6.4 6.4 0 1 0 16.2 14.8Z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
      </KateCmsUiButton>
      <KateCmsAppUser />
    </div>

    <div
      id="katecms-sidebar"
      :class="[`${rootClass}-sidebar`]"
      :inert="sidebarHidden || undefined"
      :aria-hidden="sidebarHidden ? 'true' : undefined"
    >
      <div :class="[`${rootClass}-sidebar-wrap`]">
        <KateCmsAppMenu />
      </div>
    </div>

    <div :class="[`${rootClass}-main`]">
      <NuxtPage />
    </div>
  </div>
</template>

<style lang="scss">
@use "../assets/styles" as *;

@include katecms-document;
</style>

<style scoped lang="scss">
@use "../assets/styles" as *;

$root: '.katecms';

@include katecms-wrapper {
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
      transition: grid-template-columns .3s ease;
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

      :deep(.katecms-btn.katecms-sidebar-toggle) {
        margin-right: auto;
        color: $color-ink;
      }

      :deep(.katecms-btn.katecms-theme-toggle) {
        color: $color-ink;
      }
    }

    &-sidebar {
      grid-area: sidebar;
      min-width: 0;
      overflow: hidden;
      border-right: 1px solid $color-border;
      background-color: $color-bg;

      &-wrap {
        width: $sidebar-w;
        min-height: 100%;
      }
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
