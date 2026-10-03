<script setup>
import { computed } from 'vue'

const data = await getCollection()
const ready = Boolean(data) && !Array.isArray(data)

const entry = computed(() => ready ? data.entry.value : null)
const entries = computed(() => ready ? data.entries.value : [])
const isArchive = computed(() => ready ? data.isArchive.value : false)
const isTerm = computed(() => ready ? data.isTerm.value : false)
const term = computed(() => ready ? data.term.value : null)
const collection = computed(() => ready ? data.collection.value : null)
const link = computed(() => ready ? data.link.value : null)
const permalink = ready ? data.permalink : () => null
const preview = computed(() => ready ? data.preview.value : false)
</script>

<template>
  <div>
    <p
      v-if="preview"
      style="color: #c4851a"
    >
      Preview
    </p>
    <template v-if="isTerm">
      <h1>{{ term?.title }}</h1>
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
          <NuxtLink :to="item.path || '/'">
            {{ item.title }}
          </NuxtLink>
        </li>
      </ul>
    </template>
    <template v-else-if="isArchive">
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
