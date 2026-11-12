<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { $fetch, navigateTo, useHead, useRoute } from '#imports'
import type { FormSubmissionDetail } from '../../../form/model'
import { useFormPaths } from '../../../form/paths'

const rootClass = 'katecms-form-entry'

const route = useRoute()
const paths = useFormPaths()
const formId = computed(() => Number(route.params.id))
const submissionId = computed(() => Number(route.params.submissionId))
const entry = ref<FormSubmissionDetail | null>(null)
const loading = ref(true)
const deleting = ref(false)
const error = ref('')

const answered = computed(() => entry.value?.values.filter(field => field.text || field.files.length) ?? [])

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

function formatSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function fileUrl(index: number): string {
  return `/api/_katecms/forms/item/${formId.value}/submissions/${submissionId.value}/files/${index}`
}

async function load(form: number, submission: number) {
  loading.value = true
  error.value = ''
  entry.value = null
  try {
    entry.value = await $fetch<FormSubmissionDetail>(`/api/_katecms/forms/item/${form}/submissions/${submission}`)
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load the entry.')
  }
  finally {
    loading.value = false
  }
}

async function remove() {
  if (deleting.value || !entry.value) {
    return
  }
  if (!window.confirm('Delete this entry? Uploaded files are deleted too.')) {
    return
  }
  deleting.value = true
  error.value = ''
  try {
    await $fetch(`/api/_katecms/forms/item/${formId.value}/submissions/${submissionId.value}`, { method: 'DELETE' })
    await navigateTo(paths.entries(formId.value))
  }
  catch (err) {
    error.value = errMessage(err, 'Could not delete the entry.')
    deleting.value = false
  }
}

watch([formId, submissionId], ([form, submission]) => {
  if (Number.isInteger(form) && form > 0 && Number.isInteger(submission) && submission > 0) {
    void load(form, submission)
  }
}, { immediate: true })
</script>

<template>
  <div :class="rootClass">
    <KateCmsAdminHeader
      :title="entry?.formName || 'Entry'"
      :back-to="paths.entries(formId)"
      :meta="entry ? formatDate(entry.createdAt) : ''"
    >
      <KateCmsUiButton
        tag="button"
        :variant="['red']"
        :disabled="loading || deleting || !entry"
        @click="remove"
      >
        {{ deleting ? 'Deleting…' : 'Delete' }}
      </KateCmsUiButton>
    </KateCmsAdminHeader>

    <KateCmsUiNotice
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
      v-else-if="entry"
      :class="`${rootClass}__card`"
    >
      <div
        v-if="entry.ip"
        :class="`${rootClass}__meta`"
      >
        <span>IP</span>
        <span>{{ entry.ip }}</span>
      </div>
      <div
        v-for="field in answered"
        :key="field.key"
        :class="`${rootClass}__field`"
      >
        <span :class="`${rootClass}__label`">{{ field.label }}</span>
        <span
          v-if="field.text"
          :class="`${rootClass}__value`"
        >{{ field.text }}</span>
        <span
          v-if="field.files.length"
          :class="`${rootClass}__files`"
        >
          <a
            v-for="file in field.files"
            :key="file.index"
            :href="fileUrl(file.index)"
          >{{ file.name }} ({{ formatSize(file.size) }})</a>
        </span>
      </div>
      <div
        v-if="!answered.length"
        :class="`${rootClass}__hint`"
      >
        No answers.
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "katecms/styles" as *;

$root: '.katecms-form-entry';

@include katecms-wrapper {
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

    &__card {
      display: flex;
      flex-direction: column;
      gap: math-rem(14);
      max-width: math-rem(760);
      padding: math-rem(16);
      border: 1px solid $color-border;
      border-radius: math-rem(8);
      background: $color-surface;
    }

    &__meta,
    &__field {
      display: flex;
      flex-direction: column;
      gap: math-rem(4);
    }

    &__label {
      font-size: math-rem(12);
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: $color-muted;
    }

    &__value {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    &__files {
      display: flex;
      flex-direction: column;
      gap: math-rem(4);

      a {
        color: $color-accent;
      }
    }
  }
}
</style>
