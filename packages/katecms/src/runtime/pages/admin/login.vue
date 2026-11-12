<script setup lang="ts">
import { computed, ref } from 'vue'
import { $fetch, navigateTo, useHead, useRuntimeConfig } from '#imports'
import { parseAuthError } from '../../utils/auth-error'
import { useAuthCooldown } from '../../composables/useAuthCooldown'
import { useCmsPaths } from '../../composables/useCmsPaths'

const rootClass = 'katecms-auth'


useHead({
  bodyAttrs: {
    id: 'katecms-body',
  },
  title: 'Sign in',
})

const paths = useCmsPaths()
const registrationOpen = useRuntimeConfig().public.katecms?.registration
const { remainingSec, locked, start: startCooldown } = useAuthCooldown()
const emailField = { label: 'Email', required: true }
const passwordField = { type: 'password' as const, label: 'Password', required: true }
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(() =>
  !loading.value
  && !locked.value
  && email.value.trim().length > 0
  && password.value.length > 0,
)

const submitLabel = computed(() => {
  if (loading.value) {
    return 'Signing in…'
  }
  if (locked.value) {
    return `Wait ${remainingSec.value} sec.`
  }
  return 'Sign in'
})

async function submit() {
  if (!canSubmit.value) {
    return
  }

  loading.value = true
  error.value = null

  try {
    await $fetch('/api/_katecms/auth/login', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        password: password.value,
      },
    })
    await navigateTo(paths.admin)
  }
  catch (err) {
    const parsed = parseAuthError(err, 'Could not sign in.')
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
  <div :class="rootClass">
    <div :class="`${rootClass}__card`">
      <div :class="`${rootClass}__title`">
        Sign in
      </div>
      <div :class="`${rootClass}__subtitle`">
        Sign in to the CMS admin.
      </div>

      <form
        :class="`${rootClass}__form`"
        @submit.prevent="submit"
      >
        <KateCmsFieldWrapper
          field-key="cms-login-email"
          :field="emailField"
        >
          <KateCmsInputControl
            v-model="email"
            type="email"
            field-key="cms-login-email"
            :field="emailField"
            autocomplete="email"
          />
        </KateCmsFieldWrapper>

        <KateCmsPasswordField
          v-model="password"
          field-key="cms-login-password"
          :field="passwordField"
          autocomplete="current-password"
        />

        <div :class="`${rootClass}__actions`">
          <KateCmsUiButton
            tag="button"
            type="submit"
            :disabled="!canSubmit"
            :aria-label="submitLabel"
          >
            {{ submitLabel }}
          </KateCmsUiButton>
        </div>
      </form>

      <div
        v-if="error"
        :class="`${rootClass}__error`"
      >
        Error: {{ error }}
      </div>

      <div
        v-if="registrationOpen"
        :class="`${rootClass}__footer`"
      >
        No account?
        <NuxtLink :to="paths.register">
          Register
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use "../../assets/styles" as *;

@include katecms-document;
</style>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-auth';

@include katecms-auth($root);
</style>
