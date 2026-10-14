<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
</script>

<template>
  <main>
    <MiraiCmsForm :form="slug" />
  </main>
</template>
