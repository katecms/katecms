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
  title: () => isFirstUser.value ? 'Создание владельца' : 'Регистрация',
})

const paths = useCmsPaths()
const { remainingSec, locked, start: startCooldown } = useAuthCooldown()
const emailField = { label: 'Email', required: true }
const passwordField = { type: 'password' as const, label: 'Пароль', required: true }
const passwordConfirmField = { type: 'password' as const, label: 'Повторите пароль', required: true }
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
    return 'Создаю…'
  }
  if (locked.value) {
    return `Подождите ${remainingSec.value} сек.`
  }
  return 'Зарегистрироваться'
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
    const parsed = parseAuthError(err, 'Не удалось зарегистрироваться.')
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
        {{ isFirstUser ? 'Создание владельца' : 'Регистрация' }}
      </h1>
      <p class="miraicms-auth__subtitle">
        <template v-if="isFirstUser">
          Это первый аккаунт — он автоматически получит роль владельца (owner).
        </template>
        <template v-else>
          Заполните форму, чтобы создать аккаунт. Новым пользователям назначается роль subscriber.
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
        <strong>Ошибка:</strong> {{ error }}
      </div>

      <p
        v-if="!isFirstUser"
        class="miraicms-auth__footer"
      >
        Уже есть аккаунт?
        <NuxtLink :to="paths.login">
          Войти
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
