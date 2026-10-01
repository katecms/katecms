<script setup>
import { computed } from 'vue'

const data = await getCollection()
const ready = !Array.isArray(data)

const entry = computed(() => ready ? data.entry.value : null)
const entries = computed(() => ready ? data.entries.value : [])
const isArchive = computed(() => ready ? data.isArchive.value : false)
const collection = computed(() => ready ? data.collection.value : null)
const link = computed(() => ready ? data.link.value : null)
const permalink = ready ? data.permalink : () => null
const preview = computed(() => ready ? data.preview.value : false)

useMiraiSeoHead(computed(() => ({
  title: isArchive.value ? collection.value?.labels?.name : entry.value?.title,
  entryId: isArchive.value ? null : entry.value?.id,
  path: link.value,
  isArchive: isArchive.value,
})))
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
