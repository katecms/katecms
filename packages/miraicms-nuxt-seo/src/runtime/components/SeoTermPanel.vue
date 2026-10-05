<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'
import SeoEditor from './SeoEditor.vue'

const route = useRoute()
const rootClass = 'miraicms-seo-panel'
const termId = computed(() => {
  const id = Number(route.params.id)
  return Number.isInteger(id) && id > 0 ? id : 0
})
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__title`">
      SEO
    </div>
    <div
      v-if="!termId"
      :class="`${rootClass}__hint`"
    >
      Save the term before editing its SEO.
    </div>
    <SeoEditor
      v-else
      :url="`/api/_miraicms/seo/terms/${termId}`"
      :padded="false"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../assets/styles" as *;

$root: '.miraicms-seo-panel';

#{$root} {
  margin: math-rem(20) 0 0;
  padding: math-rem(20) 0 0;
  border-top: 1px solid $color-border;

  &__title {
    padding: 0 0 math-rem(12);
    font-size: math-rem(12);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #6b7280;
  }

  &__hint {
    margin: 0 0 math-rem(12);
    color: $color-muted;
    font-size: math-rem(13);
  }
}
</style>
