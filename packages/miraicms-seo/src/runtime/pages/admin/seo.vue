<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useHead } from '#imports'

useHead({ title: 'SEO' })

const rootClass = 'miraicms-seo-settings'

const form = reactive({
  siteName: '',
  titleSeparator: '|',
  titleTemplate: '%title% %sep% %sitename%',
  description: '',
  noindex: false,
})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

function errMessage(err: unknown, fallback: string): string {
  const e = err as { statusMessage?: string, data?: { message?: string, statusMessage?: string } }
  return e.data?.statusMessage || e.data?.message || e.statusMessage || fallback
}

function apply(data: typeof form) {
  form.siteName = data.siteName
  form.titleSeparator = data.titleSeparator
  form.titleTemplate = data.titleTemplate
  form.description = data.description
  form.noindex = data.noindex
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    apply(await $fetch<typeof form>('/api/_miraicms/seo/site'))
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load SEO settings.')
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) {
    return
  }
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    apply(await $fetch<typeof form>('/api/_miraicms/seo/site', {
      method: 'PUT',
      body: { ...form },
    }))
    saved.value = true
  }
  catch (err) {
    error.value = errMessage(err, 'Could not save SEO settings.')
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsAdminHeader title="SEO">
      <MiraiCmsUiButton
        tag="button"
        :disabled="saving || loading"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </MiraiCmsUiButton>
    </MiraiCmsAdminHeader>

    <MiraiCmsUiNotice
      v-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = ''"
    />
    <MiraiCmsUiNotice
      v-else-if="saved"
      placement="static"
      variant="success"
      message="SEO settings saved."
      @close="saved = false"
    />
    <p
      v-if="loading"
      :class="`${rootClass}__hint`"
    >
      Loading…
    </p>
    <form
      v-else
      :class="`${rootClass}__form`"
      @submit.prevent="save"
    >
      <label :class="`${rootClass}__field`">
        <span>Site name</span>
        <MiraiCmsInputControl
          v-model="form.siteName"
          field-key="seo-site-name"
          :field="{ placeholder: 'Shown in the title template' }"
        />
      </label>
      <label :class="`${rootClass}__field`">
        <span>Title separator</span>
        <MiraiCmsInputControl
          v-model="form.titleSeparator"
          field-key="seo-separator"
          :field="{ placeholder: '|' }"
        />
      </label>
      <label :class="`${rootClass}__field`">
        <span>Title template</span>
        <MiraiCmsInputControl
          v-model="form.titleTemplate"
          field-key="seo-template"
          :field="{ placeholder: '%title% %sep% %sitename%' }"
        />
        <small>Use %title%, %sep%, and %sitename%. A custom SEO title on an entry replaces this.</small>
      </label>
      <label :class="`${rootClass}__field`">
        <span>Default meta description</span>
        <textarea
          v-model="form.description"
          rows="4"
          maxlength="320"
        />
      </label>
      <label :class="`${rootClass}__check`">
        <input
          v-model="form.noindex"
          type="checkbox"
        >
        <span>Discourage search engines from indexing this site</span>
      </label>
    </form>
  </div>
</template>

<style scoped lang="scss">
$root: '.miraicms-seo-settings';

#{$root} {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  padding: 0 0.5rem 0.5rem;
  overflow: auto;

  &__hint {
    margin: 0;
    color: #6b7280;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 40rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: #141a2a;
    font-size: 0.875rem;

    small {
      color: #6b7280;
    }

    textarea {
      width: 100%;
      margin: 0;
      padding: 0.5rem 0.65rem;
      border: 1px solid #e6e8eb;
      border-radius: 0.375rem;
      background: #fff;
      color: inherit;
      font: inherit;
    }
  }

  &__check {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    input {
      width: 1rem;
      height: 1rem;
      margin: 0;
      accent-color: #2f6fed;
    }
  }
}
</style>
