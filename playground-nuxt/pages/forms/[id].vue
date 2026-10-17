<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()
const id = computed(() => Number(route.params.id))
</script>

<template>
  <main>
    <MiraiCmsForm :form="id" />
  </main>
</template>
