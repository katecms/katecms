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
      <MiraiCmsAppMenu />
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
      overflow: auto;
      min-height: 0;

      &-wrapper {
        padding: math-rem(8);
      }
    }
  }
}
</style>
