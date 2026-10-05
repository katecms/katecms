<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import FieldSettings from './FieldSettings.vue'
import type { Breakpoint, FieldType, FormContent, FormField, FormStatus, LayoutItem } from '../form/model'
import {
  BREAKPOINTS,
  FIELD_LABELS,
  FIELD_TYPES,
  GRID_COLUMNS,
  ROW_HEIGHT,
  addField,
  addStep,
  cloneStep,
  copyDesktopLayout,
  deleteStep,
  removeField,
  reorderSteps,
  replaceField,
  setLayoutItem,
} from '../form/model'
import StepSettings from './StepSettings.vue'

const name = defineModel<string>('name', { required: true })
const slug = defineModel<string>('slug', { required: true })
const status = defineModel<FormStatus>('status', { required: true })
const content = defineModel<FormContent>('content', { required: true })

const rootRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const breakpoint = ref<Breakpoint>('desktop')
const activeStepId = ref('')
const stepSettingsOpen = ref(false)
const openStepMenu = ref('')
const selectedId = ref<string | null>(null)
const dragRow = ref(0)
const isDraggingStep = ref(false)
const draggingStepIndex = ref<number | null>(null)
const dropStepIndex = ref(0)
const stepDragOffset = ref({ x: 0, y: 0 })
const stepDragSize = ref({ width: 0, height: 0 })
const stepDragPosition = ref({ left: 0, top: 0 })
const stepRefs = ref<Array<HTMLElement | null>>([])

interface DragState {
  pointerId: number
  fieldId: string
  mode: 'move' | 'resize-left' | 'resize-right'
  grabCol: number
  grabRow: number
  startX: number
  startW: number
}

const drag = ref<DragState | null>(null)

const currentStepId = computed(() => {
  if (content.value.steps.some(step => step.id === activeStepId.value)) {
    return activeStepId.value
  }
  return content.value.steps[0]?.id ?? ''
})
const layout = computed(() => content.value.layouts[breakpoint.value].filter((item) => {
  return content.value.fields.find(field => field.id === item.fieldId)?.stepId === currentStepId.value
}))
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
  const next = addField(content.value, type, currentStepId.value)
  content.value = next
  selectedId.value = next.fields.at(-1)?.id ?? null
  stepSettingsOpen.value = false
}

function selectStep(stepId: string) {
  activeStepId.value = stepId
  openStepMenu.value = ''
  if (selected.value?.stepId !== stepId) {
    selectedId.value = null
  }
}

function toggleStepMenu(stepId: string) {
  openStepMenu.value = openStepMenu.value === stepId ? '' : stepId
}

function onCloneStep(stepId: string) {
  const index = content.value.steps.findIndex(step => step.id === stepId)
  const next = cloneStep(content.value, stepId)
  content.value = next
  activeStepId.value = next.steps[index + 1]?.id ?? stepId
  openStepMenu.value = ''
  selectedId.value = null
}

function onDeleteStep(stepId: string) {
  const index = content.value.steps.findIndex(step => step.id === stepId)
  const next = deleteStep(content.value, stepId)
  content.value = next
  if (!next.steps.some(step => step.id === currentStepId.value)) {
    activeStepId.value = next.steps[Math.max(0, index - 1)]?.id ?? ''
  }
  if (selected.value && !next.fields.some(field => field.id === selected.value?.id)) {
    selectedId.value = null
  }
  if (next.steps.length < 2) {
    stepSettingsOpen.value = false
  }
  openStepMenu.value = ''
}

function createStep() {
  const next = addStep(content.value)
  content.value = next
  activeStepId.value = next.steps.at(-1)?.id ?? ''
  selectedId.value = null
}

const stepPlaceholderStyle = computed(() => ({
  width: `${stepDragSize.value.width}px`,
  height: `${stepDragSize.value.height}px`,
}))

function setStepRef(el: Element | null, index: number) {
  stepRefs.value[index] = el instanceof HTMLElement ? el : null
}

function stepDragStyle(index: number): CSSProperties | undefined {
  if (!isDraggingStep.value || draggingStepIndex.value !== index) {
    return undefined
  }
  return {
    position: 'fixed',
    left: `${stepDragPosition.value.left}px`,
    top: `${stepDragPosition.value.top}px`,
    width: `${stepDragSize.value.width}px`,
    height: `${stepDragSize.value.height}px`,
    zIndex: 1000,
  }
}

function updateStepDropTarget(clientX: number, clientY: number) {
  const from = draggingStepIndex.value
  if (from === null) {
    return
  }
  const length = content.value.steps.length
  let insertAt = length
  for (let i = 0; i < length; i++) {
    if (i === from) {
      continue
    }
    const el = stepRefs.value[i]
    if (!el) {
      continue
    }
    const rect = el.getBoundingClientRect()
    const sameRow = clientY >= rect.top && clientY <= rect.bottom
    const before = clientY < rect.top || (sameRow && clientX < rect.left + rect.width / 2)
    if (before) {
      insertAt = i
      break
    }
    insertAt = i + 1
  }
  dropStepIndex.value = Math.max(0, Math.min(insertAt, length))
}

function onStepMouseMove(event: MouseEvent) {
  if (!isDraggingStep.value) {
    return
  }
  stepDragPosition.value = {
    left: event.clientX - stepDragOffset.value.x,
    top: event.clientY - stepDragOffset.value.y,
  }
  updateStepDropTarget(event.clientX, event.clientY)
}

function resetStepDrag() {
  isDraggingStep.value = false
  draggingStepIndex.value = null
  dropStepIndex.value = 0
  stepDragSize.value = { width: 0, height: 0 }
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onStepMouseMove)
  document.removeEventListener('mouseup', onStepMouseUp)
}

function onStepMouseUp() {
  if (!isDraggingStep.value || draggingStepIndex.value === null) {
    return
  }
  content.value = reorderSteps(content.value, draggingStepIndex.value, dropStepIndex.value)
  resetStepDrag()
}

function onStepHandleMouseDown(index: number, event: MouseEvent) {
  if (event.button !== 0 || content.value.steps.length < 2) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  const handle = event.currentTarget
  if (!(handle instanceof HTMLElement)) {
    return
  }
  const stepEl = handle.closest<HTMLElement>('.miraicms-form-builder__step')
  if (!stepEl) {
    return
  }
  const rect = stepEl.getBoundingClientRect()
  draggingStepIndex.value = index
  dropStepIndex.value = index
  stepDragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
  stepDragSize.value = {
    width: rect.width,
    height: rect.height,
  }
  stepDragPosition.value = {
    left: rect.left,
    top: rect.top,
  }
  isDraggingStep.value = true
  openStepMenu.value = ''
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onStepMouseMove)
  document.addEventListener('mouseup', onStepMouseUp)
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
  stepSettingsOpen.value = false
  focusBoard()
  const point = cellFromEvent(event)
  beginDrag({
    pointerId: event.pointerId,
    fieldId: item.fieldId,
    mode: 'move',
    grabCol: point.col - item.x,
    grabRow: point.row - item.y,
    startX: item.x,
    startW: item.w,
  })
}

function onResizePointerDown(event: PointerEvent, item: LayoutItem, edge: 'left' | 'right') {
  event.stopPropagation()
  selectedId.value = item.fieldId
  stepSettingsOpen.value = false
  focusBoard()
  beginDrag({
    pointerId: event.pointerId,
    fieldId: item.fieldId,
    mode: edge === 'left' ? 'resize-left' : 'resize-right',
    grabCol: 0,
    grabRow: 0,
    startX: item.x,
    startW: item.w,
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
  if (current.mode === 'resize-right') {
    content.value = setLayoutItem(content.value, breakpoint.value, {
      ...item,
      x: current.startX,
      w: clamp(point.col - current.startX + 1, 1, GRID_COLUMNS - current.startX),
    }, false)
    return
  }
  if (current.mode === 'resize-left') {
    const right = current.startX + current.startW
    const x = clamp(point.col, 0, right - 1)
    content.value = setLayoutItem(content.value, breakpoint.value, {
      ...item,
      x,
      w: right - x,
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

function onDocumentMouseDown(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) {
    openStepMenu.value = ''
    return
  }
  if (target.closest('.miraicms-form-builder__step-menu, .miraicms-form-builder__step-options')) {
    return
  }
  openStepMenu.value = ''
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown)
})

onBeforeUnmount(() => {
  endDrag()
  resetStepDrag()
  document.removeEventListener('mousedown', onDocumentMouseDown)
})
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
      <div class="miraicms-form-builder__steps">
        <template
          v-for="(step, index) in content.steps"
          :key="step.id"
        >
          <div
            v-if="isDraggingStep && dropStepIndex === index"
            class="miraicms-form-builder__step-placeholder"
            :style="stepPlaceholderStyle"
          />
          <div
            :ref="(el) => setStepRef(el as Element | null, index)"
            class="miraicms-form-builder__step"
            :class="{
              'is-active': step.id === currentStepId,
              'is-floating': isDraggingStep && draggingStepIndex === index,
            }"
            :style="stepDragStyle(index)"
          >
            <span
              v-if="content.steps.length > 1"
              class="miraicms-form-builder__step-handle"
              @mousedown="onStepHandleMouseDown(index, $event)"
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
                    transform="rotate(90 8 4)"
                  />
                  <circle
                    cx="16"
                    cy="4"
                    r="1"
                    transform="rotate(90 16 4)"
                  />
                  <circle
                    cx="8"
                    cy="12"
                    r="1"
                    transform="rotate(90 8 12)"
                  />
                  <circle
                    cx="16"
                    cy="12"
                    r="1"
                    transform="rotate(90 16 12)"
                  />
                  <circle
                    cx="8"
                    cy="20"
                    r="1"
                    transform="rotate(90 8 20)"
                  />
                  <circle
                    cx="16"
                    cy="20"
                    r="1"
                    transform="rotate(90 16 20)"
                  />
                </g>
              </svg>
            </span>
            <button
              type="button"
              class="miraicms-form-builder__step-label"
              @click="selectStep(step.id)"
            >
              {{ step.label }}
            </button>
            <button
              type="button"
              class="miraicms-form-builder__step-menu"
              :class="{ 'is-open': openStepMenu === step.id }"
              aria-label="Step options"
              aria-haspopup="menu"
              :aria-expanded="openStepMenu === step.id"
              @click.stop="toggleStepMenu(step.id)"
            >
              <svg
                fill="none"
                stroke="currentColor"
                width="20"
                height="20"
                viewBox="0 0 30 30"
                aria-hidden="true"
              >
                <line
                  stroke-width="3"
                  stroke-linecap="round"
                  x1="10.27"
                  y1="15"
                  x2="10.27"
                  y2="15"
                />
                <line
                  stroke-width="3"
                  stroke-linecap="round"
                  x1="15"
                  y1="15"
                  x2="15"
                  y2="15"
                />
                <line
                  stroke-width="3"
                  stroke-linecap="round"
                  x1="19.73"
                  y1="15"
                  x2="19.73"
                  y2="15"
                />
              </svg>
            </button>
            <div
              v-if="openStepMenu === step.id"
              class="miraicms-form-builder__step-options"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                @click="onCloneStep(step.id)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 30 30"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-width="2"
                    d="M13.89,11.7h10a2.2,2.2,0,0,1,2.22,2.2v9.9A2.2,2.2,0,0,1,23.88,26h-10a2.2,2.2,0,0,1-2.22-2.2V13.9A2.2,2.2,0,0,1,13.89,11.7Z"
                  />
                  <path
                    stroke-width="2"
                    d="M7.23,18.3H6.12A2.2,2.2,0,0,1,3.9,16.1V6.2A2.2,2.2,0,0,1,6.12,4h10a2.2,2.2,0,0,1,2.22,2.2V7.3"
                  />
                </svg>
                <span>Clone Step</span>
              </button>
              <button
                type="button"
                role="menuitem"
                :disabled="content.steps.length < 2"
                @click="onDeleteStep(step.id)"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
                  <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                </svg>
                <span>Delete Step</span>
              </button>
            </div>
          </div>
        </template>
        <div
          v-if="isDraggingStep && dropStepIndex === content.steps.length"
          class="miraicms-form-builder__step-placeholder"
          :style="stepPlaceholderStyle"
        />
        <button
          type="button"
          class="miraicms-form-builder__step-icon"
          aria-label="Add step"
          :disabled="content.steps.length >= 20"
          @click="createStep"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          v-if="content.steps.length > 1"
          type="button"
          class="miraicms-form-builder__step-icon"
          :class="{ 'is-active': stepSettingsOpen }"
          aria-label="Step settings"
          @click="stepSettingsOpen = !stepSettingsOpen"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 30 30"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <ellipse
              stroke-width="2"
              cx="15"
              cy="15"
              rx="3.07"
              ry="3.07"
            />
            <path
              stroke-width="2"
              d="M22.57,18.07a1.69,1.69,0,0,0,.34,1.87L23,20a2.05,2.05,0,0,1,0,2.9h0a2.05,2.05,0,0,1-2.9,0h0L20,22.84A1.7,1.7,0,0,0,17.13,24v.18a2,2,0,1,1-4.09,0v-.09a1.7,1.7,0,0,0-1.11-1.55,1.67,1.67,0,0,0-1.86.34L10,23a2,2,0,0,1-2.89,0h0a2.06,2.06,0,0,1,0-2.9h0L7.18,20A1.71,1.71,0,0,0,6,17.13H5.8a2,2,0,0,1,0-4.1h.09a1.77,1.77,0,0,0,1.2-3L7,10A2.05,2.05,0,0,1,7,7.1H7a2.05,2.05,0,0,1,2.9,0h0l.06.06a1.67,1.67,0,0,0,1.86.34h.08A1.67,1.67,0,0,0,13,6V5.78a2.05,2.05,0,1,1,4.1,0v.09a1.7,1.7,0,0,0,2.88,1.21L20,7a2,2,0,0,1,2.89,0h0a2.06,2.06,0,0,1,0,2.9h0l-.07.06a1.7,1.7,0,0,0-.33,1.87v.08A1.67,1.67,0,0,0,24,13h.17a2.05,2.05,0,1,1,0,4.1h-.09A1.67,1.67,0,0,0,22.57,18.07Z"
            />
          </svg>
        </button>
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
            >
              {{ mark }}
            </span>
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
                class="miraicms-form-builder__resizable-handle miraicms-form-builder__resizable-handle--left"
                @pointerdown="onResizePointerDown($event, item, 'left')"
              />
              <span
                class="miraicms-form-builder__resizable-handle miraicms-form-builder__resizable-handle--right"
                @pointerdown="onResizePointerDown($event, item, 'right')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="miraicms-form-builder__inspector">
      <StepSettings
        v-if="stepSettingsOpen && content.steps.length > 1"
        :content="content"
        @update="content = $event"
      />
      <FieldSettings
        v-else-if="selected && selectedItem"
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
  }

  &__palette {
    padding: math-rem(8) math-rem(8) math-rem(8) 0;
    border-right: 1px solid $color-border;
  }

  &__inspector {
    padding: math-rem(8) 0 math-rem(8) math-rem(8);
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
    padding: math-rem(8);
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

  &__steps {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: math-rem(6);
    padding: math-rem(8);
    background: $color-surface;
    border-bottom: 1px solid $color-border;
  }

  &__step,
  &__step-icon {
    display: inline-flex;
    align-items: center;
    height: math-rem(32);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    color: $color-ink;
    font-size: math-rem(13);
    cursor: pointer;

    &:hover:not(:disabled) {
      background: $color-bg;
    }

    &.is-active {
      background: $color-accent-wash;
      border-color: $color-accent;
      color: $color-accent;
    }

    &:disabled {
      color: $color-muted;
      cursor: not-allowed;
    }
  }

  &__step {
    position: relative;
  }

  &__step-label,
  &__step-menu {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  &__step-label {
    padding: 0 math-rem(38) 0 math-rem(36);
    line-height: math-rem(30);
  }

  &__step-menu,
  &__step-handle {
    position: absolute;
  }

  &__step-menu {
    display: flex;
    padding: 0;
    width: 22px;
    height: 22px;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    transition: border .2s;
    top: math-rem(4);
    right: math-rem(8);

    &:hover {
      border-color: $color-muted;
    }

    svg {
      width: 100%;
      height: auto;
      transform: rotate(90deg);
      transition: transform 0.2s;
    }
  }

  &__step-options {
    position: absolute;
    top: calc(100% + #{math-rem(4)});
    right: 0;
    z-index: 5;
    display: flex;
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

      &:hover:not(:disabled) {
        background: $color-bg;
      }

      &:disabled {
        color: $color-muted;
        cursor: not-allowed;
      }
    }
  }

  &__step-handle {
    display: flex;
    justify-content: center;
    color: $color-muted;
    cursor: grab;
    width: 20px;
    height: 20px;
    top: math-rem(5);
    left: math-rem(8);
  }

  &__step.is-floating {
    box-shadow: $shadow-md;
  }

  &__step-placeholder {
    flex-shrink: 0;
    box-sizing: border-box;
    border: 1px dashed $color-border;
    border-radius: $border-radius;
    background-color: $color-bg;
  }

  &__step-icon {
    justify-content: center;
    width: math-rem(32);
    padding: 0;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: math-rem(16) math-rem(8);
  }

  &__frame {
    width: 100%;
    margin-inline: auto;
  }

  &__ruler {
    position: relative;
    color: $color-muted;
    font-size: math-rem(11);
    display: flex;
    justify-content: space-between;
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
      $color-border calc(100% / 60 * 10 - 1px),
      $color-border calc(100% / 60 * 10)
    );
    border: 1px solid $color-border;
    box-shadow: $shadow-sm;
    border-radius: $border-radius;
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

  &__resizable-handle {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
    width: math-rem(12);
    height: math-rem(30) !important;
    cursor: ew-resize;
    opacity: 0;
    border-radius: math-rem(7);
    background-color: $color-accent;
  }

  &__resizable-handle--left {
    left: -6px;
  }

  &__resizable-handle--right {
    right: -6px;
  }

  &__item:hover .miraicms-form-builder__resizable-handle,
  &__item.is-dragging .miraicms-form-builder__resizable-handle {
    opacity: 1;
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
