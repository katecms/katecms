<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'
import SeoEditor from './SeoEditor.vue'

const route = useRoute()
const rootClass = 'miraicms-seo-panel'
const entryId = computed(() => {
  const id = Number(route.params.id)
  return Number.isInteger(id) && id > 0 ? id : 0
})
</script>

<template>
  <div :class="rootClass">
    <div
      v-if="!entryId"
      :class="`${rootClass}__hint`"
    >
      Save the entry before editing its SEO.
    </div>
    <SeoEditor
      v-else
      :url="`/api/_miraicms/seo/entries/${entryId}`"
    />
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;

$root: '.miraicms-seo-panel';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(16);
  margin: 0;
  padding: 0 math-rem(8);

  &__hint {
    margin: 0 math-rem(16) math-rem(12);
    color: $color-muted;
    font-size: math-rem(13);
  }
}
</style>
