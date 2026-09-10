<script setup lang="ts">
import { computed } from 'vue'
import { useRuntimeConfig, useHead } from '#imports'
import { useCmsPaths } from '../../composables/useCmsPaths'
import type { PublicCollectionNav } from '../../utils/collections'

useHead({ title: 'Dashboard' })

const rootClass = 'miraicms-dashboard'
const paths = useCmsPaths()
const collections = computed(() => {
  const map = (useRuntimeConfig().public.miraicms?.collections ?? {}) as Record<string, PublicCollectionNav>
  return Object.entries(map).map(([slug, def]) => ({
    slug,
    label: def.labels?.name || slug,
    singular: def.labels?.singularName || def.labels?.name || slug,
  }))
})
</script>

<template>
  <div :class="rootClass">
    <header :class="`${rootClass}__head`">
      <div :class="`${rootClass}__head-title`">
        Dashboard
      </div>
    </header>

    <p
      v-if="!collections.length"
      :class="`${rootClass}__empty`"
    >
      No collections are defined in the CMS config.
    </p>

    <ul
      v-else
      :class="`${rootClass}__list`"
    >
      <li
        v-for="item in collections"
        :key="item.slug"
      >
        <NuxtLink
          :class="`${rootClass}__card`"
          :to="paths.collection(item.slug)"
        >
          <span :class="`${rootClass}__card-title`">{{ item.label }}</span>
          <span :class="`${rootClass}__card-meta`">{{ item.slug }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-dashboard';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);

    &__head-title {
      font-size: math-rem(18);
      font-weight: 600;
    }

    &__empty {
      margin: 0;
      color: $color-muted;
    }

    &__list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(math-rem(220), 1fr));
      gap: math-rem(12);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    &__card {
      display: flex;
      flex-direction: column;
      gap: math-rem(4);
      padding: math-rem(16);
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
      text-decoration: none;
      color: inherit;
      box-shadow: $shadow-sm;

      &:hover {
        border-color: $color-accent;
      }
    }

    &__card-title {
      font-weight: 600;
    }

    &__card-meta {
      font-size: math-rem(12);
      color: $color-muted;
    }
  }
}
</style>
