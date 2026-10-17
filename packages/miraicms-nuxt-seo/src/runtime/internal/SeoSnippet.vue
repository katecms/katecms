<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  description: string
  url: string
}>()

const rootClass = 'miraicms-seo-snippet'
const shownTitle = computed(() => props.title.trim() || 'Untitled')

const crumbs = computed(() => {
  let host = ''
  let path = props.url
  try {
    const parsed = new URL(props.url)
    host = parsed.host
    path = parsed.pathname
  }
  catch {
    path = props.url
  }
  return [host, ...path.split('/').filter(Boolean)].filter(Boolean)
})
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__url`">
      <span
        v-for="(part, index) in crumbs"
        :key="`${part}-${index}`"
      >
        <span
          v-if="index > 0"
          :class="`${rootClass}__sep`"
        > › </span>
        <span :class="{ [`${rootClass}__host`]: index === 0 }">{{ part }}</span>
      </span>
    </div>
    <a
      :class="`${rootClass}__title`"
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ shownTitle }}
    </a>
    <div :class="`${rootClass}__description`">
      {{ description }}
    </div>
    <div :class="`${rootClass}__meters`">
      <span :class="{ [`${rootClass}__over`]: shownTitle.length > 60 }">
        Title {{ shownTitle.length }}/60
      </span>
      <span :class="{ [`${rootClass}__over`]: description.length > 160 }">
        Description {{ description.length }}/160
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;

$root: '.miraicms-seo-snippet';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(4);
  padding: math-rem(12) math-rem(14);
  border: 1px solid $color-border;
  border-radius: math-rem(8);
  background: $color-surface;
  font-family: Arial, Helvetica, sans-serif;

  &__url {
    color: #4d5156;
    font-size: math-rem(14);
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  &__host {
    color: #202124;
  }

  &__sep {
    color: #4d5156;
  }

  &__title {
    color: #1a0dab;
    font-size: math-rem(20);
    line-height: 1.3;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__description {
    margin: 0;
    color: #4d5156;
    font-size: math-rem(14);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  &__meters {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(12);
    margin-top: math-rem(4);
    color: $color-muted;
    font-family: inherit;
    font-size: math-rem(12);
  }

  &__over {
    color: $color-danger;
  }
}
</style>
