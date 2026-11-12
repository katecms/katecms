<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { MediaItem } from '@katecms/core'
import { useAuth } from '../../composables/useAuth'
import { useCmsPaths } from '../../composables/useCmsPaths'
import { avatarSrc, userInitials } from '../../utils/admin-users'

const rootClass = 'katecms-user'
const paths = useCmsPaths()
const { user, logout, loggingOut } = useAuth()

const menuOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const avatarUrl = computed(() => avatarSrc(user.value?.avatar as MediaItem | null | undefined))

const displayName = computed(() => {
  const current = user.value
  if (!current) {
    return ''
  }
  const name = current.name?.trim()
  if (name) {
    return name
  }
  return current.email.split('@')[0] || current.email
})

const initials = computed(() => {
  const current = user.value
  if (!current) {
    return '?'
  }
  return userInitials(current)
})

const profileTo = computed(() => {
  const id = user.value?.id
  return id ? paths.user(id) : paths.users
})

function closeMenu() {
  menuOpen.value = false
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) {
    return
  }
  const target = event.target as Node | null
  if (target && rootEl.value?.contains(target)) {
    return
  }
  closeMenu()
}

async function onLogout() {
  closeMenu()
  await logout()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div
    v-if="user"
    ref="rootEl"
    :class="rootClass"
  >
    <button
      type="button"
      :class="[`${rootClass}__btn`, { 'is-open': menuOpen }]"
      :aria-expanded="menuOpen"
      aria-haspopup="menu"
      @click.stop="toggleMenu"
    >
      <span :class="`${rootClass}__avatar`">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          alt=""
        >
        <span
          v-else
          :class="`${rootClass}__initials`"
        >{{ initials }}</span>
      </span>
      <span :class="`${rootClass}__meta`">
        <span
          v-if="displayName"
          :class="`${rootClass}__name`"
        >{{ displayName }}</span>
        <span :class="`${rootClass}__email`">{{ user.email }}</span>
      </span>
    </button>

    <div
      v-if="menuOpen"
      :class="`${rootClass}__menu`"
      role="menu"
      @click.stop
    >
      <NuxtLink
        :to="profileTo"
        role="menuitem"
        :class="`${rootClass}__menu-item`"
        @click="closeMenu"
      >
        Profile
      </NuxtLink>
      <button
        type="button"
        role="menuitem"
        :class="[`${rootClass}__menu-item`, `${rootClass}__menu-item--danger`]"
        :disabled="loggingOut"
        @click="onLogout"
      >
        {{ loggingOut ? 'Signing out…' : 'Sign out' }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-user';

@include katecms-wrapper {
  #{$root} {
    position: relative;
    max-width: math-rem(240);

    &__btn {
      display: flex;
      align-items: center;
      gap: math-rem(10);
      width: 100%;
      padding: math-rem(4) math-rem(8);
      border: none;
      border-radius: $border-radius;
      background: transparent;
      color: inherit;
      text-align: left;
      font: inherit;
      cursor: pointer;

      &:hover,
      &.is-open {
        background: $color-accent-wash;
      }
    }

    &__avatar {
      flex-shrink: 0;
      width: math-rem(32);
      height: math-rem(32);
      border-radius: 50%;
      overflow: hidden;
      background: $color-accent-wash;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        display: block;
        width: 100%;
        height: 100%;
        max-width: none;
        object-fit: cover;
      }
    }

    &__initials {
      font-size: math-rem(11);
      font-weight: 700;
      color: $color-accent;
      line-height: 1;
    }

    &__meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: math-rem(2);
    }

    &__name {
      font-size: math-rem(13);
      font-weight: 600;
      color: $color-ink;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__email {
      font-size: math-rem(12);
      color: $color-muted;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__menu {
      position: absolute;
      top: calc(100% + math-rem(4));
      right: 0;
      left: 0;
      z-index: 20;
      display: flex;
      flex-direction: column;
      padding: math-rem(4);
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $border-radius;
      box-shadow: $shadow-md;

      &-item {
        display: block;
        width: 100%;
        padding: math-rem(8) math-rem(10);
        border: none;
        border-radius: $border-radius-inter;
        background: transparent;
        color: $color-ink;
        text-align: left;
        text-decoration: none;
        font: inherit;
        font-size: math-rem(14);
        cursor: pointer;

        &:hover {
          background: $color-accent-wash;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        &--danger {
          color: $color-danger;
        }
      }
    }
  }
}
</style>
