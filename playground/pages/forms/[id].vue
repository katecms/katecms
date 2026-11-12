<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()
const id = computed(() => Number(route.params.id))
</script>

<template>
  <main>
    <KateCmsForm :form="id" />
  </main>
</template>
