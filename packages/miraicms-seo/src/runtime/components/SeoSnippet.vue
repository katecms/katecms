<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  description: string
  url: string
  image?: string
}>()

const rootClass = 'miraicms-seo-snippet'
const shownTitle = computed(() => props.title.trim() || 'Untitled')
const shownUrl = computed(() => props.url.replace(/^https?:\/\//, ''))
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__copy`">
      <div :class="`${rootClass}__url`">
        {{ shownUrl }}
      </div>
      <div :class="`${rootClass}__title`">
        {{ shownTitle }}
      </div>
      <div :class="`${rootClass}__description`">
        {{ description }}
      </div>
    </div>
    <img
      v-if="image"
      :class="`${rootClass}__image`"
      :src="image"
      alt=""
    >
  </div>
</template>

<style scoped lang="scss">
@use "../assets/styles" as *;

$root: '.miraicms-seo-snippet';

#{$root} {
  display: flex;
  gap: math-rem(12);
  align-items: flex-start;
  padding: math-rem(12) math-rem(14);
  border: 1px solid $color-border;
  border-radius: math-rem(8);
  background: $color-surface;
  font-family: Arial, Helvetica, sans-serif;

  &__copy {
    min-width: 0;
    flex: 1;
  }

  &__image {
    width: math-rem(72);
    height: math-rem(72);
    flex: none;
    object-fit: cover;
    border-radius: math-rem(4);
    background: #f3f4f6;
  }

  &__url {
    overflow: hidden;
    color: #202124;
    font-size: math-rem(12);
    line-height: 1.3;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__title {
    display: -webkit-box;
    overflow: hidden;
    margin-top: math-rem(2);
    color: #1a0dab;
    font-size: math-rem(18);
    line-height: 1.3;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }

  &__description {
    display: -webkit-box;
    overflow: hidden;
    margin-top: math-rem(3);
    color: #4d5156;
    font-size: math-rem(13);
    line-height: 1.4;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
}
</style>
