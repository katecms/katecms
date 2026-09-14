<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRuntimeConfig } from '#imports'
import { useCmsPaths } from '../../composables/useCmsPaths'
import type { PublicCollectionNav } from '../../utils/collections'
import type { PublicDictionaryNav } from '../../utils/dictionaries'

const rootClass = 'miraicms-menu'
const route = useRoute()
const paths = useCmsPaths()
const runtimeConfig = useRuntimeConfig()

type MenuItem = {
  key: string
  label: string
  to: string
  icon: string
  active: boolean
}

const DASHBOARD_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4V4Zm9 0h7v5h-7V4ZM4 13h7v7H4v-7Zm9 7v-9h7v9h-7Z" stroke="currentColor" stroke-width="1.6"/></svg>'
const COLLECTION_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.6"/></svg>'
const DICTIONARY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M7 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.6"/><path d="M9 8h6M9 12h6" stroke="currentColor" stroke-width="1.6"/></svg>'
const MEDIA_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="m3 16 5-5 4 4 3-3 6 6" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="9" r="1.4" fill="currentColor"/></svg>'
const USERS_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M4 19c0-2.8 2.2-5 5-5h0c2.8 0 5 2.2 5 5" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="9" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M16.2 14.2c2.2.4 3.8 2.3 3.8 4.8" stroke="currentColor" stroke-width="1.6"/></svg>'

function isSvgIcon(value?: string): boolean {
  return typeof value === 'string' && /^\s*<svg[\s>]/i.test(value)
}

/** Dashboard is exact (`/admin`); everything else matches nested routes too. */
function isActive(to: string, exact = false) {
  const path = route.path.replace(/\/$/, '') || '/'
  const target = to.replace(/\/$/, '') || '/'
  if (path === target) {
    return true
  }
  return !exact && path.startsWith(`${target}/`)
}

const items = computed<MenuItem[]>(() => {
  const collections = (runtimeConfig.public.miraicms?.collections ?? {}) as Record<string, PublicCollectionNav>
  const collectionItems = Object.entries(collections).map(([slug, def]) => {
    const to = paths.collection(slug)
    return {
      key: `collection:${slug}`,
      label: def.labels?.name || slug,
      to,
      icon: isSvgIcon(def.icon) ? def.icon! : COLLECTION_ICON,
      active: isActive(to),
    }
  })

  const dictionaries = (runtimeConfig.public.miraicms?.dictionaries ?? {}) as Record<string, PublicDictionaryNav>
  const dictionaryItems = Object.entries(dictionaries).map(([slug, def]) => {
    const to = paths.dictionary(slug)
    return {
      key: `dictionary:${slug}`,
      label: def.labels?.name || slug,
      to,
      icon: DICTIONARY_ICON,
      active: isActive(to),
    }
  })

  return [
    {
      key: 'dashboard',
      label: 'Dashboard',
      to: paths.admin,
      icon: DASHBOARD_ICON,
      active: isActive(paths.admin, true),
    },
    {
      key: 'media',
      label: 'Media',
      to: paths.media,
      icon: MEDIA_ICON,
      active: isActive(paths.media),
    },
    ...collectionItems,
    ...dictionaryItems,
    {
      key: 'users',
      label: 'Users',
      to: paths.users,
      icon: USERS_ICON,
      active: isActive(paths.users),
    },
  ]
})
</script>

<template>
  <div :class="rootClass">
    <!--    <NuxtLink
      :class="`${rootClass}__logo`"
      :to="paths.admin"
    >
      <img
        src="../../assets/img/miraicms-logo.svg"
        alt="MiraiCMS"
      >
    </NuxtLink> -->

    <div :class="`${rootClass}__wrap`">
      <NuxtLink
        v-for="item in items"
        :key="item.key"
        :to="item.to"
        :class="[`${rootClass}__link`, { 'is-active': item.active }]"
      >
        <span
          :class="`${rootClass}__icon`"
          aria-hidden="true"
          v-html="item.icon"
        />
        <span :class="`${rootClass}__label`">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-menu';

@include miraicms-wrapper {
  #{$root} {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: $color-bg;

    &__wrap {
      flex-grow: 1;
      overflow: auto;
      display: flex;
      flex-direction: column;
      padding: math-rem(8);
      gap: math-rem(2);
    }

    &__link {
      display: flex;
      align-items: center;
      gap: math-rem(8);
      padding: math-rem(8) math-rem(10);
      border-radius: $border-radius-inter;
      color: $color-ink;
      text-decoration: none;
      font-size: math-rem(14);

      &:hover {
        background: $color-accent-wash;
      }

      &.is-active {
        background: $color-accent-wash;
        color: $color-accent;
        font-weight: 600;
      }
    }

    &__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: math-rem(18);
      height: math-rem(18);
      color: inherit;

      :deep(svg) {
        display: block;
        width: 100%;
        height: 100%;
        max-width: none;
      }
    }

    &__label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
