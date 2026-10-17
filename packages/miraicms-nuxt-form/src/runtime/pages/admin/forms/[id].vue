<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { $fetch, useHead, useRoute } from '#imports'
import FormBuilder from '../../../builder/FormBuilder.vue'
import { notificationFieldErrors, type FormRecord } from '../../../form/model'
import { useFormPaths } from '../../../form/paths'

const route = useRoute()
const paths = useFormPaths()
const form = ref<FormRecord | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const id = computed(() => Number(route.params.id))
const mailInvalid = computed(() => Object.keys(notificationFieldErrors(form.value?.content.notification)).length > 0)
const mailNoticeHidden = ref(false)

watch(mailInvalid, (invalid, wasInvalid) => {
  if (!invalid || !wasInvalid) {
    mailNoticeHidden.value = false
  }
})
useHead({ title: computed(() => form.value?.name || 'Form') })

function errMessage(err: unknown, fallback: string): string {
  const value = err as { statusMessage?: string, data?: { message?: string, statusMessage?: string } }
  return value.data?.statusMessage || value.data?.message || value.statusMessage || fallback
}

async function load(formId: number) {
  loading.value = true
  error.value = ''
  saved.value = false
  form.value = null
  try {
    form.value = await $fetch<FormRecord>(`/api/_miraicms/forms/item/${formId}`)
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load the form.')
  }
  finally {
    loading.value = false
  }
}

async function save() {
  const current = form.value
  if (!current || saving.value) {
    return
  }
  const mailErrors = notificationFieldErrors(current.content.notification)
  if (Object.keys(mailErrors).length) {
    error.value = 'Enter a valid email address in Email Notification.'
    return
  }
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    form.value = await $fetch<FormRecord>(`/api/_miraicms/forms/item/${current.id}`, {
      method: 'PUT',
      body: {
        name: current.name,
        status: current.status,
        content: current.content,
      },
    })
    saved.value = true
  }
  catch (err) {
    error.value = errMessage(err, 'Could not save the form.')
  }
  finally {
    saving.value = false
  }
}

watch(id, (formId) => {
  if (Number.isInteger(formId) && formId > 0) {
    void load(formId)
  }
}, { immediate: true })
</script>

<template>
  <div class="miraicms-form-editor">
    <MiraiCmsAdminHeader
      :title="form?.name || 'Form'"
      :back-to="paths.list"
      :meta="form ? `ID Form ${form.id}` : ''"
    >
      <MiraiCmsUiButton
        tag="button"
        aria-label="Save"
        :disabled="saving || loading || !form || mailInvalid"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </MiraiCmsUiButton>
    </MiraiCmsAdminHeader>

    <MiraiCmsUiNotice
      v-if="mailInvalid && !mailNoticeHidden"
      placement="static"
      variant="danger"
      message="Enter a valid email address in Email Notification."
      @close="mailNoticeHidden = true"
    />
    <MiraiCmsUiNotice
      v-else-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = ''"
    />
    <MiraiCmsUiNotice
      v-else-if="saved"
      placement="static"
      variant="success"
      message="Form saved."
      @close="saved = false"
    />

    <div
      v-if="loading"
      class="miraicms-form-editor__hint"
    >
      Loading…
    </div>
    <template v-else-if="form">
      <div class="miraicms-form-editor__name">
        <MiraiCmsTextField
          v-model="form.name"
          field-key="form-name"
          :field="{ type: 'text', label: 'Form name', maxLength: 160 }"
        />
      </div>
      <FormBuilder
        v-model:name="form.name"
        v-model:status="form.status"
        v-model:content="form.content"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;

.miraicms-form-editor {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  padding: 0 math-rem(8) math-rem(8);

  &__hint {
    margin: math-rem(12) 0 0;
    color: $color-muted;
  }

  &__name {
    max-width: math-rem(360);
    margin-bottom: math-rem(8);
  }

  :deep(.miraicms-notice) {
    margin-bottom: math-rem(8);
  }
}
</style>
