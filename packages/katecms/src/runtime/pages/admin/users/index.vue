<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { $fetch, useHead } from '#imports'
import { OWNER_ROLE } from '@katecms/core'
import { parseAuthError } from '../../../utils/auth-error'
import { avatarSrc, userInitials } from '../../../utils/admin-users'
import type { AdminUser, RoleOption, UsersResponse } from '../../../utils/admin-users'
import { useCmsPaths } from '../../../composables/useCmsPaths'

useHead({ title: 'Users' })

const rootClass = 'katecms-users'
const paths = useCmsPaths()

const users = ref<AdminUser[]>([])
const roles = ref<RoleOption[]>([])
const currentUserId = ref<number | null>(null)
const canCreate = ref(false)
const canUpdate = ref(false)
const canDelete = ref(false)
const deletingId = ref<number | null>(null)

const loading = ref(true)
const error = ref<string | null>(null)

function roleLabel(slug: string): string {
  return roles.value.find(role => role.slug === slug)?.label ?? slug
}

function statusLabel(status: AdminUser['status']): string {
  return status === 'banned' ? 'Banned' : 'Active'
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Whether the actor may open the editor for a given row. */
function canEditRow(user: AdminUser): boolean {
  if (user.id === currentUserId.value) {
    return true
  }
  return canUpdate.value && user.role !== OWNER_ROLE
}

function canDeleteRow(user: AdminUser): boolean {
  if (!canDelete.value || user.id === currentUserId.value) {
    return false
  }
  if (user.role !== OWNER_ROLE) {
    return true
  }
  return users.value.some(entry => entry.id === currentUserId.value && entry.role === OWNER_ROLE)
}

async function remove(user: AdminUser) {
  if (!canDeleteRow(user) || deletingId.value != null) {
    return
  }
  const label = user.name?.trim() || user.email
  if (!window.confirm(`Delete “${label}” permanently? This cannot be undone.`)) {
    return
  }
  deletingId.value = user.id
  error.value = null
  try {
    await $fetch(`/api/_katecms/users/${user.id}`, { method: 'DELETE' })
    users.value = users.value.filter(entry => entry.id !== user.id)
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not delete the user.').message
  }
  finally {
    deletingId.value = null
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<UsersResponse>('/api/_katecms/users')
    users.value = res.users
    roles.value = res.roles
    currentUserId.value = res.currentUserId
    canCreate.value = res.canCreate
    canUpdate.value = res.canUpdate
    canDelete.value = res.canDelete
  }
  catch (err) {
    error.value = parseAuthError(err, 'Could not load users.').message
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div :class="rootClass">
    <KateCmsAdminHeader title="Users">
      <KateCmsUiButton
        tag="a"
        :disabled="!canCreate"
        :link="{ url: `${paths.users}/create`, title: 'Add user' }"
      >
        Add user
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
      v-else-if="error"
      placement="static"
      variant="danger"
      :message="error"
      @close="error = null"
    />
    <KateCmsUiNotice
      v-else-if="!users.length"
      placement="static"
      variant="info"
      message="No users yet."
      :closable="false"
    />

    <div
      v-else
      :class="`${rootClass}__table-wrap`"
    >
      <div
        :class="[`${rootClass}__columns`, `${rootClass}__columns--head`]"
        role="row"
      >
        <span
          role="columnheader"
          aria-label="Avatar"
        />
        <span role="columnheader">Email</span>
        <span role="columnheader">Name</span>
        <span role="columnheader">Role</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Created</span>
        <span
          role="columnheader"
          aria-label="Actions"
        />
      </div>
      <div :class="`${rootClass}__rows`">
        <div
          v-for="user in users"
          :key="user.id"
          :class="[`${rootClass}__columns`, { [`${rootClass}__row--banned`]: user.status === 'banned' }]"
          role="row"
        >
          <div role="cell">
            <span :class="`${rootClass}__avatar`">
              <img
                v-if="avatarSrc(user.avatar)"
                :src="avatarSrc(user.avatar)!"
                :alt="user.avatar?.alt || ''"
              >
              <span
                v-else
                :class="`${rootClass}__avatar-initials`"
              >{{ userInitials(user) }}</span>
            </span>
          </div>
          <div role="cell">
            {{ user.email }}
            <span
              v-if="user.id === currentUserId"
              :class="`${rootClass}__badge`"
            >you</span>
          </div>
          <div role="cell">
            {{ user.name || '—' }}
          </div>
          <div role="cell">
            {{ roleLabel(user.role) }}
          </div>
          <div role="cell">
            <span
              :class="[`${rootClass}__status`, `${rootClass}__status--${user.status}`]"
            >
              {{ statusLabel(user.status) }}
            </span>
          </div>
          <div role="cell">
            {{ formatDate(user.created_at) }}
          </div>
          <div
            role="cell"
            :class="`${rootClass}__actions`"
          >
            <KateCmsUiButton
              v-if="canEditRow(user)"
              tag="a"
              :variant="['secondary', 'small']"
              :link="{ url: `${paths.users}/${user.id}`, title: 'Edit' }"
            >
              Edit
            </KateCmsUiButton>
            <KateCmsUiButton
              v-if="canDeleteRow(user)"
              tag="button"
              type="button"
              :variant="['red', 'small']"
              :disabled="deletingId === user.id"
              :aria-label="`Delete ${user.name || user.email}`"
              @click="remove(user)"
            >
              {{ deletingId === user.id ? 'Deleting…' : 'Delete' }}
            </KateCmsUiButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.katecms-users';

@include katecms-wrapper {
  #{$root} {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: math-rem(16);
    min-height: 0;
    padding: 0 math-rem(8) math-rem(8);
    overflow: hidden;

    &__table {
      &-wrap {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
        overflow-x: auto;
        overflow-y: hidden;
        background: $color-surface;
        border: 1px solid $color-border;
        border-radius: $border-radius;
      }
    }

    &__columns {
      display: grid;
      grid-template-columns: math-rem(56) minmax(math-rem(180), 1.6fr) minmax(math-rem(120), 1.2fr) math-rem(140) math-rem(110) math-rem(180) minmax(math-rem(148), auto);
      align-items: center;
      min-width: math-rem(860);

      > [role='columnheader'],
      > [role='cell'] {
        min-width: 0;
        padding: math-rem(10) math-rem(14);
        overflow-wrap: anywhere;
      }

      &--head {
        flex-shrink: 0;
        background: $color-bg;
        border-bottom: 1px solid $color-border;

        > [role='columnheader'] {
          font-size: math-rem(12);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: $color-muted;
        }
      }
    }

    &__rows {
      flex: 1;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;

      #{$root}__columns {
        border-bottom: 1px solid $color-border;

        &:last-child {
          border-bottom: none;
        }
      }
    }

    &__avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: math-rem(32);
      height: math-rem(32);
      border-radius: 50%;
      overflow: hidden;
      background: $color-accent-wash;

      img {
        display: block;
        width: 100%;
        height: 100%;
        max-width: none;
        object-fit: cover;
      }

      &-initials {
        font-size: math-rem(11);
        font-weight: 700;
        color: $color-accent;
        line-height: 1;
      }
    }

    &__row {
      &--banned {
        opacity: 0.6;
      }
    }

    &__badge {
      margin-left: math-rem(6);
      padding: math-rem(1) math-rem(6);
      border-radius: $border-radius-inter;
      background: $color-accent-wash;
      color: $color-accent;
      font-size: math-rem(11);
      font-weight: 600;
    }

    &__status {
      display: inline-block;
      padding: math-rem(2) math-rem(8);
      border-radius: $border-radius-inter;
      font-size: math-rem(12);
      font-weight: 600;

      &--active {
        background: $color-success-bg;
        color: $color-success;
      }

      &--banned {
        background: $color-danger-bg;
        color: $color-danger;
      }
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: math-rem(8);
      white-space: nowrap;
    }
  }
}
</style>
