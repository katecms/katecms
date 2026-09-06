<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

type ButtonLink = {
  url?: string
  title?: string
  target?: string
}

const props = withDefaults(defineProps<{
  link?: ButtonLink | string
  variant?: string | string[]
  tag?: string
}>(), {
  link: () => ({}),
  variant: '',
  tag: 'a',
})

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const variants = computed(() => {
  const value = props.variant
  const list = Array.isArray(value) ? value : [value]
  return list.filter(v => typeof v === 'string' && v.trim().length > 0)
})

const classBtn = computed(() => [
  'miraicms-btn',
  ...variants.value.map(v => `miraicms-btn--${v}`),
])

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
    next.to = linkObj.value.url || ''
    next.target = linkObj.value.target === '_blank' ? '_blank' : null
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

const buttonEl = useTemplateRef<HTMLElement>('buttonEl')

defineExpose({ buttonEl })
</script>

<template>
  <NuxtLink
    v-if="hasLink"
    ref="buttonEl"
    v-bind="finalAttrs"
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

$root: '.miraicms-btn';

#{$root} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  border: 1px solid transparent;
  border-radius: $border-radius-inter;
  font-family: inherit;
  font-weight: 600;
  line-height: 1;
  height: math-rem(40);
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
    outline: 2px solid rgba($color-accent, .4);
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
      width: 16px;
      height: 16px;
    }
  }

  &:not(#{$root}--small) {
    svg,
    :deep(svg) {
      display: block;
      width: 18px;
      height: 18px;
    }
  }

  &:not(#{$root}--secondary):not(#{$root}--tertiary):not(#{$root}--red) {
    background: $color-accent;
    color: $color-surface;
    box-shadow: $shadow-sm, 0 4px 12px rgba(47, 111, 237, .18);

    &:hover:not(:disabled):not(#{$root}--disabled) {
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
  }

  &--tertiary {
    background: transparent;
    color: $color-muted;

    &:hover:not(:disabled):not(#{$root}--disabled) {
      background: $color-accent-wash;
    }
  }

  &--red {
    background: $color-surface;
    color: $color-danger;
    border-color: $color-danger;

    &:hover:not(:disabled):not(#{$root}--disabled) {
      background: $color-danger-bg;
    }

    &:focus-visible {
      outline-color: rgba($color-danger, .4);
    }
  }

  &--icon {
    width: math-rem(40);
    padding: 0 !important;

    &#{$root}--small {
      width: math-rem(32);
    }
  }
}
</style>
