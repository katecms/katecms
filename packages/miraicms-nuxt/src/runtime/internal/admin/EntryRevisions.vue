<script setup lang="ts">
import { collectionStatusLabel } from '../../utils/collections'
import type { EntryRevisionItem } from '../../utils/collections'

defineProps<{
  items: EntryRevisionItem[]
  loading?: boolean
  error?: string
  canRestore?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  restore: [id: number]
}>()

const rootClass = 'miraicms-entry-revisions'

function when(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__title`">
      Revisions
    </div>
    <p :class="`${rootClass}__hint`">
      A revision is saved each time this entry changes.
    </p>
    <p
      v-if="loading"
      :class="`${rootClass}__hint`"
    >
      Loading…
    </p>
    <p
      v-else-if="error"
      :class="`${rootClass}__hint`"
    >
      {{ error }}
    </p>
    <p
      v-else-if="!items.length"
      :class="`${rootClass}__hint`"
    >
      No revisions yet.
    </p>
    <ul
      v-else
      :class="`${rootClass}__list`"
    >
      <li
        v-for="item in items"
        :key="item.id"
        :class="`${rootClass}__item`"
      >
        <div :class="`${rootClass}__when`">
          {{ when(item.createdAt) }}
        </div>
        <div :class="`${rootClass}__meta`">
          {{ item.authorName }}
        </div>
        <div :class="`${rootClass}__summary`">
          {{ item.title }} · {{ collectionStatusLabel(item.status) }}
        </div>
        <MiraiCmsUiButton
          v-if="canRestore"
          tag="button"
          type="button"
          :variant="['secondary', 'small']"
          :disabled="disabled"
          :aria-label="`Restore revision from ${when(item.createdAt)}`"
          @click="emit('restore', item.id)"
        >
          Restore
        </MiraiCmsUiButton>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-entry-revisions';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);

    &__title {
      margin: 0;
      font-size: math-rem(14);
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: $color-ink;
    }

    &__hint,
    &__meta,
    &__summary {
      margin: 0;
      color: $color-muted;
      font-size: math-rem(13);
      line-height: 1.4;
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: math-rem(12);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    &__item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: math-rem(2);
    }

    &__when {
      font-size: math-rem(13);
      font-weight: 600;
    }
  }
}
</style>
