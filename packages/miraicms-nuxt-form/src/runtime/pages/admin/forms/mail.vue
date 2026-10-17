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

    <div
      v-if="loading"
      class="miraicms-form-mail__hint"
    >
      Loading…
    </div>
    <div
      v-else
      class="miraicms-form-mail__grid"
    >
      <MiraiCmsTextField
        v-model="form.host"
        field-key="mail-host"
        :field="{ type: 'text', label: 'Host' }"
      />
      <MiraiCmsNumberField
        :model-value="form.port"
        field-key="mail-port"
        :field="{ type: 'number', label: 'Port', min: 1, max: 65535, step: 1 }"
        @update:model-value="form.port = Number($event) || 587"
      />
      <MiraiCmsSelectField
        v-model="form.encryption"
        field-key="mail-encryption"
        :field="{
          type: 'select',
          label: 'Encryption',
          returnFormat: 'value',
          choices: [
            { val: 'none', lbl: 'None' },
            { val: 'starttls', lbl: 'STARTTLS' },
            { val: 'ssl', lbl: 'SSL' },
          ],
        }"
      />
      <MiraiCmsTextField
        v-model="form.username"
        field-key="mail-username"
        :field="{ type: 'text', label: 'Username' }"
      />
      <MiraiCmsPasswordField
        v-model="password"
        field-key="mail-password"
        :field="{
          type: 'password',
          label: 'Password',
          placeholder: form.passwordSet ? 'Leave blank to keep the saved password' : '',
        }"
      />
      <MiraiCmsTextField
        v-model="form.fromName"
        field-key="mail-from-name"
        :field="{ type: 'text', label: 'From name' }"
      />
      <MiraiCmsEmailField
        v-model="form.fromEmail"
        field-key="mail-from-email"
        :field="{ type: 'email', label: 'From address' }"
      />
      <div class="miraicms-form-mail__test">
        <MiraiCmsEmailField
          v-model="testTo"
          field-key="mail-test-to"
          :field="{ type: 'email', label: 'Send a test to', placeholder: 'you@example.com' }"
        />
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
@use "miraicms-nuxt/styles" as *;

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
  }

  &__test {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: math-rem(8);
  }
}
</style>
