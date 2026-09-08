<script setup lang="ts">
import { computed, ref } from 'vue'
import { $fetch, navigateTo, useHead } from '#imports'
import { parseAuthError } from '../utils/auth-error'
import { useAuth } from '../composables/useAuth'
import { useAuthCooldown } from '../composables/useAuthCooldown'
import { useCmsPaths } from '../composables/useCmsPaths'

const { authState } = useAuth()
const isFirstUser = computed(() => authState.value?.hasUsers === false)

useHead({
  bodyAttrs: {
    id: 'miraicms-body',
  },
  title: () => isFirstUser.value ? 'Create owner' : 'Register',
})

const paths = useCmsPaths()
const { remainingSec, locked, start: startCooldown } = useAuthCooldown()
const emailField = { label: 'Email', required: true }
const passwordField = { type: 'password' as const, label: 'Password', required: true }
const passwordConfirmField = { type: 'password' as const, label: 'Confirm password', required: true }
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(() =>
  !loading.value
  && !locked.value
  && email.value.trim().length > 0
  && password.value.length > 0
  && passwordConfirm.value.length > 0,
)

const submitLabel = computed(() => {
  if (loading.value) {
    return 'Creating…'
  }
  if (locked.value) {
    return `Wait ${remainingSec.value} sec.`
  }
  return 'Register'
})

async function submit() {
  if (!canSubmit.value) {
    return
  }

  loading.value = true
  error.value = null

  try {
    await $fetch('/api/_miraicms/auth/register', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        password: password.value,
        passwordConfirm: passwordConfirm.value,
      },
    })
    await navigateTo(paths.admin)
  }
  catch (err) {
    const parsed = parseAuthError(err, 'Could not register.')
    error.value = parsed.message
    startCooldown(parsed.retryAfterMs, () => {
      error.value = null
    })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="miraicms-auth">
    <div class="miraicms-auth__card">
      <img
        class="miraicms-auth__logo"
        src="../assets/img/miraicms-logo.svg"
        alt="MiraiCMS"
      >
      <h1 class="miraicms-auth__title">
        {{ isFirstUser ? 'Create owner' : 'Register' }}
      </h1>
      <p class="miraicms-auth__subtitle">
        <template v-if="isFirstUser">
          This is the first account — it will automatically receive the owner role.
        </template>
        <template v-else>
          Fill in the form to create an account. New users are assigned the subscriber role.
        </template>
      </p>

      <form
        class="miraicms-auth__form"
        @submit.prevent="submit"
      >
        <MiraiCmsFieldWrapper
          field-key="cms-register-email"
          :field="emailField"
        >
          <MiraiCmsInputControl
            v-model="email"
            type="email"
            field-key="cms-register-email"
            :field="emailField"
            autocomplete="email"
          />
        </MiraiCmsFieldWrapper>

        <MiraiCmsPasswordField
          v-model="password"
          field-key="cms-register-password"
          :field="passwordField"
          autocomplete="new-password"
          minlength="8"
        />

        <MiraiCmsPasswordField
          v-model="passwordConfirm"
          field-key="cms-register-password-confirm"
          :field="passwordConfirmField"
          autocomplete="new-password"
        />

        <div class="miraicms-auth__actions">
          <MiraiCmsUiButton
            tag="button"
            type="submit"
            :disabled="!canSubmit"
            :aria-label="submitLabel"
          >
            {{ submitLabel }}
          </MiraiCmsUiButton>
        </div>
      </form>

      <div
        v-if="error"
        class="miraicms-auth__error"
      >
        <strong>Error:</strong> {{ error }}
      </div>

      <p
        v-if="!isFirstUser"
        class="miraicms-auth__footer"
      >
        Already have an account?
        <NuxtLink :to="paths.login">
          Sign in
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<style lang="scss">
@use "../assets/styles" as *;

@include miraicms-document;
</style>

<style scoped lang="scss">
@use "../assets/styles" as *;

@include miraicms-auth;
</style>
