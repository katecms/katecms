<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { $fetch, useHead } from '#imports'
import type { MailSettings } from '../../../form/model'
import { useFormPaths } from '../../../form/paths'

useHead({ title: 'Form email' })

const paths = useFormPaths()
const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const error = ref('')
const saved = ref(false)
const tested = ref(false)
const password = ref('')
const testTo = ref('')

const form = reactive({
  host: '',
  port: 587,
  encryption: 'starttls' as MailSettings['encryption'],
  username: '',
  fromEmail: '',
  fromName: '',
  passwordSet: false,
})

function errMessage(err: unknown, fallback: string): string {
  const value = err as { statusMessage?: string, data?: { message?: string, statusMessage?: string } }
  return value.data?.statusMessage || value.data?.message || value.statusMessage || fallback
}

function apply(settings: MailSettings) {
  form.host = settings.host
  form.port = settings.port
  form.encryption = settings.encryption
  form.username = settings.username
  form.fromEmail = settings.fromEmail
  form.fromName = settings.fromName
  form.passwordSet = settings.passwordSet
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    apply(await $fetch<MailSettings>('/api/_miraicms/forms/mail'))
  }
  catch (err) {
    error.value = errMessage(err, 'Could not load email settings.')
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  saved.value = false
  tested.value = false
  try {
    const body: Record<string, unknown> = {
      host: form.host,
      port: form.port,
      encryption: form.encryption,
      username: form.username,
      fromEmail: form.fromEmail,
      fromName: form.fromName,
    }
    if (password.value) {
      body.password = password.value
    }
    apply(await $fetch<MailSettings>('/api/_miraicms/forms/mail', { method: 'PUT', body }))
    password.value = ''
    saved.value = true
  }
  catch (err) {
    error.value = errMessage(err, 'Could not save email settings.')
  }
  finally {
    saving.value = false
  }
}

async function sendTest() {
  if (testing.value) {
    return
  }
  testing.value = true
  error.value = ''
  tested.value = false
  saved.value = false
  try {
    await $fetch('/api/_miraicms/forms/mail/test', {
      method: 'POST',
      body: { to: testTo.value },
    })
    tested.value = true
  }
  catch (err) {
    error.value = errMessage(err, 'Could not send the test message.')
  }
  finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="miraicms-form-mail">
    <MiraiCmsAdminHeader
      title="Email"
      :back-to="paths.list"
      meta="SMTP for form messages. Sending a message when a form is submitted comes later."
    >
      <MiraiCmsUiButton
        tag="button"
        aria-label="Save"
        :disabled="saving || loading"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </MiraiCmsUiButton>
    </MiraiCmsAdminHeader>

    <MiraiCmsUiNotice
      v-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = ''"
    />
    <MiraiCmsUiNotice
      v-else-if="saved"
      placement="static"
      variant="success"
      message="Email settings saved."
      @close="saved = false"
    />
    <MiraiCmsUiNotice
      v-else-if="tested"
      placement="static"
      variant="success"
      message="Test message sent."
      @close="tested = false"
    />

    <p
      v-if="loading"
      class="miraicms-form-mail__hint"
    >
      Loading…
    </p>
    <div
      v-else
      class="miraicms-form-mail__grid"
    >
      <label>
        <span>Host</span>
        <input
          v-model="form.host"
          type="text"
          autocomplete="off"
        >
      </label>
      <label>
        <span>Port</span>
        <input
          v-model.number="form.port"
          type="number"
          min="1"
          max="65535"
        >
      </label>
      <label>
        <span>Encryption</span>
        <select v-model="form.encryption">
          <option value="none">
            None
          </option>
          <option value="starttls">
            STARTTLS
          </option>
          <option value="ssl">
            SSL
          </option>
        </select>
      </label>
      <label>
        <span>Username</span>
        <input
          v-model="form.username"
          type="text"
          autocomplete="off"
        >
      </label>
      <label>
        <span>Password</span>
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          :placeholder="form.passwordSet ? 'Leave blank to keep the saved password' : ''"
        >
      </label>
      <label>
        <span>From name</span>
        <input
          v-model="form.fromName"
          type="text"
        >
      </label>
      <label>
        <span>From address</span>
        <input
          v-model="form.fromEmail"
          type="email"
        >
      </label>
      <div class="miraicms-form-mail__test">
        <label>
          <span>Send a test to</span>
          <input
            v-model="testTo"
            type="email"
            placeholder="you@example.com"
          >
        </label>
        <MiraiCmsUiButton
          tag="button"
          variant="secondary"
          aria-label="Send test"
          :disabled="testing || !testTo.trim()"
          @click="sendTest"
        >
          {{ testing ? 'Sending…' : 'Send test' }}
        </MiraiCmsUiButton>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/admin" as *;

.miraicms-form-mail {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: math-rem(16);
  min-height: 0;
  padding: 0 math-rem(8) math-rem(8);
  overflow: auto;

  &__hint {
    margin: 0;
    color: $color-muted;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(math-rem(240), 1fr));
    gap: math-rem(14);
    max-width: math-rem(820);

    label {
      display: flex;
      flex-direction: column;
      gap: math-rem(4);
      font-size: math-rem(13);
      font-weight: 600;
    }

    input,
    select {
      width: 100%;
      padding: math-rem(8) math-rem(10);
      border: 1px solid $color-border;
      border-radius: $border-radius;
      background: $color-surface;
      color: $color-ink;
      font: inherit;
      font-weight: 400;
    }
  }

  &__test {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: math-rem(8);
  }
}
</style>
