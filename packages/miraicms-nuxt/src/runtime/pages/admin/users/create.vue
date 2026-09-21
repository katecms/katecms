<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { $fetch, navigateTo, useHead } from '#imports'
import {
  MIN_PASSWORD_LENGTH,
  OWNER_ROLE,
  SUBSCRIBER_ROLE,
} from '@miraicms/core'
import type { MediaItem, SelectChoice } from '@miraicms/core'
import { parseAuthError } from '../../../utils/auth-error'
import type { AdminUser, RoleOption, UsersResponse } from '../../../utils/admin-users'
import { useCmsPaths } from '../../../composables/useCmsPaths'

useHead({ title: 'New user' })

const rootClass = 'miraicms-user-form'
const formId = 'cms-user-create-form'
const paths = useCmsPaths()

const roles = ref<RoleOption[]>([])
const loading = ref(true)
const saving = ref(false)
const ready = ref(false)
const notice = ref<{
  variant: 'success' | 'info' | 'warning' | 'danger'
  message: string
} | null>(null)

const form = reactive({
  email: '',
  name: '',
  password: '',
  role: SUBSCRIBER_ROLE,
  avatar: null as MediaItem | null,
})

const emailField = { type: 'email' as const, label: 'Email', required: true }
const nameField = { label: 'Name' }
const passwordField = {
  type: 'password' as const,
  label: 'Password',
  required: true,
}

const assignableRoles = computed(() => roles.value.filter(role => role.slug !== OWNER_ROLE))

const roleChoices = computed<SelectChoice[]>(() =>
  assignableRoles.value.map(role => ({ val: role.slug, lbl: role.label })),
)

const roleField = computed(() => ({
  type: 'select' as const,
  label: 'Role',
  choices: roleChoices.value,
}))

const canSubmit = computed(() =>
  ready.value
  && !saving.value
  && form.email.trim().length > 0
  && form.password.length >= MIN_PASSWORD_LENGTH,
)

async function load() {
  loading.value = true
  notice.value = null
  try {
    const res = await $fetch<UsersResponse>('/api/_miraicms/users')
    if (!res.canCreate) {
      await navigateTo(paths.users)
      return
    }
    roles.value = res.roles
    if (!assignableRoles.value.some(role => role.slug === form.role)) {
      form.role = assignableRoles.value[0]?.slug ?? SUBSCRIBER_ROLE
    }
    ready.value = true
  }
  catch (err) {
    notice.value = {
      variant: 'danger',
      message: parseAuthError(err, 'Could not load the form.').message,
    }
  }
  finally {
    loading.value = false
  }
}

async function submit() {
  if (!canSubmit.value) {
    return
  }
  saving.value = true
  notice.value = null
  try {
    const created = await $fetch<{ user: AdminUser }>('/api/_miraicms/users' as string, {
      method: 'POST',
      body: {
        email: form.email.trim(),
        name: form.name.trim() || null,
        password: form.password,
        role: form.role,
        avatar: form.avatar,
      },
    })
    await navigateTo(`${paths.users}/${created.user.id}`)
  }
  catch (err) {
    notice.value = {
      variant: 'danger',
      message: parseAuthError(err, 'Could not create the user.').message,
    }
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div :class="rootClass">
    <div :class="`${rootClass}__head`">
      <MiraiCmsUiButton
        tag="a"
        :variant="['secondary', 'icon']"
        :link="{ url: paths.users, title: 'Users' }"
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
        New user
      </div>
      <MiraiCmsUiButton
        tag="button"
        type="submit"
        :form="formId"
        :disabled="!canSubmit"
      >
        {{ saving ? 'Creating…' : 'Create' }}
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
      v-else-if="notice"
      placement="fixed"
      :variant="notice.variant"
      :message="notice.message"
      @close="notice = null"
    />

    <form
      v-if="ready"
      :id="formId"
      :class="`${rootClass}__form`"
      @submit.prevent="submit"
    >
      <MiraiCmsFieldWrapper
        field-key="cms-user-avatar"
        :field="{ label: 'Avatar' }"
        label-tag="span"
      >
        <MiraiCmsUserAvatarField v-model="form.avatar" />
      </MiraiCmsFieldWrapper>

      <MiraiCmsFieldWrapper
        field-key="cms-user-email"
        :field="emailField"
      >
        <MiraiCmsInputControl
          v-model="form.email"
          type="email"
          field-key="cms-user-email"
          :field="emailField"
          autocomplete="off"
        />
      </MiraiCmsFieldWrapper>

      <MiraiCmsFieldWrapper
        field-key="cms-user-name"
        :field="nameField"
      >
        <MiraiCmsInputControl
          v-model="form.name"
          field-key="cms-user-name"
          autocomplete="off"
        />
      </MiraiCmsFieldWrapper>

      <MiraiCmsPasswordField
        v-model="form.password"
        field-key="cms-user-password"
        :field="passwordField"
        autocomplete="new-password"
        :minlength="MIN_PASSWORD_LENGTH"
      />

      <MiraiCmsSelectField
        v-model="form.role"
        field-key="cms-user-role"
        :field="roleField"
      />
    </form>
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.miraicms-user-form';

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

      &-title {
        font-size: math-rem(18);
        font-weight: 600;
      }

      :deep([type="submit"]) {
        margin-left: auto;
      }
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: math-rem(14);
      padding: math-rem(12);
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
    }
  }
}
</style>
