<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  encodeUserFieldValue,
  filterUsersByRole,
  isImageMedia,
  isUserFieldValue,
  userFieldId,
} from '@miraicms/core'
import type { Field, SelectChoice, SelectModelValue, UserFieldValue } from '@miraicms/core'

type UserFieldConfig = Extract<Field, { type: 'user' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: UserFieldConfig
}>(), {
  field: () => ({ type: 'user', label: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-user-field'

function usersFromModel(value: unknown): UserFieldValue[] {
  const items = Array.isArray(value) ? value : value != null && value !== '' ? [value] : []
  return items.filter(isUserFieldValue)
}

const users = ref<UserFieldValue[]>(usersFromModel(model.value))
const loading = ref(false)
const loadError = ref<string | null>(null)

const filteredUsers = computed(() => filterUsersByRole(users.value, props.field?.role))

function userLabel(user: UserFieldValue): string {
  const name = user.name?.trim()
  return name ? `${name} (${user.email})` : user.email
}

function avatarUrl(user: UserFieldValue): string | undefined {
  const avatar = user.avatar
  return avatar && isImageMedia(avatar) ? avatar.url : undefined
}

const selectChoices = computed<SelectChoice[]>(() => filteredUsers.value.map(user => ({
  val: user.id,
  lbl: userLabel(user),
  img: avatarUrl(user),
})))

const showOptionImages = computed(() => selectChoices.value.some(choice => 'img' in choice && choice.img))

function findUser(id: string): UserFieldValue | undefined {
  if (!id) {
    return undefined
  }
  return filteredUsers.value.find(user => String(user.id) === id)
    ?? users.value.find(user => String(user.id) === id)
}

function emptyValue(): unknown {
  if (props.field?.multiple) {
    return []
  }
  return props.field?.allowNull ? null : ''
}

const selected = computed<SelectModelValue>({
  get() {
    if (props.field?.multiple) {
      return Array.isArray(model.value) ? model.value.map(userFieldId).filter(Boolean) : []
    }
    return userFieldId(model.value)
  },
  set(raw) {
    if (props.field?.multiple) {
      const ids = Array.isArray(raw) ? raw.map(id => String(id)) : []
      model.value = ids
        .map(id => findUser(id))
        .filter((user): user is UserFieldValue => !!user)
        .map(user => encodeUserFieldValue(user, props.field?.returnFormat))
      return
    }
    if (raw === '' || raw == null) {
      model.value = emptyValue()
      return
    }
    const user = findUser(String(raw))
    model.value = user ? encodeUserFieldValue(user, props.field?.returnFormat) : emptyValue()
  },
})

const placeholder = computed(() => {
  if (props.field?.multiple) {
    return 'Select users'
  }
  if (props.field?.allowNull || !props.field?.required) {
    return 'Select user'
  }
  return ''
})

function mergeUsers(fetched: UserFieldValue[]) {
  const byId = new Map(fetched.map(user => [user.id, user]))
  for (const existing of users.value) {
    if (!byId.has(existing.id)) {
      byId.set(existing.id, existing)
    }
  }
  users.value = [...byId.values()]
}

function syncModel() {
  if (props.field?.multiple) {
    const ids = Array.isArray(model.value) ? model.value.map(userFieldId).filter(Boolean) : []
    const next = ids
      .map(id => findUser(id))
      .filter((user): user is UserFieldValue => !!user)
    if (next.length !== ids.length) {
      model.value = next.map(user => encodeUserFieldValue(user, props.field?.returnFormat))
    }
    return
  }

  const id = userFieldId(model.value)
  if (!id && props.field?.allowNull && (model.value === undefined || model.value === '')) {
    model.value = null
  }
}

async function loadUsers() {
  loading.value = true
  loadError.value = null
  try {
    const res = await $fetch<{ users: UserFieldValue[] }>('/api/_miraicms/users')
    mergeUsers(res.users)
  }
  catch {
    loadError.value = 'Could not load users.'
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadUsers()
  syncModel()
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    :class="rootClass"
  >
    <div
      v-if="loadError"
      :class="`${rootClass}__error`"
    >
      {{ loadError }}
    </div>
    <MiraiCmsUiSelect
      :id="fieldKey"
      v-model="selected"
      :name="fieldKey"
      :choices="selectChoices"
      :placeholder="placeholder"
      :multiple="field?.multiple || false"
      :required="field?.required || false"
      :disabled="loading"
      search
      search-clearable
      search-placeholder="Search users"
      :selected-opt-clearable="!!field?.allowNull"
      :selected-opt-image="showOptionImages"
      :option-icon="showOptionImages"
      no-results-text="No users found"
      :aria-label="field?.label || fieldKey"
    />
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-user-field';

#{$root} {
  &__error {
    margin: 0 0 math-rem(8);
    color: $color-danger;
    font-size: math-rem(13);
  }

  :deep(.miraicms-select__option > span) {
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
