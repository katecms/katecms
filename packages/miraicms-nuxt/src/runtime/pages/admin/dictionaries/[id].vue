<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { $fetch, navigateTo, useHead, useRoute } from '#imports'
import { parseAuthError } from '../../../utils/auth-error'
import { dictionaryApi } from '../../../utils/dictionaries'
import type {
  AdminDictionaryMeta,
  DictionaryTermFormModel,
  DictionaryTermResponse,
  ParentOption,
} from '../../../utils/dictionaries'
import { useCmsPaths } from '../../../composables/useCmsPaths'

const route = useRoute()
const paths = useCmsPaths()
const rootClass = 'miraicms-dictionary-entry'
const formId = 'cms-dictionary-edit-form'

const dictionarySlug = computed(() => String(route.params.dictionary ?? ''))
const termId = computed(() => Number(route.params.id))

const dictionary = ref<AdminDictionaryMeta | null>(null)
const parents = ref<ParentOption[]>([])
const found = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const canUpdate = ref(false)
const canDelete = ref(false)
const entryForm = ref<{ validateForSubmit: () => boolean } | null>(null)

const form = reactive<DictionaryTermFormModel>({
  title: '',
  slug: '',
  parentId: null,
  fields: {},
})

const pageTitle = computed(() => form.title.trim() || 'Edit term')
useHead({ title: pageTitle })

function applyTerm(res: DictionaryTermResponse) {
  dictionary.value = res.dictionary
  parents.value = res.parents
  form.title = res.term.title
  form.slug = res.term.slug
  form.parentId = res.term.parentId
  form.fields = { ...(res.term.fields ?? {}) }
  canUpdate.value = res.canUpdate
  canDelete.value = res.canDelete
  found.value = true
}

async function load() {
  if (!Number.isInteger(termId.value) || termId.value <= 0) {
    await navigateTo(paths.dictionary(dictionarySlug.value))
    return
  }

  loading.value = true
  error.value = null
  found.value = false
  try {
    const res = await $fetch<DictionaryTermResponse>(
      dictionaryApi(dictionarySlug.value, termId.value),
    )
    applyTerm(res)
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not load the term.').message
  }
  finally {
    loading.value = false
  }
}

async function submit() {
  if (saving.value || !dictionary.value || !canUpdate.value) {
    return
  }
  if (!entryForm.value?.validateForSubmit()) {
    return
  }
  saving.value = true
  error.value = null
  try {
    const res = await $fetch<DictionaryTermResponse>(
      dictionaryApi(dictionarySlug.value, termId.value),
      {
        method: 'PATCH',
        body: {
          title: form.title.trim(),
          slug: form.slug.trim(),
          fields: form.fields,
          parentId: form.parentId,
        },
      },
    )
    applyTerm(res)
    await nextTick()
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not save the term.').message
  }
  finally {
    saving.value = false
  }
}

async function removeTerm() {
  if (!canDelete.value || saving.value) {
    return
  }
  if (!window.confirm(`Delete “${form.title || 'this term'}”? Child terms will become top-level. This cannot be undone.`)) {
    return
  }
  saving.value = true
  error.value = null
  try {
    await $fetch(dictionaryApi(dictionarySlug.value, termId.value), { method: 'DELETE' })
    await navigateTo(paths.dictionary(dictionarySlug.value))
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not delete the term.').message
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
watch([dictionarySlug, termId], load)
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__head`">
      <MiraiCmsUiButton
        tag="a"
        :variant="['secondary', 'icon']"
        :link="{ url: paths.dictionary(dictionarySlug), title: 'Back to list' }"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
        ><path
          d="M73 297a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L173 352h371a32 32 0 1 0 0-64H173l106-105a32 32 0 0 0-46-46z"
          fill="currentColor"
        /></svg>
      </MiraiCmsUiButton>
      <div :class="`${rootClass}__head-title`">
        {{ pageTitle }}
      </div>
      <MiraiCmsUiButton
        v-if="found && canUpdate"
        tag="button"
        type="submit"
        :form="formId"
        :disabled="saving"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </MiraiCmsUiButton>
    </div>

    <MiraiCmsUiNotice
      v-if="loading"
      placement="static"
      variant="info"
      message="Loading…"
      :closable="false"
    />
    <MiraiCmsUiNotice
      v-else-if="!found"
      placement="static"
      variant="danger"
      :message="error || 'Term not found.'"
      :closable="false"
    />

    <template v-else-if="dictionary">
      <MiraiCmsDictionaryTermForm
        ref="entryForm"
        :form-id="formId"
        :model-value="form"
        :dictionary="dictionary"
        :entry-key="termId"
        :parents="parents"
        :saving="saving"
        :error="error"
        :can-update="canUpdate"
        :show-submit="false"
        @update:model-value="(value: DictionaryTermFormModel) => Object.assign(form, value)"
        @submit="submit"
      />

      <div
        v-if="canDelete"
        :class="`${rootClass}__danger`"
      >
        <MiraiCmsUiButton
          tag="button"
          type="button"
          :variant="['red']"
          :disabled="saving"
          @click="removeTerm"
        >
          Delete
        </MiraiCmsUiButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.miraicms-dictionary-entry';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);
    padding: math-rem(8);

    &__head {
      display: flex;
      align-items: center;
      gap: math-rem(16);

      :deep([type="submit"]) {
        margin-left: auto;
      }
    }

    &__head-title {
      font-size: math-rem(18);
      font-weight: 600;
    }

    &__danger {
      display: flex;
      justify-content: flex-start;
    }
  }
}
</style>
