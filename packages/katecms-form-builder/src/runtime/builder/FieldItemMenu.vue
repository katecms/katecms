<script setup lang="ts">
import type { CSSProperties } from 'vue'

defineProps<{
  fieldId: string
  locked: boolean
  menuOpen: boolean
  menuSide: 'left' | 'right'
  moveOpen: boolean
  moveStyle?: CSSProperties
  steps: { id: string, label: string }[]
  repeaters: { id: string, label: string }[]
  sections: { id: string, label: string }[]
}>()

const emit = defineEmits<{
  clone: []
  remove: []
  deselect: []
  'toggle-menu': [event: MouseEvent]
  'move-enter': [event: MouseEvent]
  'move-leave': []
  'move-keep': []
  'move-step': [stepId: string]
  'move-repeater': [repeaterId: string]
}>()

const rootClass = 'katecms-form-builder'
</script>

<template>
  <div
    :class="`${rootClass}__item-actions`"
    @pointerdown.stop
  >
    <button
      v-if="!locked"
      type="button"
      :class="`${rootClass}__item-action`"
      aria-label="Clone"
      title="Clone"
      @click="emit('clone')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="17"
        viewBox="0 0 30 30"
        aria-hidden="true"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13.89,11.7h10a2.2,2.2,0,0,1,2.22,2.2v9.9A2.2,2.2,0,0,1,23.88,26h-10a2.2,2.2,0,0,1-2.22-2.2V13.9A2.2,2.2,0,0,1,13.89,11.7Z"
        />
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7.23,18.3H6.12A2.2,2.2,0,0,1,3.9,16.1V6.2A2.2,2.2,0,0,1,6.12,4h10a2.2,2.2,0,0,1,2.22,2.2V7.3"
        />
      </svg>
    </button>
    <button
      v-if="!locked"
      type="button"
      :class="`${rootClass}__item-action`"
      aria-label="Remove"
      title="Remove"
      @click="emit('remove')"
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <g
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
          <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
        </g>
      </svg>
    </button>
    <div :class="`${rootClass}__more`">
      <button
        type="button"
        :class="`${rootClass}__item-action`"
        aria-label="More Options"
        title="More Options"
        :aria-expanded="menuOpen"
        @click="emit('toggle-menu', $event)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="5"
            cy="12"
            r="1.6"
            fill="currentColor"
          />
          <circle
            cx="12"
            cy="12"
            r="1.6"
            fill="currentColor"
          />
          <circle
            cx="19"
            cy="12"
            r="1.6"
            fill="currentColor"
          />
        </svg>
      </button>
      <div
        v-if="menuOpen"
        :class="[`${rootClass}__item-menu`, { 'is-left': menuSide === 'left' }]"
      >
        <button
          type="button"
          @click="emit('deselect')"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 30 30"
            aria-hidden="true"
          >
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6.4,4.16H23.6a2.43,2.43,0,0,1,2.45,2.41V23.43a2.43,2.43,0,0,1-2.45,2.41H6.4A2.43,2.43,0,0,1,4,23.43V6.57A2.43,2.43,0,0,1,6.4,4.16Z"
            />
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12.4,20.7H10.3a1,1,0,0,1-1-1V17.6"
            />
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20.7,17.6v2.1a1,1,0,0,1-1,1H17.6"
            />
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.6,9.3h2.1a1,1,0,0,1,1,1v2.1"
            />
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.3,12.4V10.3a1,1,0,0,1,1-1h2.1"
            />
          </svg>
          <span>Deselect</span>
        </button>
        <button
          v-if="!locked"
          type="button"
          @click="emit('clone')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 30 30"
            aria-hidden="true"
          >
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13.89,11.7h10a2.2,2.2,0,0,1,2.22,2.2v9.9A2.2,2.2,0,0,1,23.88,26h-10a2.2,2.2,0,0,1-2.22-2.2V13.9A2.2,2.2,0,0,1,13.89,11.7Z"
            />
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7.23,18.3H6.12A2.2,2.2,0,0,1,3.9,16.1V6.2A2.2,2.2,0,0,1,6.12,4h10a2.2,2.2,0,0,1,2.22,2.2V7.3"
            />
          </svg>
          <span>Clone</span>
        </button>
        <div
          v-if="steps.length || repeaters.length || sections.length"
          :class="`${rootClass}__move`"
          @mouseenter="emit('move-enter', $event)"
          @mouseleave="emit('move-leave')"
        >
          <button type="button">
            <svg
              height="15"
              width="15"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M6.97 4.78a.75.75 0 0 0 1.06 0l1.22-1.22v3.19a.75.75 0 0 0 1.5 0V3.56l1.22 1.22a.75.75 0 1 0 1.06-1.06l-2.5-2.5a.75.75 0 0 0-1.06 0l-2.5 2.5a.75.75 0 0 0 0 1.06zM4.78 8.03a.75.75 0 0 0-1.06-1.06l-2.5 2.5a.75.75 0 0 0 0 1.06l2.5 2.5a.75.75 0 0 0 1.06-1.06l-1.22-1.22h3.19a.75.75 0 0 0 0-1.5H3.56l1.22-1.22zm10.44-1.06a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1 0 1.06l-2.5 2.5a.75.75 0 1 1-1.06-1.06l1.22-1.22h-3.19a.75.75 0 0 1 0-1.5h3.19l-1.22-1.22a.75.75 0 0 1 0-1.06zm-5.97 9.47l-1.22-1.22a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l2.5-2.5a.75.75 0 1 0-1.06-1.06l-1.22 1.22v-3.19a.75.75 0 0 0-1.5 0v3.19z"
              />
            </svg>
            <span>Move to</span>
          </button>
          <div
            :class="[`${rootClass}__move-steps`, { 'is-open': moveOpen }]"
            :style="moveOpen ? moveStyle : undefined"
            @mouseenter="emit('move-keep')"
          >
            <span v-if="steps.length && (repeaters.length || sections.length)">Steps</span>
            <button
              v-for="step in steps"
              :key="step.id"
              type="button"
              @click="emit('move-step', step.id)"
            >
              {{ step.label }}
            </button>
            <span v-if="repeaters.length">Repeaters</span>
            <button
              v-for="repeater in repeaters"
              :key="repeater.id"
              type="button"
              @click="emit('move-repeater', repeater.id)"
            >
              {{ repeater.label }}
            </button>
            <span v-if="sections.length">Sections</span>
            <button
              v-for="section in sections"
              :key="section.id"
              type="button"
              @click="emit('move-repeater', section.id)"
            >
              {{ section.label }}
            </button>
          </div>
        </div>
        <button
          v-if="!locked"
          type="button"
          @click="emit('remove')"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <g
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 7h16" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
              <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
            </g>
          </svg>
          <span>Remove</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "katecms/styles" as *;
$root: '.katecms-form-builder';

#{$root}__item-actions {
  display: none;
  position: absolute;
  top: math-rem(-14);
  right: math-rem(-1);
  z-index: 99;
  align-items: center;
  background-color: $color-accent-wash;
  border-radius: $border-radius $border-radius 0 $border-radius;
}

#{$root}__item-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: math-rem(28);
  height: math-rem(28);
  padding: 0 math-rem(6);
  border: 0;
  background: transparent;
  color: $color-ink;
  cursor: pointer;
  box-shadow: none;
  border-radius: 0;

  &:nth-child(1) {
    border-radius: $border-radius-inter 0 0 $border-radius-inter;
  }

  svg {
    display: block;
    width: math-rem(18);
    height: auto;
  }

  &:hover {
    background: $color-accent;
    color: $color-on-accent;
  }
}

#{$root}__more {
  position: relative;

  #{$root}__item-action {
    border-radius: 0 $border-radius-inter $border-radius-inter 0;
  }
}

#{$root}__item-menu {
  position: absolute;
  z-index: 6;
  top: 100%;
  left: 0;
  display: flex;
  flex-direction: column;
  min-width: math-rem(168);
  margin-top: math-rem(4);
  padding: math-rem(4);
  border: 1px solid $color-border;
  border-radius: $border-radius;
  background: $color-surface;
  box-shadow: $shadow-md;

  &.is-left {
    left: auto;
    right: 0;
  }

  &::before {
    content: '';
    position: absolute;
    top: math-rem(-8);
    right: 0;
    left: 0;
    height: math-rem(8);
  }

  button {
    display: flex;
    align-items: center;
    gap: math-rem(8);
    width: 100%;
    padding: math-rem(6) math-rem(8);
    border: 0;
    border-radius: math-rem(4);
    background: transparent;
    color: $color-ink;
    font: inherit;
    font-size: math-rem(13);
    text-align: left;
    cursor: pointer;

    &:hover {
      background: $color-bg;
    }
  }
}

#{$root}__move {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 100%;
    width: math-rem(12);
  }

  &-steps {
    display: none;
    position: fixed;
    z-index: 30;
    flex-direction: column;
    min-width: math-rem(168);
    padding: math-rem(4);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    box-shadow: $shadow-md;

    button {
      display: flex;
      align-items: center;
      gap: math-rem(8);
      width: 100%;
      padding: math-rem(6) math-rem(8);
      border: 0;
      border-radius: math-rem(4);
      background: transparent;
      color: $color-ink;
      font: inherit;
      font-size: math-rem(13);
      text-align: left;
      cursor: pointer;

      &:hover {
        background: $color-bg;
      }
    }

    span {
      padding: math-rem(4) math-rem(8) 0;
      color: $color-muted;
      font-size: math-rem(11);
      font-weight: 600;
    }

    &.is-open {
      display: flex;
    }
  }

  &:hover > &-steps,
  &:hover > &-steps.is-open {
    display: flex;
  }
}
</style>
