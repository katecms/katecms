<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { $fetch, useHead } from '#imports'
import { OWNER_ROLE } from '@miraicms/core'
import { parseAuthError } from '../../../utils/auth-error'
import { avatarSrc, userInitials } from '../../../utils/admin-users'
import type { AdminUser, RoleOption, UsersResponse } from '../../../utils/admin-users'
import { useCmsPaths } from '../../../composables/useCmsPaths'

useHead({ title: 'Users' })

const rootClass = 'miraicms-users'
const paths = useCmsPaths()

const users = ref<AdminUser[]>([])
const roles = ref<RoleOption[]>([])
const currentUserId = ref<number | null>(null)
const canCreate = ref(false)
const canUpdate = ref(false)

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

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<UsersResponse>('/api/_miraicms/users')
    users.value = res.users
    roles.value = res.roles
    currentUserId.value = res.currentUserId
    canCreate.value = res.canCreate
    canUpdate.value = res.canUpdate
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
    <header :class="`${rootClass}__head`">
      <h1 :class="`${rootClass}__title`">
        Users
      </h1>
      <MiraiCmsUiButton
        v-if="canCreate"
        tag="a"
        :link="{ url: `${paths.users}/create`, title: 'Add user' }"
      >
        Add user
      </MiraiCmsUiButton>
    </header>

    <div
      v-if="error"
      :class="`${rootClass}__error`"
    >
      <strong>Error:</strong> {{ error }}
    </div>

    <p
      v-if="loading"
      :class="`${rootClass}__empty`"
    >
      Loading…
    </p>
    <p
      v-else-if="!users.length"
      :class="`${rootClass}__empty`"
    >
      No users yet.
    </p>

    <div
      v-else
      :class="`${rootClass}__table-wrap`"
    >
      <table :class="`${rootClass}__table`">
        <thead>
          <tr>
            <th
              :class="`${rootClass}__avatar-col`"
              aria-label="Avatar"
            />
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            :class="{ [`${rootClass}__row--banned`]: user.status === 'banned' }"
          >
            <td :class="`${rootClass}__avatar-col`">
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
            </td>
            <td>
              {{ user.email }}
              <span
                v-if="user.id === currentUserId"
                :class="`${rootClass}__badge`"
              >you</span>
            </td>
            <td>{{ user.name || '—' }}</td>
            <td>{{ roleLabel(user.role) }}</td>
            <td>
              <span
                :class="[`${rootClass}__status`, `${rootClass}__status--${user.status}`]"
              >
                {{ statusLabel(user.status) }}
              </span>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td :class="`${rootClass}__actions`">
              <MiraiCmsUiButton
                v-if="canEditRow(user)"
                tag="a"
                :variant="['secondary', 'small']"
                :link="{ url: `${paths.users}/${user.id}`, title: 'Edit' }"
              >
                Edit
              </MiraiCmsUiButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../../assets/styles" as *;

$root: '.miraicms-users';

@include miraicms-wrapper {
  #{$root} {
    display: flex;
    flex-direction: column;
    gap: math-rem(16);

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: math-rem(16);
    }

    &__title {
      margin: 0;
      font-size: math-rem(20);
      font-weight: 600;
      color: $color-ink;
    }

    &__error {
      padding: math-rem(12) math-rem(14);
      border: 1px solid $color-danger;
      border-radius: $border-radius;
      background: $color-danger-bg;
      color: $color-danger;
      font-size: math-rem(14);
    }

    &__empty {
      margin: 0;
      color: $color-muted;
      font-size: math-rem(14);
    }

    &__table-wrap {
      overflow-x: auto;
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
    }

    &__table {
      width: 100%;
      border-collapse: collapse;
      font-size: math-rem(14);

      th,
      td {
        text-align: left;
        padding: math-rem(10) math-rem(14);
        border-bottom: 1px solid $color-border;
        vertical-align: middle;
      }

      th {
        font-size: math-rem(12);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: $color-muted;
        background: $color-bg;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }
    }

    &__avatar-col {
      width: math-rem(48);
      padding-right: 0;
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
    }

    &__avatar-initials {
      font-size: math-rem(11);
      font-weight: 700;
      color: $color-accent;
      line-height: 1;
    }

    &__row--banned td {
      opacity: 0.6;
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
      text-align: right;
      white-space: nowrap;
    }
  }
}
</style>
