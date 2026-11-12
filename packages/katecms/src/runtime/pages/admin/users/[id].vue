<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { $fetch, navigateTo, useHead, useRoute } from '#imports'
import {
  MIN_PASSWORD_LENGTH,
  OWNER_ROLE,
  SUBSCRIBER_ROLE,
} from '@katecms/core'
import type { MediaItem, SelectChoice } from '@katecms/core'
import { parseAuthError } from '../../../utils/auth-error'
import type { AdminUser, RoleOption, UsersResponse } from '../../../utils/admin-users'
import { useAuth } from '../../../composables/useAuth'
import { useCmsPaths } from '../../../composables/useCmsPaths'

const rootClass = 'katecms-user-form'
const formId = 'cms-user-edit-form'
const route = useRoute()
const paths = useCmsPaths()
const { refresh: refreshAuth } = useAuth()
const userId = Number(route.params.id)

const roles = ref<RoleOption[]>([])
const currentUserId = ref<number | null>(null)
const actorRole = ref('')
const canUpdate = ref(false)
const canDelete = ref(false)
const found = ref(false)

const loading = ref(true)
const saving = ref(false)
const showSelfNotice = ref(true)
const notice = ref<{
  variant: 'success' | 'info' | 'warning' | 'danger'
  message: string
} | null>(null)

const form = reactive({
  email: '',
  name: '',
  currentPassword: '',
  password: '',
  role: SUBSCRIBER_ROLE,
  status: 'active' as AdminUser['status'],
  avatar: null as MediaItem | null,
})

useHead({ title: () => form.name.trim() || form.email || 'Edit user' })

const emailField = { type: 'email' as const, label: 'Email', required: true }
const nameField = { label: 'Name' }
const currentPasswordField = {
  type: 'password' as const,
  label: 'Current password',
  instructions: 'Required when you set a new password.',
}
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

const canDeleteUser = computed(() => {
  if (!found.value || !canDelete.value || isSelf.value) {
    return false
  }
  if (form.role !== OWNER_ROLE) {
    return true
  }
  return actorRole.value === OWNER_ROLE
})

const canSubmit = computed(() => found.value && !saving.value && form.email.trim().length > 0)

async function load() {
  if (!Number.isInteger(userId) || userId <= 0) {
    await navigateTo(paths.users)
    return
  }

  loading.value = true
  notice.value = null
  try {
    const res = await $fetch<UsersResponse>('/api/_katecms/users')
    roles.value = res.roles
    currentUserId.value = res.currentUserId
    actorRole.value = res.users.find(entry => entry.id === res.currentUserId)?.role ?? ''
    canUpdate.value = res.canUpdate
    canDelete.value = res.canDelete

    const user = res.users.find(entry => entry.id === userId)
    if (!user) {
      notice.value = {
        variant: 'danger',
        message: 'User not found or no access.',
      }
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
    notice.value = {
      variant: 'danger',
      message: parseAuthError(err, 'Could not load the user.').message,
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

  const body: Record<string, unknown> = {
    email: form.email.trim(),
    name: form.name.trim() || null,
    avatar: form.avatar,
  }
  if (form.password) {
    body.password = form.password
    if (isSelf.value) {
      body.currentPassword = form.currentPassword
    }
  }
  if (canEditRoleStatus.value) {
    body.role = form.role
    body.status = form.status
  }

  try {
    await $fetch(`/api/_katecms/users/${userId}` as string, {
      method: 'PATCH',
      body,
    })
    if (isSelf.value) {
      await refreshAuth()
    }
    form.password = ''
    form.currentPassword = ''
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

async function remove() {
  if (!canDeleteUser.value || saving.value) {
    return
  }
  const label = form.name.trim() || form.email.trim() || 'this user'
  if (!window.confirm(`Delete “${label}” permanently? This cannot be undone.`)) {
    return
  }
  saving.value = true
  notice.value = null
  try {
    await $fetch(`/api/_katecms/users/${userId}`, { method: 'DELETE' })
    await navigateTo(paths.users)
  }
  catch (err) {
    notice.value = {
      variant: 'danger',
      message: parseAuthError(err, 'Could not delete the user.').message,
    }
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div :class="rootClass">
    <KateCmsAdminHeader
      :title="`Edit user: ${form.name || form.email || 'Unknown'}`"
      :back-to="paths.users"
    >
      <KateCmsUiButton
        v-if="canDeleteUser"
        tag="button"
        type="button"
        :variant="['red', 'small']"
        :disabled="saving"
        @click="remove"
      >
        Delete
      </KateCmsUiButton>
      <KateCmsUiButton
        tag="button"
        type="submit"
        :form="formId"
        :disabled="!canSubmit"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </KateCmsUiButton>
    </KateCmsAdminHeader>

    <KateCmsUiNotice
      v-if="loading"
      placement="static"
      variant="info"
      message="Loading…"
      :closable="false"
    />
    <KateCmsUiNotice
      v-else-if="notice"
      placement="fixed"
      :variant="notice.variant"
      :message="notice.message"
      @close="notice = null"
    />
    <KateCmsUiNotice
      v-if="found && isSelf && showSelfNotice"
      placement="fixed"
      variant="warning"
      :timeout="7000"
      @close="showSelfNotice = false"
    >
      <div>You are editing your own account.</div>
      <div>Role and status cannot be changed here. Ask another administrator if those fields need an update.</div>
    </KateCmsUiNotice>

    <form
      v-if="found"
      :id="formId"
      :class="`${rootClass}__form`"
      @submit.prevent="submit"
    >
      <KateCmsFieldWrapper
        field-key="cms-user-avatar"
        :field="{ label: 'Avatar' }"
        label-tag="span"
      >
        <KateCmsUserAvatarField v-model="form.avatar" />
      </KateCmsFieldWrapper>

      <KateCmsFieldWrapper
        field-key="cms-user-email"
        :field="emailField"
      >
        <KateCmsInputControl
          v-model="form.email"
          type="email"
          field-key="cms-user-email"
          :field="emailField"
          autocomplete="off"
        />
      </KateCmsFieldWrapper>

      <KateCmsFieldWrapper
        field-key="cms-user-name"
        :field="nameField"
      >
        <KateCmsInputControl
          v-model="form.name"
          field-key="cms-user-name"
          autocomplete="off"
        />
      </KateCmsFieldWrapper>

      <KateCmsPasswordField
        v-if="isSelf"
        v-model="form.currentPassword"
        field-key="cms-user-current-password"
        :field="currentPasswordField"
        autocomplete="current-password"
      />

      <KateCmsPasswordField
        v-model="form.password"
        field-key="cms-user-password"
        :field="passwordField"
        autocomplete="new-password"
        :minlength="MIN_PASSWORD_LENGTH"
      />

      <template v-if="canEditRoleStatus">
        <KateCmsSelectField
          v-model="form.role"
          field-key="cms-user-role"
          :field="roleField"
        />

        <KateCmsSelectField
          v-model="form.status"
          field-key="cms-user-status"
          :field="statusField"
        />
      </template>
    </form>
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.katecms-user-form';

@include katecms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);
    padding: math-rem(8);

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
