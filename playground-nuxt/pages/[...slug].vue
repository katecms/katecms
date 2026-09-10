<script setup lang="ts">
const { entry, link, preview } = await getCollection()
</script>

<template>
  <div>
    <p
      v-if="preview"
      style="color: #c4851a"
    >
      Preview
    </p>
    <h1>{{ entry?.title }}</h1>
    <p>
      <NuxtLink :to="link || '/'">
        {{ link }}
      </NuxtLink>
    </p>
    <pre>{{ entry?.fields }}</pre>
  </div>
</template>
