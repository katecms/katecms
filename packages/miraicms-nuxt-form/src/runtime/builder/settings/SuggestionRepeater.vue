<script setup lang="ts">
import { ref } from 'vue'
import type { FormSuggestion } from '../../form/text-options'

const props = defineProps<{
  fieldKey: string
  model: FormSuggestion[]
}>()

const emit = defineEmits<{
  update: [value: FormSuggestion[]]
}>()

const rowRefs = ref<Array<HTMLElement | null>>([])
const dragIndex = ref<number | null>(null)

function setRowRef(el: Element | null, index: number) {
  rowRefs.value[index] = el instanceof HTMLElement ? el : null
}

function patchAt(index: number, partial: Partial<FormSuggestion>) {
  emit('update', props.model.map((item, itemIndex) => itemIndex === index ? { ...item, ...partial } : item))
}

function add() {
  emit('update', [...props.model, { id: `sg_${crypto.randomUUID()}`, label: '', value: '' }])
}

function remove(index: number) {
  emit('update', props.model.filter((_, itemIndex) => itemIndex !== index))
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
  const target = from < insertAt ? insertAt - 1 : insertAt
  next.splice(target, 0, moved)
  dragIndex.value = target
  emit('update', next)
}

function onHandleDown(index: number, event: MouseEvent) {
  if (event.button !== 0) {
    return
  }
  event.preventDefault()
  dragIndex.value = index
  const move = (moveEvent: MouseEvent) => {
    const from = dragIndex.value
    if (from == null) {
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
      if (moveEvent.clientY < rect.top + rect.height / 2) {
        insertAt = i
        break
      }
      insertAt = i + 1
    }
    reorder(from, insertAt)
  }
  const up = () => {
    dragIndex.value = null
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
}
</script>

<template>
  <div class="miraicms-suggestion-list">
    <div
      v-for="(item, index) in model"
      :key="item.id"
      :ref="(el) => setRowRef(el as Element | null, index)"
      class="miraicms-suggestion-list__row"
    >
      <button
        type="button"
        class="miraicms-suggestion-list__handle"
        aria-label="Move suggestion"
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
      <MiraiCmsUiButton
        tag="button"
        :variant="['red', 'small']"
        aria-label="Remove suggestion"
        @click="remove(index)"
      >
        Remove
      </MiraiCmsUiButton>
    </div>
    <MiraiCmsUiButton
      tag="button"
      variant="secondary"
      @click="add"
    >
      Add suggestion
    </MiraiCmsUiButton>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

.miraicms-suggestion-list {
  display: flex;
  flex-direction: column;
  gap: math-rem(8);

  &__row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: math-rem(8);
    align-items: end;
  }

  &__handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: math-rem(28);
    height: math-rem(32);
    margin-bottom: math-rem(2);
    padding: 0;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-bg;
    color: $color-muted;
    cursor: grab;
  }
}
</style>
