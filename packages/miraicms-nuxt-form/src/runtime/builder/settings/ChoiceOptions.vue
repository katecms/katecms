<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import type { FormChoiceOption, FormIcon } from '../../form/text-options'
import { normalizeIcon } from '../../form/text-options'
import OptionPopup from './OptionPopup.vue'

const props = withDefaults(defineProps<{
  fieldKey: string
  model: FormChoiceOption[]
  showImage?: boolean
  showRequired?: boolean
  showDisabled?: boolean
  singleCheck?: boolean
  embedded?: boolean
  showAddGroup?: boolean
  count?: number
}>(), {
  showImage: false,
  showRequired: false,
  showDisabled: false,
  singleCheck: false,
  embedded: false,
  showAddGroup: false,
})

const emit = defineEmits<{
  update: [value: FormChoiceOption[]]
  addGroup: []
  addOption: []
}>()

const open = ref(false)

const rowRefs = ref<Array<HTMLElement | null>>([])
const isDragging = ref(false)
const draggingIndex = ref<number | null>(null)
const dropIndex = ref(0)
const dragOffset = ref({ x: 0, y: 0 })
const dragSize = ref({ width: 0, height: 0 })
const dragPosition = ref({ left: 0, top: 0 })

function setRowRef(el: Element | null, index: number) {
  rowRefs.value[index] = el instanceof HTMLElement ? el : null
}

function blank(label: string, value: string): FormChoiceOption {
  return {
    id: `opt_${crypto.randomUUID()}`,
    image: null,
    label,
    value,
    checked: false,
    required: false,
    disabled: false,
  }
}

function patchAt(index: number, partial: Partial<FormChoiceOption>) {
  emit('update', props.model.map((item, itemIndex) => {
    if (partial.checked === true && props.singleCheck) {
      return { ...item, ...(itemIndex === index ? partial : {}), checked: itemIndex === index }
    }
    return itemIndex === index ? { ...item, ...partial } : item
  }))
}

function addFromFooter() {
  if (props.showAddGroup) {
    emit('addOption')
    return
  }
  addAt(props.model.length - 1)
}

function addAt(index: number) {
  const n = props.model.length + 1
  const next = [...props.model]
  next.splice(index + 1, 0, blank(`Option ${n}`, `option_${n}`))
  emit('update', next)
}

function cloneAt(index: number) {
  const source = props.model[index]
  if (!source) {
    return
  }
  const next = [...props.model]
  next.splice(index + 1, 0, {
    ...source,
    id: `opt_${crypto.randomUUID()}`,
    checked: props.singleCheck ? false : source.checked,
  })
  emit('update', next)
}

function remove(index: number) {
  emit('update', props.model.filter((_, itemIndex) => itemIndex !== index))
}

function setImage(index: number, value: unknown) {
  patchAt(index, { image: iconValue(value) })
}

function iconValue(value: unknown): FormIcon | null {
  return normalizeIcon(value)
}

const placeholderStyle = computed(() => ({
  width: `${dragSize.value.width}px`,
  height: `${dragSize.value.height}px`,
}))

function rowStyle(index: number): CSSProperties | undefined {
  if (!isDragging.value || draggingIndex.value !== index) {
    return undefined
  }
  return {
    position: 'fixed',
    left: `${dragPosition.value.left}px`,
    top: `${dragPosition.value.top}px`,
    width: `${dragSize.value.width}px`,
    height: `${dragSize.value.height}px`,
    zIndex: 1000,
  }
}

function reorder(from: number, insertAt: number) {
  if (insertAt === from || insertAt === from + 1) {
    return
  }
  const next = [...props.model]
  const [moved] = next.splice(from, 1)
  if (!moved) {
    return
  }
  next.splice(from < insertAt ? insertAt - 1 : insertAt, 0, moved)
  emit('update', next)
}

function updateDropIndex(clientY: number) {
  const from = draggingIndex.value
  if (from === null) {
    return
  }
  let insertAt = props.model.length
  for (let i = 0; i < props.model.length; i++) {
    if (i === from) {
      continue
    }
    const el = rowRefs.value[i]
    if (!el) {
      continue
    }
    const rect = el.getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) {
      insertAt = i
      break
    }
    insertAt = i + 1
  }
  dropIndex.value = insertAt
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging.value) {
    return
  }
  dragPosition.value = {
    left: event.clientX - dragOffset.value.x,
    top: event.clientY - dragOffset.value.y,
  }
  updateDropIndex(event.clientY)
}

function resetDrag() {
  isDragging.value = false
  draggingIndex.value = null
  dropIndex.value = 0
  dragSize.value = { width: 0, height: 0 }
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function onMouseUp() {
  if (isDragging.value && draggingIndex.value !== null) {
    reorder(draggingIndex.value, dropIndex.value)
  }
  resetDrag()
}

function onHandleDown(index: number, event: MouseEvent) {
  if (event.button !== 0) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  const handle = event.currentTarget
  if (!(handle instanceof HTMLElement)) {
    return
  }
  const row = handle.closest<HTMLElement>('.miraicms-choice-options__row')
  if (!row) {
    return
  }
  const rect = row.getBoundingClientRect()
  draggingIndex.value = index
  dropIndex.value = index
  dragOffset.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  dragSize.value = { width: rect.width, height: rect.height }
  dragPosition.value = { left: rect.left, top: rect.top }
  isDragging.value = true
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(resetDrag)
</script>

<template>
  <div class="miraicms-choice-options">
    <template v-if="!embedded">
      <MiraiCmsUiButton
        tag="button"
        variant="secondary"
        @click="open = true"
      >
        Edit Options ({{ count ?? model.length }})
      </MiraiCmsUiButton>
    </template>
    <component
      :is="embedded ? 'div' : OptionPopup"
      v-bind="embedded ? { class: 'miraicms-choice-options__inline' } : { open, title: 'Options' }"
      @update:open="open = $event"
    >
      <template
        v-for="(item, index) in model"
        :key="item.id"
      >
        <div
          v-if="isDragging && dropIndex === index"
          class="miraicms-choice-options__placeholder"
          :style="placeholderStyle"
        />

        <div
          :ref="(el) => setRowRef(el as Element | null, index)"
          class="miraicms-choice-options__row"
          :class="{ 'is-floating': isDragging && draggingIndex === index }"
          :style="rowStyle(index)"
        >
          <button
            type="button"
            class="miraicms-choice-options__handle"
            aria-label="Move option"
            @mousedown="onHandleDown(index, $event)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <g
                fill="currentColor"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle
                  cx="8"
                  cy="4"
                  r="1"
                />
                <circle
                  cx="16"
                  cy="4"
                  r="1"
                />
                <circle
                  cx="8"
                  cy="12"
                  r="1"
                />
                <circle
                  cx="16"
                  cy="12"
                  r="1"
                />
                <circle
                  cx="8"
                  cy="20"
                  r="1"
                />
                <circle
                  cx="16"
                  cy="20"
                  r="1"
                />
              </g>
            </svg>
          </button>
          <MiraiCmsImageField
            v-if="showImage"
            class="miraicms-choice-options__image"
            :model-value="item.image"
            :field-key="`${fieldKey}-image-${item.id}`"
            :field="{ type: 'image', label: 'Image', iconMode: true, returnFormat: 'array' }"
            @update:model-value="setImage(index, $event)"
          />
          <MiraiCmsTextField
            :model-value="item.label"
            :field-key="`${fieldKey}-label-${item.id}`"
            :field="{ type: 'text', label: 'Label' }"
            @update:model-value="patchAt(index, { label: String($event ?? '') })"
          />
          <MiraiCmsTextField
            :model-value="item.value"
            :field-key="`${fieldKey}-value-${item.id}`"
            :field="{ type: 'text', label: 'Value' }"
            @update:model-value="patchAt(index, { value: String($event ?? '') })"
          />
          <MiraiCmsTrueFalseField
            class="miraicms-choice-options__checkbox"
            :model-value="item.checked"
            :field-key="`${fieldKey}-check-${item.id}`"
            :field="{ type: 'true_false', label: 'Check' }"
            @update:model-value="patchAt(index, { checked: $event === true })"
          />
          <MiraiCmsTrueFalseField
            v-if="showRequired"
            class="miraicms-choice-options__checkbox"
            :model-value="item.required"
            :field-key="`${fieldKey}-required-${item.id}`"
            :field="{ type: 'true_false', label: 'Required' }"
            @update:model-value="patchAt(index, { required: $event === true })"
          />
          <MiraiCmsTrueFalseField
            v-if="showDisabled"
            class="miraicms-choice-options__checkbox"
            :model-value="item.disabled"
            :field-key="`${fieldKey}-disabled-${item.id}`"
            :field="{ type: 'true_false', label: 'Disabled' }"
            @update:model-value="patchAt(index, { disabled: $event === true })"
          />
          <div class="miraicms-choice-options__actions">
            <MiraiCmsUiButton
              tag="button"
              :variant="['secondary', 'small', 'icon']"
              @click="addAt(index)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 8.21875L14.513 8.28663"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                />
                <path
                  d="M8.22254 1.99621L8.29042 14.5092"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                />
              </svg>
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              tag="button"
              :variant="['secondary', 'small', 'icon']"
              @click="cloneAt(index)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 30 30"
              ><path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M13.89,11.7h10a2.2,2.2,0,0,1,2.22,2.2v9.9A2.2,2.2,0,0,1,23.88,26h-10a2.2,2.2,0,0,1-2.22-2.2V13.9A2.2,2.2,0,0,1,13.89,11.7Z"
              /><path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M7.23,18.3H6.12A2.2,2.2,0,0,1,3.9,16.1V6.2A2.2,2.2,0,0,1,6.12,4h10a2.2,2.2,0,0,1,2.22,2.2V7.3"
              /></svg>
            </MiraiCmsUiButton>
            <MiraiCmsUiButton
              tag="button"
              :variant="['red', 'small', 'icon']"
              @click="remove(index)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 5.25H15"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                />
                <path
                  d="M7.5 8.25V12.75"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                />
                <path
                  d="M10.5 8.25V12.75"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                />
                <path
                  d="M3.75 5.25L4.5 14.25C4.5 14.6478 4.65804 15.0294 4.93934 15.3107C5.22064 15.592 5.60218 15.75 6 15.75H12C12.3978 15.75 12.7794 15.592 13.0607 15.3107C13.342 15.0294 13.5 14.6478 13.5 14.25L14.25 5.25"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                />
                <path
                  d="M6.75 5.25V3C6.75 2.80109 6.82902 2.61032 6.96967 2.46967C7.11032 2.32902 7.30109 2.25 7.5 2.25H10.5C10.6989 2.25 10.8897 2.32902 11.0303 2.46967C11.171 2.61032 11.25 2.80109 11.25 3V5.25"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                />
              </svg>
            </MiraiCmsUiButton>
          </div>
        </div>
      </template>
      <div
        v-if="isDragging && dropIndex === model.length"
        class="miraicms-choice-options__placeholder"
        :style="placeholderStyle"
      />
      <slot name="extra" />
      <div
        v-if="!embedded"
        class="miraicms-choice-options__footer"
      >
        <MiraiCmsUiButton
          tag="button"
          variant="secondary"
          @click="addFromFooter"
        >
          Add Option
        </MiraiCmsUiButton>
        <MiraiCmsUiButton
          v-if="showAddGroup"
          tag="button"
          variant="secondary"
          @click="emit('addGroup')"
        >
          Add Group
        </MiraiCmsUiButton>
      </div>
    </component>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

.miraicms-choice-options {
  display: flex;
  flex-direction: column;
  gap: math-rem(8);

  &__inline {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
  }

  &__row {
    display: flex;
    flex-wrap: nowrap;
    gap: math-rem(8);
    min-width: max-content;
    padding: math-rem(8);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;

    :deep(> *) {
      flex: 1 0 math-rem(150);
    }

    > .miraicms-choice-options__handle,
    > .miraicms-choice-options__actions {
      flex: 0 0 auto;
      min-width: 0;
    }

    &.is-floating {
      z-index: 1100;
      box-shadow: $shadow-md;
    }
  }

  &__handle {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    width: math-rem(24);
    height: math-rem(38);
    padding: 0;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $color-bg;
    color: $color-muted;
    cursor: grab;

    svg {
      width: math-rem(16);
      height: auto;
    }
  }

  &__image {
    flex: 0 0 math-rem(140);
    max-width: math-rem(140);
  }

  &__checkbox {
    flex: 0 0 math-rem(70);
    max-width: math-rem(70);
  }

  &__actions {
    display: flex;
    flex-wrap: nowrap;
    gap: math-rem(6);
    flex: 0 0 auto;
    min-width: 0;
    align-self: center;
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(8);
    margin-top: math-rem(8);
  }

  &__placeholder {
    box-sizing: border-box;
    border: 1px dashed $color-border;
    border-radius: $border-radius;
    background: $color-bg;
  }
}
</style>
