<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { $fetch, useHead, useRoute } from '#imports'
import type { FormSubmissionListItem } from '../../../form/model'
import { useFormPaths } from '../../../form/paths'

const rootClass = 'miraicms-form-entries'

const route = useRoute()
const paths = useFormPaths()
const formId = computed(() => Number(route.params.id))
const submissions = ref<FormSubmissionListItem[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

useHead({ title: 'Entries' })

function errMessage(err: unknown, fallback: string): string {
  const value = err as { statusMessage?: string, data?: { message?: string, statusMessage?: string } }
  return value.data?.statusMessage || value.data?.message || value.statusMessage || fallback
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString()
}

async function load(id: number) {
  loading.value = true
  error.value = ''
  submissions.value = []
  total.value = 0
  try {
    const result = await $fetch<{ submissions: FormSubmissionListItem[], total: number }>(`/api/_miraicms/forms/item/${id}/submissions`)
    submissions.value = result.submissions
    total.value = result.total
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load entries.')
  }
  finally {
    loading.value = false
  }
}

watch(formId, (id) => {
  if (Number.isInteger(id) && id > 0) {
    void load(id)
  }
}, { immediate: true })
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsAdminHeader
      title="Entries"
      :back-to="paths.edit(formId)"
      :count="loading ? undefined : total"
    />

    <MiraiCmsUiNotice
      v-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = ''"
    />

    <div
      v-if="loading"
      :class="`${rootClass}__hint`"
    >
      Loading…
    </div>
    <div
      v-else-if="!submissions.length"
      :class="`${rootClass}__hint`"
    >
      No entries yet.
    </div>
    <div
      v-else
      :class="`${rootClass}__table`"
    >
      <div
        :class="[`${rootClass}__row`, `${rootClass}__row--head`]"
        role="row"
      >
        <span role="columnheader">Received</span>
        <span role="columnheader">Preview</span>
        <span role="columnheader">Actions</span>
      </div>
      <div
        v-for="entry in submissions"
        :key="entry.id"
        :class="`${rootClass}__row`"
        role="row"
      >
        <span role="cell">{{ formatDate(entry.createdAt) }}</span>
        <span role="cell">{{ entry.preview || '—' }}</span>
        <span role="cell">
          <MiraiCmsUiButton
            tag="a"
            :variant="['secondary', 'small']"
            :link="{ url: paths.entry(formId, entry.id), title: 'Open' }"
          >
            Open
          </MiraiCmsUiButton>
        </span>
      </div>
    </div>
    <div
      v-if="!loading && total > submissions.length"
      :class="`${rootClass}__hint`"
    >
      Showing the latest {{ submissions.length }} of {{ total }}.
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;

$root: '.miraicms-form-entries';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: math-rem(16);
    min-height: 0;
    padding: 0 math-rem(8) math-rem(8);
    overflow: auto;

    &__hint {
      margin: 0;
      color: $color-muted;
    }

    &__table {
      overflow-x: auto;
      border: 1px solid $color-border;
      border-radius: math-rem(8);
      background: $color-surface;
    }

    &__row {
      display: grid;
      grid-template-columns: minmax(math-rem(180), 0.7fr) minmax(math-rem(200), 1.6fr) math-rem(100);
      align-items: center;
      min-width: math-rem(560);
      border-bottom: 1px solid $color-border;

      &:last-child {
        border-bottom: 0;
      }

      > [role='columnheader'],
      > [role='cell'] {
        min-width: 0;
        padding: math-rem(10) math-rem(14);
        overflow-wrap: anywhere;
      }

      &--head {
        background: $color-bg;

        > [role='columnheader'] {
          font-size: math-rem(12);
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: $color-muted;
        }
      }
    }
  }
}
</style>
