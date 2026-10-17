<script setup lang="ts">
import { computed } from 'vue'
import { useRuntimeConfig, useHead } from '#imports'
import { useCmsPaths } from '../../composables/useCmsPaths'
import type { PublicCollectionNav } from '../../utils/collections'
import type { PublicDictionaryNav } from '../../utils/dictionaries'
import type { PublicOptionNav } from '../../utils/options'

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
const dictionaries = computed(() => {
  const map = (useRuntimeConfig().public.miraicms?.dictionaries ?? {}) as Record<string, PublicDictionaryNav>
  return Object.entries(map).map(([slug, def]) => ({
    slug,
    label: def.labels?.name || slug,
    singular: def.labels?.singularName || def.labels?.name || slug,
  }))
})
const optionPages = computed(() => {
  const map = (useRuntimeConfig().public.miraicms?.options ?? {}) as Record<string, PublicOptionNav>
  return Object.entries(map).map(([slug, def]) => ({
    slug,
    label: def.label || slug,
  }))
})
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsAdminHeader title="Dashboard" />

    <div
      v-if="!collections.length"
      :class="`${rootClass}__empty`"
    >
      No collections are defined in the CMS config.
    </div>

    <div
      v-else
      :class="`${rootClass}__list`"
    >
      <div
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
      </div>
    </div>

    <template v-if="dictionaries.length">
      <MiraiCmsAdminHeader title="Dictionaries" />
      <div :class="`${rootClass}__list`">
        <div
          v-for="item in dictionaries"
          :key="item.slug"
        >
          <NuxtLink
            :class="`${rootClass}__card`"
            :to="paths.dictionary(item.slug)"
          >
            <span :class="`${rootClass}__card-title`">{{ item.label }}</span>
            <span :class="`${rootClass}__card-meta`">{{ item.slug }}</span>
          </NuxtLink>
        </div>
      </div>
    </template>

    <template v-if="optionPages.length">
      <MiraiCmsAdminHeader title="Options" />
      <div :class="`${rootClass}__list`">
        <div
          v-for="item in optionPages"
          :key="item.slug"
        >
          <NuxtLink
            :class="`${rootClass}__card`"
            :to="paths.option(item.slug)"
          >
            <span :class="`${rootClass}__card-title`">{{ item.label }}</span>
            <span :class="`${rootClass}__card-meta`">{{ item.slug }}</span>
          </NuxtLink>
        </div>
      </div>
    </template>
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
    padding: math-rem(8);

    &__empty {
      margin: 0;
      color: $color-muted;
    }

    &__list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(math-rem(220), 1fr));
      gap: math-rem(12);
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

      &-title {
        font-weight: 600;
      }

      &-meta {
        font-size: math-rem(12);
        color: $color-muted;
      }
    }
  }
}
</style>
