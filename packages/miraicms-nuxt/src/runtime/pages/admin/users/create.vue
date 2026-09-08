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
const paths = useCmsPaths()

const roles = ref<RoleOption[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

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
  !saving.value
  && form.email.trim().length > 0
  && form.password.length >= MIN_PASSWORD_LENGTH,
)

async function load() {
  loading.value = true
  error.value = null
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
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not load the form.').message
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
    error.value = parseAuthError(err, 'Could not create the user.').message
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div :class="rootClass">
    <header :class="`${rootClass}__head`">
      <NuxtLink
        :to="paths.users"
        :class="`${rootClass}__back`"
      >
        ← Users
      </NuxtLink>
      <h1 :class="`${rootClass}__title`">
        New user
      </h1>
    </header>

    <p
      v-if="loading"
      :class="`${rootClass}__empty`"
    >
      Loading…
    </p>

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

      <MiraiCmsSelectField
        v-model="form.role"
        field-key="cms-user-role"
        :field="roleField"
      />

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
        {{ saving ? 'Creating…' : 'Create' }}
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
