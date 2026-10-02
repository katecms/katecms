<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import FieldSettings from './FieldSettings.vue'
import type { Breakpoint, FieldType, FormContent, FormField, FormStatus, LayoutItem } from '../form/model'
import {
  BREAKPOINTS,
  FIELD_LABELS,
  FIELD_TYPES,
  GRID_COLUMNS,
  ROW_HEIGHT,
  addField,
  copyDesktopLayout,
  removeField,
  replaceField,
  setLayoutItem,
} from '../form/model'

const name = defineModel<string>('name', { required: true })
const slug = defineModel<string>('slug', { required: true })
const status = defineModel<FormStatus>('status', { required: true })
const content = defineModel<FormContent>('content', { required: true })

const rootRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const breakpoint = ref<Breakpoint>('desktop')
const selectedId = ref<string | null>(null)
const dragRow = ref(0)

interface DragState {
  pointerId: number
  fieldId: string
  mode: 'move' | 'resize'
  grabCol: number
  grabRow: number
}

const drag = ref<DragState | null>(null)

const layout = computed(() => content.value.layouts[breakpoint.value])
const selected = computed(() => content.value.fields.find(field => field.id === selectedId.value) ?? null)
const selectedItem = computed(() => layout.value.find(item => item.fieldId === selectedId.value) ?? null)
const rowCount = computed(() => {
  const maxRow = layout.value.reduce((highest, item) => Math.max(highest, item.y), 0)
  return Math.max(12, maxRow + 4, dragRow.value + 3)
})
const frameStyle = computed(() => {
  if (breakpoint.value === 'tablet') {
    return { maxWidth: '768px' }
  }
  if (breakpoint.value === 'phone') {
    return { maxWidth: '390px' }
  }
  return { maxWidth: 'none' }
})
const rulerMarks = [1, 10, 20, 30, 40, 50, 60]

function add(type: FieldType) {
  const next = addField(content.value, type)
  content.value = next
  selectedId.value = next.fields.at(-1)?.id ?? null
}

function onUpdateField(field: FormField) {
  content.value = replaceField(content.value, field)
}

function onUpdateLayout(item: LayoutItem) {
  content.value = setLayoutItem(content.value, breakpoint.value, item, true)
}

function onRemove(fieldId: string) {
  content.value = removeField(content.value, fieldId)
  if (selectedId.value === fieldId) {
    selectedId.value = null
  }
}

function matchDesktop() {
  content.value = copyDesktopLayout(content.value, breakpoint.value)
}

function itemStyle(item: LayoutItem) {
  return {
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1}`,
  }
}

function fieldById(fieldId: string): FormField | undefined {
  return content.value.fields.find(field => field.id === fieldId)
}

function cardText(field: FormField | undefined): string {
  if (!field) {
    return 'Field'
  }
  if (field.type === 'button') {
    return field.buttonLabel || field.label
  }
  if (field.type === 'html') {
    return field.label || 'HTML'
  }
  return field.label
}

function focusBoard() {
  rootRef.value?.focus()
}

function onItemPointerDown(event: PointerEvent, item: LayoutItem) {
  if (event.button !== 0) {
    return
  }
  selectedId.value = item.fieldId
  focusBoard()
  const point = cellFromEvent(event)
  beginDrag({
    pointerId: event.pointerId,
    fieldId: item.fieldId,
    mode: 'move',
    grabCol: point.col - item.x,
    grabRow: point.row - item.y,
  })
}

function onResizePointerDown(event: PointerEvent, item: LayoutItem) {
  event.stopPropagation()
  selectedId.value = item.fieldId
  focusBoard()
  beginDrag({
    pointerId: event.pointerId,
    fieldId: item.fieldId,
    mode: 'resize',
    grabCol: 0,
    grabRow: 0,
  })
}

function beginDrag(state: DragState) {
  drag.value = state
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  const current = drag.value
  if (!current || event.pointerId !== current.pointerId) {
    return
  }
  const item = content.value.layouts[breakpoint.value].find(entry => entry.fieldId === current.fieldId)
  if (!item) {
    return
  }
  const point = cellFromEvent(event)
  dragRow.value = point.row
  if (current.mode === 'resize') {
    content.value = setLayoutItem(content.value, breakpoint.value, {
      ...item,
      w: clamp(point.col - item.x + 1, 1, GRID_COLUMNS - item.x),
    }, false)
    return
  }
  content.value = setLayoutItem(content.value, breakpoint.value, {
    ...item,
    x: clamp(point.col - current.grabCol, 0, GRID_COLUMNS - item.w),
    y: clamp(point.row - current.grabRow, 0, 400),
  }, false)
}

function onPointerUp(event: PointerEvent) {
  const current = drag.value
  if (!current || event.pointerId !== current.pointerId) {
    return
  }
  const item = content.value.layouts[breakpoint.value].find(entry => entry.fieldId === current.fieldId)
  endDrag()
  if (item) {
    content.value = setLayoutItem(content.value, breakpoint.value, item, true)
  }
}

function endDrag() {
  drag.value = null
  dragRow.value = 0
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function cellFromEvent(event: PointerEvent): { col: number, row: number } {
  const grid = gridRef.value
  if (!grid) {
    return { col: 0, row: 0 }
  }
  const rect = grid.getBoundingClientRect()
  const width = rect.width || 1
  const col = clamp(Math.floor((event.clientX - rect.left) / (width / GRID_COLUMNS)), 0, GRID_COLUMNS - 1)
  const row = clamp(Math.floor((event.clientY - rect.top) / ROW_HEIGHT), 0, 400)
  return { col, row }
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    return
  }
  if (target.closest('input, textarea, select, button')) {
    return
  }
  const item = selectedItem.value
  if (!item) {
    return
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return
  }
  event.preventDefault()
  let { x, y, w } = item
  if (event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    w = clamp(w + (event.key === 'ArrowRight' ? 1 : -1), 1, GRID_COLUMNS - x)
  }
  else if (event.key === 'ArrowLeft') {
    x = clamp(x - 1, 0, GRID_COLUMNS - w)
  }
  else if (event.key === 'ArrowRight') {
    x = clamp(x + 1, 0, GRID_COLUMNS - w)
  }
  else if (event.key === 'ArrowUp') {
    y = clamp(y - 1, 0, 400)
  }
  else {
    y = clamp(y + 1, 0, 400)
  }
  content.value = setLayoutItem(content.value, breakpoint.value, { ...item, x, y, w }, true)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

onBeforeUnmount(endDrag)
</script>

<template>
  <div
    ref="rootRef"
    class="miraicms-form-builder"
    tabindex="0"
    @keydown="onKeydown"
  >
    <div class="miraicms-form-builder__palette">
      <div class="miraicms-form-builder__heading">
        Fields
      </div>
      <MiraiCmsUiButton
        v-for="type in FIELD_TYPES"
        :key="type"
        tag="button"
        variant="secondary"
        class="miraicms-form-builder__add"
        @click="add(type)"
      >
        {{ FIELD_LABELS[type] }}
      </MiraiCmsUiButton>
    </div>

    <div class="miraicms-form-builder__stage">
      <div class="miraicms-form-builder__toolbar">
        <div class="miraicms-form-builder__breakpoints">
          <MiraiCmsUiButton
            v-for="item in BREAKPOINTS"
            :key="item"
            tag="button"
            :variant="breakpoint === item ? undefined : 'secondary'"
            :active="breakpoint === item"
            @click="breakpoint = item"
          >
            {{ item === 'desktop' ? 'Desktop' : item === 'tablet' ? 'Tablet' : 'Phone' }}
          </MiraiCmsUiButton>
        </div>
        <MiraiCmsUiButton
          v-if="breakpoint !== 'desktop'"
          tag="button"
          variant="secondary"
          @click="matchDesktop"
        >
          Match desktop
        </MiraiCmsUiButton>
        <span class="miraicms-form-builder__hint">60 columns. Drag to move, drag the edge to resize. Arrows nudge, Shift changes width.</span>
      </div>
      <div class="miraicms-form-builder__scroll">
        <div
          class="miraicms-form-builder__frame"
          :style="frameStyle"
        >
          <div class="miraicms-form-builder__ruler">
            <span
              v-for="mark in rulerMarks"
              :key="mark"
              :style="{ left: `${((mark - 1) / GRID_COLUMNS) * 100}%` }"
            >{{ mark }}</span>
          </div>
          <div
            ref="gridRef"
            class="miraicms-form-builder__grid"
            :style="{ height: `${rowCount * ROW_HEIGHT}px` }"
            @pointerdown.self="selectedId = null"
          >
            <div
              v-for="item in layout"
              :key="item.fieldId"
              class="miraicms-form-builder__item"
              :class="{ 'is-selected': item.fieldId === selectedId, 'is-dragging': drag?.fieldId === item.fieldId }"
              :style="itemStyle(item)"
              @pointerdown="onItemPointerDown($event, item)"
            >
              <span class="miraicms-form-builder__item-label">{{ cardText(fieldById(item.fieldId)) }}</span>
              <span class="miraicms-form-builder__item-meta">{{ item.w }}</span>
              <span
                class="miraicms-form-builder__resize"
                @pointerdown="onResizePointerDown($event, item)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="miraicms-form-builder__inspector">
      <FieldSettings
        v-if="selected && selectedItem"
        :field="selected"
        :item="selectedItem"
        @update="onUpdateField"
        @layout="onUpdateLayout"
        @remove="onRemove(selected.id)"
      />
      <div
        v-else
        class="miraicms-form-builder__form"
      >
        <div class="miraicms-form-builder__heading">
          Form
        </div>
        <MiraiCmsTextField
          v-model="name"
          field-key="form-name"
          :field="{ type: 'text', label: 'Name', maxLength: 160 }"
        />
        <MiraiCmsTextField
          v-model="slug"
          field-key="form-slug"
          :field="{ type: 'text', label: 'Slug', maxLength: 80 }"
        />
        <MiraiCmsSelectField
          v-model="status"
          field-key="form-status"
          :field="{
            type: 'select',
            label: 'Status',
            returnFormat: 'value',
            choices: [
              { val: 'draft', lbl: 'Draft' },
              { val: 'published', lbl: 'Published' },
            ],
          }"
        />
        <div class="miraicms-form-builder__usage">
          Published forms render with <span>&lt;MiraiForm form="{{ slug }}" /&gt;</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../assets/styles" as *;

.miraicms-form-builder {
  display: grid;
  grid-template-columns: math-rem(200) minmax(0, 1fr) math-rem(300);
  flex: 1;
  min-height: 0;
  min-width: 0;
  outline: none;
  border-top: 1px solid $color-border;

  &__palette,
  &__inspector {
    min-height: 0;
    overflow: auto;
    padding: math-rem(8);
    background: $color-surface;
  }

  &__palette {
    border-right: 1px solid $color-border;
  }

  &__inspector {
    border-left: 1px solid $color-border;
  }

  &__heading {
    margin: 0 0 math-rem(10);
    font-size: math-rem(12);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: $color-muted;
  }

  &__add {
    width: 100%;
    margin-bottom: math-rem(6);
    justify-content: flex-start;
  }

  &__stage {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: $color-bg;
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: math-rem(8);
    padding: math-rem(8) math-rem(12);
    background: $color-surface;
    border-bottom: 1px solid $color-border;
  }

  &__breakpoints {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(6);
  }

  &__hint {
    flex: 1 1 100%;
    min-width: 0;
    color: $color-muted;
    font-size: math-rem(12);
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: math-rem(16);
  }

  &__frame {
    width: 100%;
    margin-inline: auto;
  }

  &__ruler {
    position: relative;
    height: math-rem(18);
    margin-bottom: math-rem(4);
    color: $color-muted;
    font-size: math-rem(11);

    span {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
    }

    span:first-child {
      transform: none;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(60, minmax(0, 1fr));
    grid-auto-rows: 72px;
    position: relative;
    width: 100%;
    background-color: $color-surface;
    background-image: repeating-linear-gradient(
      to right,
      transparent 0,
      transparent calc(100% / 60 * 10 - 1px),
      rgba(47, 111, 237, 0.18) calc(100% / 60 * 10 - 1px),
      rgba(47, 111, 237, 0.18) calc(100% / 60 * 10)
    );
    border: 1px solid $color-border;
    border-radius: $border-radius;
    box-shadow: $shadow-sm;
  }

  &__item {
    position: relative;
    display: flex;
    align-items: center;
    gap: math-rem(6);
    min-width: 0;
    margin: math-rem(4);
    padding: 0 math-rem(12) 0 math-rem(8);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    cursor: grab;
    user-select: none;
    z-index: 1;

    &.is-selected {
      border-color: $color-accent;
      box-shadow: 0 0 0 1px $color-accent;
    }

    &.is-dragging {
      opacity: 0.85;
      z-index: 2;
    }
  }

  &__item-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: math-rem(13);
  }

  &__item-meta {
    margin-left: auto;
    color: $color-muted;
    font-size: math-rem(11);
  }

  &__resize {
    position: absolute;
    top: 0;
    right: 0;
    width: math-rem(8);
    height: 100%;
    cursor: col-resize;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: math-rem(12);
  }

  &__usage {
    margin: 0;
    color: $color-muted;
    font-size: math-rem(12);
    line-height: 1.5;
    font-weight: 400;

    span {
      color: $color-ink;
    }
  }
}
</style>
