<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

const rootClass = 'katecms-btn'


type ButtonLink = {
  url?: string
  title?: string
  target?: string
}

const props = withDefaults(defineProps<{
  link?: ButtonLink | string
  variant?: string | string[]
  tag?: string
  active?: boolean
}>(), {
  link: () => ({}),
  variant: '',
  tag: 'a',
  active: false,
})

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const variants = computed(() => {
  const value = props.variant
  const list = Array.isArray(value) ? value : [value]
  return list.filter(v => typeof v === 'string' && v.trim().length > 0)
})

function attrDisabled(value: unknown): boolean {
  return value !== undefined && value !== false && value !== null && value !== 'false'
}

const isDisabled = computed(() => attrDisabled(attrs.disabled))

const classBtn = computed(() => [
  rootClass,
  ...variants.value.map(v => `${rootClass}--${v}`),
  props.tag === 'a' && isDisabled.value ? `${rootClass}--disabled` : '',
  props.active ? `${rootClass}--active` : '',
].filter(Boolean))

const linkObj = computed<ButtonLink>(() => {
  if (typeof props.link === 'string') {
    return { url: props.link, title: '', target: '' }
  }
  return props.link ?? {}
})

const title = computed(() => linkObj.value.title?.trim() || '')

const finalAttrs = computed(() => {
  const next: Record<string, unknown> = { ...attrs }

  if (props.tag === 'a') {
    delete next.disabled
    next.to = linkObj.value.url || ''
    next.target = linkObj.value.target === '_blank' ? '_blank' : null
    if (isDisabled.value) {
      next['aria-disabled'] = 'true'
      next.tabindex = -1
    }
  }
  else if (props.tag === 'button') {
    next.type = attrs.type ?? 'button'
  }

  const ariaLabel = attrs['aria-label']
  next['aria-label'] = (typeof ariaLabel === 'string' && ariaLabel.trim())
    || linkObj.value.title?.trim()
    || 'Button'

  if (props.tag === 'span') {
    next.role = 'button'
  }

  next.class = attrs.class ? [classBtn.value, attrs.class] : classBtn.value

  return next
})

const hasLink = computed(() => props.tag === 'a' && !!linkObj.value.url)

function onLinkClick(event: MouseEvent) {
  if (!isDisabled.value) {
    return
  }
  event.preventDefault()
  event.stopImmediatePropagation()
}

const buttonEl = useTemplateRef<HTMLElement>('buttonEl')

defineExpose({ buttonEl })
</script>

<template>
  <NuxtLink
    v-if="hasLink"
    ref="buttonEl"
    v-bind="finalAttrs"
    @click="onLinkClick"
  >
    <slot>{{ title }}</slot>
  </NuxtLink>
  <component
    :is="tag"
    v-else-if="tag !== 'a'"
    ref="buttonEl"
    v-bind="finalAttrs"
  >
    <slot>{{ title }}</slot>
  </component>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-btn';

#{$root} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  border: 1px solid transparent;
  border-radius: $border-radius-inter;
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  height: math-rem(38);
  padding: 0 math-rem(16);
  font-size: math-rem(14);
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition:
    background-color .3s ease,
    border-color .3s ease,
    color .3s ease,
    box-shadow .3s ease;

  &:focus {
    outline: 0;
  }

  &:focus:not(:focus-visible) {
    outline: 0;
  }

  &:focus-visible {
    outline: 2px solid color-alpha($color-accent, .4);
    outline-offset: 2px;
  }

  &:active:not(:disabled):not(#{$root}--disabled) {
    transform: translateY(1px);
  }

  &:disabled,
  &--disabled {
    background: $color-border !important;
    color: $color-muted !important;
    border-color: transparent !important;
    box-shadow: none !important;
    cursor: not-allowed;
    transform: none !important;
  }

  &--small {
    height: math-rem(32);
    padding: 0 math-rem(12);
    font-size: math-rem(13);

    svg,
    :deep(svg) {
      display: block;
      width: math-rem(18);
      height: math-rem(18) !important;
      object-fit: contain;
      object-position: center;
    }
  }

  &:not(#{$root}--small) {
    svg,
    :deep(svg) {
      display: block;
      width: math-rem(20);
      height: math-rem(20) !important;
      object-fit: contain;
      object-position: center;
    }
  }

  &:not(#{$root}--secondary):not(#{$root}--tertiary):not(#{$root}--red) {
    background: $color-accent;
    color: $color-on-accent;
    box-shadow: $shadow-sm, 0 4px 12px rgba(47, 111, 237, .18);

    &:hover:not(:disabled):not(#{$root}--disabled),
    &#{$root}--active:not(:disabled):not(#{$root}--disabled) {
      background: $color-accent-hover;
    }
  }

  &--secondary {
    background: $color-surface;
    color: $color-ink;
    border-color: $color-border;

    &:hover:not(:disabled):not(#{$root}--disabled) {
      background: $color-bg;
    }

    &#{$root}--active:not(:disabled):not(#{$root}--disabled) {
      background: $color-accent-wash;
      border-color: $color-accent;
      color: $color-accent;
    }
  }

  &--tertiary {
    background: transparent;
    color: $color-muted;
    padding: 0 math-rem(10);

    &:hover:not(:disabled):not(#{$root}--disabled) {
      background: $color-accent-wash;
    }

    &#{$root}--active:not(:disabled):not(#{$root}--disabled) {
      background: $color-accent-wash;
      color: $color-accent;
    }
  }

  &--red {
    background: $color-surface;
    color: $color-danger;
    border-color: $color-danger;

    &:hover:not(:disabled):not(#{$root}--disabled),
    &#{$root}--active:not(:disabled):not(#{$root}--disabled) {
      background: $color-danger-bg;
    }

    &:focus-visible {
      outline-color: color-alpha($color-danger, .4);
    }
  }

  &--icon {
    width: math-rem(38);
    padding: 0 !important;

    &#{$root}--small {
      width: math-rem(32);
    }
  }

  &--full {
    display: flex;
    width: 100%;
  }
}
</style>
