<script setup lang="ts">
const {
  entry,
  entries,
  isArchive,
  collection,
  link,
  permalink,
  preview,
} = await getCollection()
</script>

<template>
  <div>
    <p
      v-if="preview"
      style="color: #c4851a"
    >
      Preview
    </p>
    <template v-if="isArchive">
      <h1>{{ collection?.labels.name }}</h1>
      <p>
        <NuxtLink :to="link || '/'">
          {{ link }}
        </NuxtLink>
      </p>
      <ul>
        <li
          v-for="item in entries"
          :key="item.id"
        >
          <NuxtLink :to="permalink?.(item) || '/'">
            {{ item.title }}
          </NuxtLink>
        </li>
      </ul>
    </template>
    <template v-else>
      <h1>{{ entry?.title }}</h1>
      <p>
        <NuxtLink :to="link || '/'">
          {{ link }}
        </NuxtLink>
      </p>
      <pre>{{ entry }}</pre>
    </template>
  </div>
</template>
