<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Field } from '@miraicms/core'

type LinkFieldConfig = Extract<Field, { type: 'link' }>

type LinkValue = {
  url: string
  title: string
  target: string
}

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: LinkFieldConfig
}>(), {
  field: () => ({ type: 'link', label: '' }),
})

const model = defineModel<unknown>()

const rootClass = 'miraicms-link-field'
const isUrlOnly = computed(() => props.field?.returnFormat === 'url')

const current = computed<LinkValue | null>(() => {
  const value = model.value
  if (!value) {
    return null
  }
  if (typeof value === 'string') {
    return value ? { url: value, title: '', target: '' } : null
  }
  const obj = value as { url?: string, title?: string, target?: string }
  return obj.url ? { url: obj.url, title: obj.title ?? '', target: obj.target ?? '' } : null
})

const editing = ref(false)
const url = ref('')
const title = ref('')
const newTab = ref(false)

function openEditor() {
  url.value = current.value?.url ?? ''
  title.value = current.value?.title ?? ''
  newTab.value = current.value?.target === '_blank'
  editing.value = true
}

function save() {
  const link = url.value.trim()
  if (!link) {
    editing.value = false
    return
  }
  model.value = isUrlOnly.value
    ? link
    : { url: link, title: title.value.trim(), target: newTab.value ? '_blank' : '' }
  editing.value = false
}

function remove() {
  model.value = isUrlOnly.value ? '' : null
  editing.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    editing.value = false
  }
}

watch(editing, (open) => {
  if (typeof window === 'undefined') {
    return
  }
  if (open) {
    window.addEventListener('keydown', onKeydown)
  }
  else {
    window.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div :class="`${rootClass}__control`">
        <div
          v-if="current"
          :class="`${rootClass}__chip`"
        >
          <span :class="`${rootClass}__chip-text`">
            <strong v-if="current.title">{{ current.title }}</strong>
            <a
              :href="current.url"
              :target="current.target || undefined"
              rel="noopener noreferrer"
            >{{ current.url }}</a>
          </span>
          <MiraiCmsUiButton
            tag="button"
            :variant="['tertiary', 'small', 'icon']"
            aria-label="Change"
            title="Change"
            @click="openEditor"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              fill="currentColor"
            >
              <path
                d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"
              />
            </svg>
          </MiraiCmsUiButton>
          <MiraiCmsUiButton
            tag="button"
            :variant="['red', 'small', 'icon']"
            aria-label="Remove"
            title="Remove"
            @click="remove"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              fill="currentColor"
            >
              <path
                d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"
              />
            </svg>
          </MiraiCmsUiButton>
        </div>

        <MiraiCmsUiButton
          v-else
          tag="button"
          @click="openEditor"
        >
          Select link
        </MiraiCmsUiButton>
      </div>

      <Teleport to="body">
        <div
          v-if="editing"
          :class="`${rootClass}__overlay`"
          @click.self="editing = false"
        >
          <div
            :class="`${rootClass}__modal`"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="`${fieldKey}-link-title`"
          >
            <div :class="`${rootClass}__modal-header`">
              <h3
                :id="`${fieldKey}-link-title`"
                :class="`${rootClass}__modal-title`"
              >
                Insert / edit link
              </h3>
              <MiraiCmsUiButton
                tag="button"
                :variant="['tertiary', 'small', 'icon']"
                aria-label="Close"
                @click="editing = false"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  fill="currentColor"
                >
                  <path
                    d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"
                  />
                </svg>
              </MiraiCmsUiButton>
            </div>

            <div :class="`${rootClass}__modal-body`">
              <label :class="`${rootClass}__row`">
                <span :class="`${rootClass}__row-label`">URL</span>
                <input
                  v-model="url"
                  type="url"
                  :class="`${rootClass}__input`"
                  placeholder="https://example.com"
                >
              </label>

              <label
                v-if="!isUrlOnly"
                :class="`${rootClass}__row`"
              >
                <span :class="`${rootClass}__row-label`">Link text</span>
                <input
                  v-model="title"
                  type="text"
                  :class="`${rootClass}__input`"
                >
              </label>

              <label
                v-if="!isUrlOnly"
                :class="`${rootClass}__checkbox`"
              >
                <input
                  v-model="newTab"
                  type="checkbox"
                >
                <span>Open in a new tab</span>
              </label>
            </div>

            <div :class="`${rootClass}__modal-footer`">
              <MiraiCmsUiButton
                tag="button"
                :variant="['secondary', 'small']"
                @click="editing = false"
              >
                Cancel
              </MiraiCmsUiButton>
              <MiraiCmsUiButton
                tag="button"
                variant="small"
                @click="save"
              >
                Add link
              </MiraiCmsUiButton>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-link-field';

#{$root} {
  &__overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: math-rem(60) math-rem(16);
    background-color: rgba($color-ink, 0.45);
  }

  &__modal {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 480px;
    max-height: calc(100vh - 120px);
    background-color: $color-surface;
    border-radius: $border-radius;
    box-shadow: $shadow-md;
    overflow: hidden;
  }

  &__modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: math-rem(14) math-rem(18);
    border-bottom: 1px solid $color-border;
  }

  &__modal-title {
    margin: 0;
    font-size: math-rem(16);
    color: $color-ink;
  }

  &__modal-body {
    display: flex;
    flex-direction: column;
    gap: math-rem(12);
    padding: math-rem(18);
    overflow-y: auto;
  }

  &__modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: math-rem(8);
    padding: math-rem(14) math-rem(18);
    border-top: 1px solid $color-border;
  }

  &__row {
    display: flex;
    flex-direction: column;
    gap: math-rem(4);
  }

  &__row-label {
    font-size: math-rem(13);
    color: $color-muted;
  }

  &__input {
    height: math-rem(38);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    padding: 0 math-rem(10);
    color: $color-ink;
    background-color: $color-surface;
    font: inherit;
    font-size: math-rem(14);

    @include placeholder($color-muted);

    &:focus {
      outline: none;
    }

    &:focus-visible {
      border-color: $color-accent;
      box-shadow: 0 0 0 2px rgba($color-accent, 0.35);
    }
  }

  &__checkbox {
    display: inline-flex;
    align-items: center;
    gap: math-rem(6);
    color: $color-ink;
    cursor: pointer;

    input {
      accent-color: $color-accent;
    }
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: math-rem(10);
    padding: math-rem(4) math-rem(4) math-rem(4) math-rem(10);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background-color: $color-surface;
  }

  &__chip-text {
    display: inline-flex;
    align-items: center;
    gap: math-rem(8);
    color: $color-ink;

    a {
      color: $color-accent;
      text-decoration: underline;
    }
  }
}
</style>
