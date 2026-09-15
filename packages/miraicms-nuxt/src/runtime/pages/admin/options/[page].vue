<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { $fetch, useHead, useRoute } from '#imports'
import { parseAuthError } from '../../../utils/auth-error'
import { optionApi } from '../../../utils/options'
import type { AdminOptionMeta, OptionPageResponse } from '../../../utils/options'

const route = useRoute()
const rootClass = 'miraicms-options-page'
const formId = 'cms-options-form'

const pageSlug = computed(() => String(route.params.page ?? ''))

const page = ref<AdminOptionMeta | null>(null)
const found = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const savedNoticeId = ref(0)
const canRead = ref(false)
const canUpdate = ref(false)
const entryForm = ref<{ validateForSubmit: () => boolean } | null>(null)

const form = reactive<Record<string, unknown>>({})

const pageTitle = computed(() => page.value?.labels.name || 'Options')
useHead({ title: pageTitle })

function applyPage(res: OptionPageResponse) {
  page.value = res.page
  canRead.value = res.canRead
  canUpdate.value = res.canUpdate
  replaceForm(res.values ?? {})
  found.value = true
}

function replaceForm(next: Record<string, unknown>) {
  for (const key of Object.keys(form)) {
    Reflect.deleteProperty(form, key)
  }
  Object.assign(form, next)
}

async function load() {
  loading.value = true
  error.value = null
  found.value = false
  try {
    const res = await $fetch<OptionPageResponse>(optionApi(pageSlug.value))
    applyPage(res)
    if (!res.canRead) {
      found.value = false
      error.value = 'Insufficient permissions.'
    }
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not load the options.').message
  }
  finally {
    loading.value = false
  }
}

async function submit() {
  if (saving.value || !page.value || !canUpdate.value) {
    return
  }
  if (!entryForm.value?.validateForSubmit()) {
    return
  }
  saving.value = true
  error.value = null
  try {
    const res = await $fetch<OptionPageResponse>(optionApi(pageSlug.value), {
      method: 'PATCH',
      body: { fields: { ...form } },
    })
    applyPage(res)
    await nextTick()
    savedNoticeId.value += 1
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not save the options.').message
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
watch(pageSlug, load)
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__head`">
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
      v-if="savedNoticeId"
      :key="savedNoticeId"
      placement="fixed"
      message="Changes saved."
      @close="savedNoticeId = 0"
    />

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
      :message="error || 'Options page not found.'"
      :closable="false"
    />

    <MiraiCmsOptionPageForm
      v-else-if="page"
      ref="entryForm"
      :form-id="formId"
      :page="page"
      :model-value="form"
      :saving="saving"
      :error="error"
      :can-update="canUpdate"
      @update:model-value="replaceForm"
      @submit="submit"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.miraicms-options-page';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: math-rem(16);
    }

    &__head-title {
      font-size: math-rem(18);
      font-weight: 600;
    }
  }
}
</style>
