<script setup lang="ts">
import { computed, ref } from 'vue'
import { $fetch, navigateTo, useHead } from '#imports'
import { parseAuthError } from '../utils/auth-error'
import { useAuthCooldown } from '../composables/useAuthCooldown'
import { useCmsPaths } from '../composables/useCmsPaths'

useHead({
  bodyAttrs: {
    id: 'miraicms-body',
  },
  title: 'Вход',
})

const paths = useCmsPaths()
const { remainingSec, locked, start: startCooldown } = useAuthCooldown()
const emailField = { label: 'Email', required: true }
const passwordField = { label: 'Пароль', required: true }
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
    return 'Вхожу…'
  }
  if (locked.value) {
    return `Подождите ${remainingSec.value} сек.`
  }
  return 'Войти'
})

async function submit() {
  if (!canSubmit.value) {
    return
  }

  loading.value = true
  error.value = null

  try {
    await $fetch('/api/_miraicms/auth/login', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        password: password.value,
      },
    })
    await navigateTo(paths.admin)
  }
  catch (err) {
    const parsed = parseAuthError(err, 'Не удалось войти.')
    error.value = parsed.message
    startCooldown(parsed.retryAfterMs)
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
        Вход
      </h1>
      <p class="miraicms-auth__subtitle">
        Войдите в панель управления CMS.
      </p>

      <form
        class="miraicms-auth__form"
        @submit.prevent="submit"
      >
        <MiraiCmsFieldWrapper
          field-key="cms-login-email"
          :field="emailField"
        >
          <MiraiCmsInputControl
            v-model="email"
            type="email"
            field-key="cms-login-email"
            :field="emailField"
            autocomplete="email"
          />
        </MiraiCmsFieldWrapper>

        <MiraiCmsFieldWrapper
          field-key="cms-login-password"
          :field="passwordField"
        >
          <MiraiCmsInputControl
            v-model="password"
            type="password"
            field-key="cms-login-password"
            :field="passwordField"
            autocomplete="current-password"
          />
        </MiraiCmsFieldWrapper>

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
        <strong>Ошибка:</strong> {{ error }}
      </div>

      <p class="miraicms-auth__footer">
        Нет аккаунта?
        <NuxtLink :to="paths.register">
          Зарегистрироваться
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<style lang="scss">
@use "../assets/styles/auth" as auth;

@include auth.miraicms-auth-document;
</style>

<style scoped lang="scss">
@use "../assets/styles/auth" as auth;

.miraicms-auth {
  @include auth.miraicms-auth;
}
</style>
