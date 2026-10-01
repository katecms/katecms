<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { $fetch, navigateTo, useHead, useRoute } from '#imports'
import { parseAuthError } from '../../../utils/auth-error'
import { dictionaryApi, dictionaryTermUrl } from '../../../utils/dictionaries'
import type {
  AdminDictionaryMeta,
  DictionaryTermFormModel,
  DictionaryTermResponse,
  ParentOption,
} from '../../../utils/dictionaries'
import { useCmsPaths } from '../../../composables/useCmsPaths'
import { useMiraiCmsTermPanels } from '../../../composables/useMiraiCmsExtensions'

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
const termPanels = useMiraiCmsTermPanels()

const slugPath = ref('')
const viewUrl = computed(() => dictionary.value
  ? dictionaryTermUrl(dictionary.value, slugPath.value)
  : null)

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
  slugPath.value = res.term.slugPath || res.term.slug
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
    <MiraiCmsAdminHeader
      :title="pageTitle"
      :back-to="paths.dictionary(dictionarySlug)"
    >
      <MiraiCmsUiButton
        v-if="viewUrl"
        tag="a"
        variant="secondary"
        :link="{ url: viewUrl, title: 'View', target: '_blank' }"
      >
        View
      </MiraiCmsUiButton>
      <MiraiCmsUiButton
        v-if="found && canUpdate"
        tag="button"
        type="submit"
        :form="formId"
        :disabled="saving"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </MiraiCmsUiButton>
    </MiraiCmsAdminHeader>

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
      <div :class="`${rootClass}__fields`">
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
        <component
          :is="panel"
          v-for="panel in termPanels"
          :key="panel"
        />
      </div>

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
    flex: 1;
    flex-direction: column;
    gap: math-rem(16);
    min-height: 0;
    padding: 0 math-rem(8) math-rem(8);
    overflow: auto;

    &__danger {
      display: flex;
      flex-shrink: 0;
      justify-content: flex-start;
    }
  }
}
</style>
