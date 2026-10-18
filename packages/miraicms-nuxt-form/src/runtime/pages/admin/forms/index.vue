<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { $fetch, navigateTo, useHead } from '#imports'
import type { FormListItem } from '../../../form/model'
import { useFormPaths } from '../../../form/paths'

const rootClass = 'miraicms-form-list'


useHead({ title: 'Forms' })

const paths = useFormPaths()
const forms = ref<FormListItem[]>([])
const name = ref('')
const loading = ref(true)
const creating = ref(false)
const error = ref('')

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

async function load() {
  loading.value = true
  error.value = ''
  try {
    forms.value = await $fetch<FormListItem[]>('/api/_miraicms/forms')
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load forms.')
  }
  finally {
    loading.value = false
  }
}

async function create() {
  const nextName = name.value.trim()
  if (!nextName || creating.value) {
    return
  }
  creating.value = true
  error.value = ''
  try {
    const form = await $fetch<{ id: number }>('/api/_miraicms/forms', {
      method: 'POST',
      body: { name: nextName },
    })
    await navigateTo(paths.edit(form.id))
  }
  catch (err) {
    error.value = errMessage(err, 'Could not create the form.')
    creating.value = false
  }
}

async function remove(form: FormListItem) {
  if (!window.confirm(`Delete “${form.name}”? Submissions for this form are deleted too.`)) {
    return
  }
  error.value = ''
  try {
    await $fetch(`/api/_miraicms/forms/item/${form.id}`, { method: 'DELETE' })
    forms.value = forms.value.filter(item => item.id !== form.id)
  }
  catch (err) {
    error.value = errMessage(err, 'Could not delete the form.')
  }
}

onMounted(load)
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsAdminHeader
      title="Forms"
      :count="loading ? undefined : forms.length"
    >
      <MiraiCmsUiButton
        tag="a"
        variant="secondary"
        :link="{ url: paths.mail, title: 'Email' }"
      >
        Email
      </MiraiCmsUiButton>
    </MiraiCmsAdminHeader>

    <MiraiCmsUiNotice
      v-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = ''"
    />

    <div
      :class="`${rootClass}__create`"
      @keydown.enter.prevent="create"
    >
      <MiraiCmsTextField
        v-model="name"
        field-key="form-create-name"
        :field="{ type: 'text', label: 'Form name', placeholder: 'Form name', maxLength: 160 }"
      />
      <MiraiCmsUiButton
        tag="button"
        type="button"
        aria-label="Create form"
        :disabled="creating || !name.trim()"
        @click="create"
      >
        {{ creating ? 'Creating…' : 'Create form' }}
      </MiraiCmsUiButton>
    </div>

    <div
      v-if="loading"
      :class="`${rootClass}__hint`"
    >
      Loading…
    </div>
    <div
      v-else-if="!forms.length"
      :class="`${rootClass}__hint`"
    >
      No forms yet.
    </div>
    <div
      v-else
      :class="`${rootClass}__table`"
    >
      <div
        :class="[`${rootClass}__row`, `${rootClass}__row--head`]"
        role="row"
      >
        <span role="columnheader">Name</span>
        <span role="columnheader">ID Form</span>
        <span role="columnheader">Updated</span>
        <span role="columnheader">Actions</span>
      </div>
      <div
        v-for="form in forms"
        :key="form.id"
        :class="`${rootClass}__row`"
        role="row"
      >
        <span role="cell">{{ form.name }}</span>
        <span role="cell">{{ form.id }}</span>
        <span role="cell">{{ formatDate(form.updatedAt) }}</span>
        <span
          :class="`${rootClass}__actions`"
          role="cell"
        >
          <MiraiCmsUiButton
            tag="a"
            :variant="['secondary', 'small']"
            :link="{ url: paths.edit(form.id), title: 'Edit' }"
          >
            Edit
          </MiraiCmsUiButton>
          <MiraiCmsUiButton
            tag="button"
            :variant="['red', 'small']"
            @click="remove(form)"
          >
            Delete
          </MiraiCmsUiButton>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;
$root: '.miraicms-form-list';


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

    &__create {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(8);
      align-items: end;

      :deep(.miraicms-field) {
        flex: 1 1 math-rem(240);
        max-width: math-rem(360);
      }
    }

    &__table {
      overflow-x: auto;
      border: 1px solid $color-border;
      border-radius: math-rem(8);
      background: $color-surface;
    }

    &__row {
      display: grid;
      grid-template-columns: minmax(math-rem(160), 1.4fr) minmax(math-rem(140), 1fr) minmax(math-rem(160), 1fr) math-rem(180);
      align-items: center;
      min-width: math-rem(760);
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

    &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(6);
    }
  }
}
</style>
