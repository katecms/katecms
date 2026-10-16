<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import type { FormIcon, FormRatingOption } from '../../form/text-options'
import { normalizeIcon } from '../../form/text-options'

const props = defineProps<{
  fieldKey: string
  model: FormRatingOption[]
}>()

const emit = defineEmits<{
  update: [value: FormRatingOption[]]
}>()

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

function patchAt(index: number, partial: Partial<FormRatingOption>) {
  emit('update', props.model.map((item, itemIndex) => {
    if (partial.checked === true) {
      return { ...item, ...partial, checked: itemIndex === index }
    }
    return itemIndex === index ? { ...item, ...partial } : item
  }))
}

function addAt(index: number) {
  const n = props.model.length + 1
  const next = [...props.model]
  next.splice(index + 1, 0, {
    id: `rt_${crypto.randomUUID()}`,
    icon: null,
    label: String(n),
    value: String(n),
    checked: false,
  })
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
    id: `rt_${crypto.randomUUID()}`,
    checked: false,
  })
  emit('update', next)
}

function remove(index: number) {
  emit('update', props.model.filter((_, itemIndex) => itemIndex !== index))
}

function setIcon(index: number, value: unknown) {
  patchAt(index, { icon: iconValue(value) })
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
  const row = handle.closest<HTMLElement>('.miraicms-rating-options__row')
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
  <div class="miraicms-rating-options">
    <template
      v-for="(item, index) in model"
      :key="item.id"
    >
      <div
        v-if="isDragging && dropIndex === index"
        class="miraicms-rating-options__placeholder"
        :style="placeholderStyle"
      />
      <div
        :ref="(el) => setRowRef(el as Element | null, index)"
        class="miraicms-rating-options__row"
        :class="{ 'is-floating': isDragging && draggingIndex === index }"
        :style="rowStyle(index)"
      >
        <button
          type="button"
          class="miraicms-rating-options__handle"
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
              <circle cx="8" cy="4" r="1" /><circle cx="16" cy="4" r="1" />
              <circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" />
              <circle cx="8" cy="20" r="1" /><circle cx="16" cy="20" r="1" />
            </g>
          </svg>
        </button>
        <MiraiCmsImageField
          :model-value="item.icon"
          :field-key="`${fieldKey}-icon-${item.id}`"
          :field="{ type: 'image', label: 'Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="setIcon(index, $event)"
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
          :model-value="item.checked"
          :field-key="`${fieldKey}-check-${item.id}`"
          :field="{ type: 'true_false', label: 'Check' }"
          @update:model-value="patchAt(index, { checked: $event === true })"
        />
        <div class="miraicms-rating-options__actions">
          <MiraiCmsUiButton
            tag="button"
            variant="secondary"
            @click="addAt(index)"
          >
            Add Option
          </MiraiCmsUiButton>
          <MiraiCmsUiButton
            tag="button"
            variant="secondary"
            @click="cloneAt(index)"
          >
            Clone Option
          </MiraiCmsUiButton>
          <MiraiCmsUiButton
            tag="button"
            :variant="['red', 'small']"
            @click="remove(index)"
          >
            Delete Option
          </MiraiCmsUiButton>
        </div>
      </div>
    </template>
    <div
      v-if="isDragging && dropIndex === model.length"
      class="miraicms-rating-options__placeholder"
      :style="placeholderStyle"
    />
    <MiraiCmsUiButton
      v-if="!model.length"
      tag="button"
      variant="secondary"
      @click="addAt(-1)"
    >
      Add Option
    </MiraiCmsUiButton>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

.miraicms-rating-options {
  display: flex;
  flex-direction: column;
  gap: math-rem(8);

  &__row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: math-rem(8);
    align-items: end;
    padding: math-rem(8);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;

    &.is-floating {
      z-index: 1000;
      box-shadow: $shadow-md;
    }
  }

  &__handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: math-rem(28);
    height: math-rem(32);
    padding: 0;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-bg;
    color: $color-muted;
    cursor: grab;
  }

  &__placeholder {
    box-sizing: border-box;
    border: 1px dashed $color-border;
    border-radius: $border-radius;
    background: $color-bg;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(6);
    grid-column: 1 / -1;
  }
}
</style>
