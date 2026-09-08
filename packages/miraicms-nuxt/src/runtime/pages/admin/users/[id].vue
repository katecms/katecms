<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { $fetch, navigateTo, useHead, useRoute } from '#imports'
import {
  MIN_PASSWORD_LENGTH,
  OWNER_ROLE,
  SUBSCRIBER_ROLE,
} from '@miraicms/core'
import type { MediaItem, SelectChoice } from '@miraicms/core'
import { parseAuthError } from '../../../utils/auth-error'
import type { AdminUser, RoleOption, UsersResponse } from '../../../utils/admin-users'
import { useAuth } from '../../../composables/useAuth'
import { useCmsPaths } from '../../../composables/useCmsPaths'

const rootClass = 'miraicms-user-form'
const route = useRoute()
const paths = useCmsPaths()
const { refresh: refreshAuth } = useAuth()
const userId = Number(route.params.id)

const roles = ref<RoleOption[]>([])
const currentUserId = ref<number | null>(null)
const canUpdate = ref(false)
const found = ref(false)

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const notice = ref<{
  variant: 'success' | 'warning' | 'danger'
  message: string
} | null>(null)

const form = reactive({
  email: '',
  name: '',
  password: '',
  role: SUBSCRIBER_ROLE,
  status: 'active' as AdminUser['status'],
  avatar: null as MediaItem | null,
})

useHead({ title: () => form.name.trim() || form.email || 'Edit user' })

const emailField = { type: 'email' as const, label: 'Email', required: true }
const nameField = { label: 'Name' }
const passwordField = {
  type: 'password' as const,
  label: 'Password',
  instructions: 'Leave blank to keep the current password.',
}

const assignableRoles = computed(() => roles.value.filter(role => role.slug !== OWNER_ROLE))

const roleChoices = computed<SelectChoice[]>(() => {
  const seen = new Set<string>()
  const choices: SelectChoice[] = []
  for (const role of assignableRoles.value) {
    seen.add(role.slug)
    choices.push({ val: role.slug, lbl: role.label })
  }
  if (form.role && form.role !== OWNER_ROLE && !seen.has(form.role)) {
    const label = roles.value.find(role => role.slug === form.role)?.label ?? form.role
    choices.unshift({ val: form.role, lbl: label })
  }
  return choices
})

const roleField = computed(() => ({
  type: 'select' as const,
  label: 'Role',
  choices: roleChoices.value,
}))

const statusField = {
  type: 'select' as const,
  label: 'Status',
  choices: [
    { val: 'active', lbl: 'Active' },
    { val: 'banned', lbl: 'Banned' },
  ] satisfies SelectChoice[],
}

const isSelf = computed(() => currentUserId.value === userId)

/**
 * Role and status are management-only and never apply to your own account
 * (matches the server: you can't change your own role/status).
 */
const canEditRoleStatus = computed(() => canUpdate.value && !isSelf.value)

const canSubmit = computed(() => !saving.value && form.email.trim().length > 0)

async function load() {
  if (!Number.isInteger(userId) || userId <= 0) {
    await navigateTo(paths.users)
    return
  }

  loading.value = true
  error.value = null
  try {
    const res = await $fetch<UsersResponse>('/api/_miraicms/users')
    roles.value = res.roles
    currentUserId.value = res.currentUserId
    canUpdate.value = res.canUpdate

    const user = res.users.find(entry => entry.id === userId)
    if (!user) {
      error.value = 'User not found or no access.'
      return
    }

    const canEdit = user.id === res.currentUserId || (res.canUpdate && user.role !== OWNER_ROLE)
    if (!canEdit) {
      await navigateTo(paths.users)
      return
    }

    form.email = user.email
    form.name = user.name ?? ''
    form.role = user.role
    form.status = user.status
    form.avatar = user.avatar
    found.value = true
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not load the user.').message
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
  error.value = null
  notice.value = null

  const body: Record<string, unknown> = {
    email: form.email.trim(),
    name: form.name.trim() || null,
    avatar: form.avatar,
  }
  if (form.password) {
    body.password = form.password
  }
  if (canEditRoleStatus.value) {
    body.role = form.role
    body.status = form.status
  }

  try {
    await $fetch(`/api/_miraicms/users/${userId}` as string, {
      method: 'PATCH',
      body,
    })
    if (isSelf.value) {
      await refreshAuth()
    }
    form.password = ''
    notice.value = {
      variant: 'success',
      message: 'Changes saved.',
    }
  }
  catch (err) {
    notice.value = {
      variant: 'danger',
      message: parseAuthError(err, 'Could not save changes.').message,
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
    <MiraiCmsUiNotice
      v-if="notice"
      :variant="notice.variant"
      :message="notice.message"
      @close="notice = null"
    />
    <header :class="`${rootClass}__head`">
      <NuxtLink
        :to="paths.users"
        :class="`${rootClass}__back`"
      >
        ← Users
      </NuxtLink>
      <h1 :class="`${rootClass}__title`">
        Edit user
      </h1>
    </header>

    <p
      v-if="loading"
      :class="`${rootClass}__empty`"
    >
      Loading…
    </p>

    <div
      v-else-if="!found"
      :class="`${rootClass}__error`"
    >
      <strong>Error:</strong> {{ error || 'User not found.' }}
    </div>

    <form
      v-else
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

      <template v-if="canEditRoleStatus">
        <MiraiCmsSelectField
          v-model="form.role"
          field-key="cms-user-role"
          :field="roleField"
        />

        <MiraiCmsSelectField
          v-model="form.status"
          field-key="cms-user-status"
          :field="statusField"
        />
      </template>

      <div
        v-if="error"
        :class="`${rootClass}__error`"
      >
        <strong>Error:</strong> {{ error }}
      </div>

      <MiraiCmsUiButton
        tag="button"
        type="submit"
        :disabled="!canSubmit"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </MiraiCmsUiButton>
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
    max-width: math-rem(512);

    &__head {
      display: flex;
      flex-direction: column;
      gap: math-rem(6);
    }

    &__back {
      width: fit-content;
      font-size: math-rem(13);
      font-weight: 600;
      color: $color-accent;
      text-decoration: none;

      &:hover {
        color: $color-accent-hover;
        text-decoration: underline;
      }
    }

    &__title {
      margin: 0;
      font-size: math-rem(20);
      font-weight: 600;
      color: $color-ink;
    }

    &__empty {
      margin: 0;
      color: $color-muted;
      font-size: math-rem(14);
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: math-rem(14);
      padding: math-rem(18);
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
    }

    &__error {
      padding: math-rem(12) math-rem(14);
      border: 1px solid $color-danger;
      border-radius: $border-radius;
      background: $color-danger-bg;
      color: $color-danger;
      font-size: math-rem(14);
    }
  }
}
</style>
