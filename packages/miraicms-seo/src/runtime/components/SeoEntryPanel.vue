<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()
const rootClass = 'miraicms-seo-panel'

const entryId = computed(() => {
  const raw = route.params.id
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isInteger(value) && value > 0 ? value : 0
})

const form = reactive({
  title: '',
  description: '',
  canonical: '',
  noindex: false,
  nofollow: false,
})
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

function errMessage(err: unknown, fallback: string): string {
  const e = err as { statusMessage?: string, data?: { message?: string, statusMessage?: string } }
  return e.data?.statusMessage || e.data?.message || e.statusMessage || fallback
}

async function load() {
  saved.value = false
  error.value = ''
  if (!entryId.value) {
    return
  }
  loading.value = true
  try {
    const data = await $fetch<typeof form>(`/api/_miraicms/seo/entries/${entryId.value}`)
    form.title = data.title
    form.description = data.description
    form.canonical = data.canonical
    form.noindex = data.noindex
    form.nofollow = data.nofollow
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load SEO fields.')
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!entryId.value || saving.value) {
    return
  }
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    const data = await $fetch<typeof form>(`/api/_miraicms/seo/entries/${entryId.value}`, {
      method: 'PUT',
      body: { ...form },
    })
    form.title = data.title
    form.description = data.description
    form.canonical = data.canonical
    form.noindex = data.noindex
    form.nofollow = data.nofollow
    saved.value = true
  }
  catch (err) {
    error.value = errMessage(err, 'Could not save SEO fields.')
  }
  finally {
    saving.value = false
  }
}

watch(entryId, () => {
  void load()
}, { immediate: true })
</script>

<template>
  <section :class="rootClass">
    <div :class="`${rootClass}__title`">
      SEO
    </div>
    <p
      v-if="!entryId"
      :class="`${rootClass}__hint`"
    >
      Save the entry before editing its SEO.
    </p>
    <template v-else>
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
          <span>SEO title</span>
          <input
            v-model="form.title"
            type="text"
            maxlength="200"
            placeholder="Defaults to the entry title"
          >
        </label>
        <label :class="`${rootClass}__field`">
          <span>Meta description</span>
          <textarea
            v-model="form.description"
            rows="4"
            maxlength="320"
          />
        </label>
        <label :class="`${rootClass}__field`">
          <span>Canonical URL</span>
          <input
            v-model="form.canonical"
            type="text"
            maxlength="500"
            placeholder="Defaults to the public URL"
          >
        </label>
        <label :class="`${rootClass}__check`">
          <input
            v-model="form.noindex"
            type="checkbox"
          >
          <span>Hide from search engines</span>
        </label>
        <label :class="`${rootClass}__check`">
          <input
            v-model="form.nofollow"
            type="checkbox"
          >
          <span>Nofollow</span>
        </label>
        <p
          v-if="error"
          :class="`${rootClass}__error`"
        >
          {{ error }}
        </p>
        <p
          v-else-if="saved"
          :class="`${rootClass}__saved`"
        >
          SEO saved.
        </p>
        <MiraiCmsUiButton
          tag="button"
          type="submit"
          variant="full"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : 'Save SEO' }}
        </MiraiCmsUiButton>
      </form>
    </template>
  </section>
</template>

<style scoped lang="scss">
$root: '.miraicms-seo-panel';

#{$root} {
  margin: 0 0;
  padding: 0 0 1rem;
  border-bottom: 1px solid #e6e8eb;

  &__title {
    padding: 0 1rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #6b7280;
  }

  &__hint,
  &__saved,
  &__error {
    margin: 0 1rem 0.75rem;
    font-size: 0.8125rem;
  }

  &__hint {
    color: #6b7280;
  }

  &__saved {
    color: #2a9a66;
  }

  &__error {
    color: #d64545;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 1rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.8125rem;
    color: #141a2a;

    input,
    textarea {
      width: 100%;
      margin: 0;
      padding: 0.5rem 0.65rem;
      border: 1px solid #e6e8eb;
      border-radius: 0.375rem;
      background: #fff;
      color: #141a2a;
      font: inherit;
    }
  }

  &__check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #141a2a;

    input {
      width: 1rem;
      height: 1rem;
      margin: 0;
      accent-color: #2f6fed;
    }
  }
}
</style>
