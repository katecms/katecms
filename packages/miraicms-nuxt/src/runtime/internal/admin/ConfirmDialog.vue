<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  open?: boolean
  title?: string
  message?: string
  saveLabel?: string
  discardLabel?: string
  cancelLabel?: string
  busy?: boolean
}>(), {
  open: false,
  title: 'Unsaved changes',
  message: 'Save your changes before leaving?',
  saveLabel: 'Save',
  discardLabel: 'Don\'t save',
  cancelLabel: 'Cancel',
  busy: false,
})

const emit = defineEmits<{
  save: []
  discard: []
  cancel: []
}>()

const rootClass = 'miraicms-confirm-dialog'

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open && !props.busy) {
    emit('cancel')
  }
}

watch(() => props.open, (open) => {
  if (typeof document === 'undefined') {
    return
  }
  if (open) {
    document.addEventListener('keydown', onKeydown)
  }
  else {
    document.removeEventListener('keydown', onKeydown)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      :class="`${rootClass}__overlay`"
      @click.self="!busy && emit('cancel')"
    >
      <div
        :class="rootClass"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${rootClass}-title`"
      >
        <div
          :id="`${rootClass}-title`"
          :class="`${rootClass}__title`"
        >
          {{ title }}
        </div>
        <div :class="`${rootClass}__message`">
          {{ message }}
        </div>
        <div :class="`${rootClass}__actions`">
          <MiraiCmsUiButton
            tag="button"
            :variant="['secondary']"
            :disabled="busy"
            @click="emit('discard')"
          >
            {{ discardLabel }}
          </MiraiCmsUiButton>
          <div :class="`${rootClass}__actions-end`">
            <MiraiCmsUiButton
              tag="button"
              :variant="['secondary']"
              :disabled="busy"
              @click="emit('cancel')"
            >
              {{ cancelLabel }}
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              tag="button"
              :disabled="busy"
              @click="emit('save')"
            >
              {{ busy ? 'Saving…' : saveLabel }}
            </MiraiCmsUiButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-confirm-dialog';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(12);
  width: 100%;
  max-width: math-rem(440);
  padding: math-rem(18);
  background-color: $color-surface;
  border-radius: $border-radius;
  box-shadow: $shadow-md;

  &__overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: math-rem(16);
    background-color: color-alpha($color-ink, 0.45);
  }

  &__title {
    font-size: math-rem(16);
    font-weight: 600;
    color: $color-ink;
  }

  &__message {
    font-size: math-rem(14);
    line-height: 1.45;
    color: $color-muted;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(8);
    margin-top: math-rem(4);

    &-end {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(8);
      margin-left: auto;
    }
  }
}
</style>
