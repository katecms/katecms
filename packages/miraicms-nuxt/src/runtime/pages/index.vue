<script setup lang="ts">
import { useHead, useRoute } from '#imports'
import { computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useCmsPaths } from '../composables/useCmsPaths'

useHead({
  bodyAttrs: {
    id: 'miraicms-body',
  },
  titleTemplate: title => title ? `${title} - MiraiCMS` : 'MiraiCMS',
})

const rootClass = 'miraicms'
const route = useRoute()
const paths = useCmsPaths()
const { user, logout, loggingOut } = useAuth()

const isFields = computed(() => route.path === paths.admin)
const isMedia = computed(() => route.path === paths.media || route.path.startsWith(`${paths.media}/`))
</script>

<template>
  <div :class="[rootClass]">
    <div :class="[`${rootClass}-header`]">
      <nav :class="[`${rootClass}-nav`]">
        <NuxtLink
          :to="paths.admin"
          :class="[`${rootClass}-nav__link`, { 'is-active': isFields }]"
        >
          Fields
        </NuxtLink>
        <NuxtLink
          :to="paths.media"
          :class="[`${rootClass}-nav__link`, { 'is-active': isMedia }]"
        >
          Media
        </NuxtLink>
      </nav>
      <MiraiCmsUiButton
        v-if="user"
        tag="button"
        variant="secondary"
        :disabled="loggingOut"
        @click="logout"
      >
        {{ loggingOut ? 'Signing out…' : 'Sign out' }}
      </MiraiCmsUiButton>
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
      justify-content: space-between;
      gap: math-rem(12);
      padding: 0 math-rem(12);
      border-bottom: 1px solid $color-border;
      box-shadow: $shadow-sm;
      min-height: $topbar-h;
    }

    &-nav {
      display: flex;
      align-items: center;
      gap: math-rem(4);

      &__link {
        padding: math-rem(6) math-rem(10);
        border-radius: $border-radius-inter;
        color: $color-muted;
        font-size: math-rem(14);
        font-weight: 500;
        text-decoration: none;

        &:hover {
          background: $color-bg;
          color: $color-ink;
        }

        &.is-active {
          background: $color-accent-wash;
          color: $color-accent;
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
}
</style>
