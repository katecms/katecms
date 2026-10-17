<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FieldFace from './FieldFace.vue'
import FieldSettings from './FieldSettings.vue'
import type { Breakpoint, FieldType, FormContent, FormField, FormStatus, LayoutItem } from '../form/model'
import {
  FIELD_LABELS,
  GRID_COLUMNS,
  ROW_HEIGHT,
  addField,
  addStep,
  baseBreakpoint,
  cloneStep,
  copyDesktopLayout,
  syncFieldOrderLayouts,
  notificationFieldErrors,
  deleteStep,
  cloneField,
  moveFieldToStep,
  removeField,
  reorderSteps,
  replaceField,
  setLayoutItem,
} from '../form/model'
import { clientFormBreakpoints } from '../form/runtime-config'
import { provideMiraiCmsFieldErrors } from 'miraicms-nuxt/extensions'
import StepSettings from './StepSettings.vue'

const rootClass = 'miraicms-form-builder'


defineModel<string>('name', { required: true })
const status = defineModel<FormStatus>('status', { required: true })
const content = defineModel<FormContent>('content', { required: true })

const notificationErrors = ref<Record<string, string>>({})
watch(() => content.value.notification, (notification) => {
  notificationErrors.value = notificationFieldErrors(notification)
}, { immediate: true })
provideMiraiCmsFieldErrors(notificationErrors)

const rootRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const formBreakpointList = clientFormBreakpoints()
const breakpoint = ref<Breakpoint>(baseBreakpoint())
const activeStepId = ref('')
const stepSettingsOpen = ref(false)
const openStepMenu = ref('')
const openFieldMenu = ref('')
const fieldMenuSide = ref<'left' | 'right'>('right')
const openMoveMenu = ref('')
const moveMenuStyle = ref<{ top: string, left?: string, right?: string }>({ top: '0px' })
let moveMenuTimer: ReturnType<typeof setTimeout> | undefined
const selectedId = ref<string | null>(null)
const editorMode = ref<'builder' | 'settings'>('builder')
const settingsSection = ref<'form' | 'email' | 'confirmations'>('form')
const emailFields = [
  { key: 'to', label: 'To', maxLength: 500 },
  { key: 'fromMail', label: 'From Mail', maxLength: 200 },
  { key: 'fromName', label: 'From Name', maxLength: 200 },
  { key: 'cc', label: 'CC', maxLength: 500 },
  { key: 'bcc', label: 'BCC', maxLength: 500 },
  { key: 'replyTo', label: 'Reply To', maxLength: 200 },
] as const
const sidebarTab = ref<'fields' | 'options'>('fields')
const drag = ref<DragState | null>(null)
const dragGhost = ref<DragGhost | null>(null)
const dragBase = ref<LayoutItem[] | null>(null)
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

interface DragGhost {
  left: number
  top: number
  width: number
  height: number
  offsetX: number
  offsetY: number
}

const currentStepId = computed(() => {
  if (content.value.steps.some(step => step.id === activeStepId.value)) {
    return activeStepId.value
  }
  return content.value.steps[0]?.id ?? ''
})
const layout = computed(() => (content.value.layouts[breakpoint.value] ?? []).filter((item) => {
  return content.value.fields.find(field => field.id === item.fieldId)?.stepId === currentStepId.value
}))
watch(selectedId, (id) => {
  if (id) {
    sidebarTab.value = 'options'
  }
})

watch(stepSettingsOpen, (open) => {
  if (open) {
    sidebarTab.value = 'options'
  }
})

const selected = computed(() => content.value.fields.find(field => field.id === selectedId.value) ?? null)
const selectedItem = computed(() => layout.value.find(item => item.fieldId === selectedId.value) ?? null)
const frameStyle = computed(() => {
  const current = formBreakpointList.find(item => item.name === breakpoint.value)
  if (current?.maxWidth) {
    return { maxWidth: `${current.maxWidth}px` }
  }
  return { maxWidth: 'none' }
})
const baseName = computed(() => baseBreakpoint())
const baseLabel = computed(() => {
  return formBreakpointList.find(item => item.name === baseName.value)?.label ?? 'Desktop'
})

const palette = [
  { title: 'Basic Fields', types: ['text', 'textarea', 'email', 'number', 'password', 'range', 'url', 'color', 'button', 'file', 'date', 'time', 'datetime', 'week', 'month'] as FieldType[] },
  { title: 'Option/Choice Fields', types: ['image_select', 'select', 'rating', 'radio', 'checkbox'] as FieldType[] },
  { title: 'Elements', types: ['title', 'image', 'divider', 'html', 'spacer'] as FieldType[] },
]

function hasBreakpointIcon(name: string) {
  return name === 'desktop' || name === 'tablet' || name === 'phone'
}

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
  const stepEl = handle.closest<HTMLElement>(`.${rootClass}__step`)
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

function menuSide(anchor: HTMLElement, width: number): 'left' | 'right' {
  const bounds = anchor.closest(`.${rootClass}__scroll`)?.getBoundingClientRect()
  const box = anchor.getBoundingClientRect()
  if (!bounds) {
    return 'right'
  }
  const spaceRight = bounds.right - box.right
  const spaceLeft = box.left - bounds.left
  return spaceRight >= width || spaceRight >= spaceLeft ? 'right' : 'left'
}

function toggleFieldMenu(fieldId: string, event: MouseEvent) {
  if (openFieldMenu.value === fieldId) {
    openFieldMenu.value = ''
    openMoveMenu.value = ''
    return
  }
  const button = event.currentTarget
  if (button instanceof HTMLElement) {
    fieldMenuSide.value = menuSide(button, 176)
  }
  openFieldMenu.value = fieldId
}

function showMoveMenu(fieldId: string, event: MouseEvent) {
  clearTimeout(moveMenuTimer)
  const row = event.currentTarget
  if (row instanceof HTMLElement) {
    const box = row.getBoundingClientRect()
    const panel = 176
    if (box.left >= panel) {
      moveMenuStyle.value = { top: `${box.top}px`, right: `${window.innerWidth - box.left}px`, left: undefined }
    }
    else {
      moveMenuStyle.value = { top: `${box.top}px`, left: `${box.right}px`, right: undefined }
    }
  }
  openMoveMenu.value = fieldId
}

function keepMoveMenu() {
  clearTimeout(moveMenuTimer)
}

function hideMoveMenu() {
  clearTimeout(moveMenuTimer)
  moveMenuTimer = setTimeout(() => {
    openMoveMenu.value = ''
  }, 280)
}

function onRemove(fieldId: string) {
  content.value = removeField(content.value, fieldId)
  if (selectedId.value === fieldId) {
    selectedId.value = null
  }
  openFieldMenu.value = ''
  openMoveMenu.value = ''
}

function onCloneField(fieldId: string) {
  const before = new Set(content.value.fields.map(field => field.id))
  content.value = cloneField(content.value, fieldId)
  const created = content.value.fields.find(field => !before.has(field.id))
  if (created) {
    selectedId.value = created.id
  }
  openFieldMenu.value = ''
  openMoveMenu.value = ''
}

function onMoveField(fieldId: string, stepId: string) {
  content.value = moveFieldToStep(content.value, fieldId, stepId)
  selectedId.value = null
  openFieldMenu.value = ''
  openMoveMenu.value = ''
}

function otherSteps(fieldId: string) {
  const stepId = content.value.fields.find(field => field.id === fieldId)?.stepId
  return content.value.steps.filter(step => step.id !== stepId)
}

function matchDesktop() {
  content.value = copyDesktopLayout(content.value, breakpoint.value)
}

function layoutOrderKey(source: FormContent, name: Breakpoint): string {
  const items = source.layouts[name] ?? []
  return [...items]
    .sort((a, b) => a.y - b.y || a.x - b.x || a.fieldId.localeCompare(b.fieldId))
    .map(item => item.fieldId)
    .join(',')
}

function setSyncFieldOrder(enabled: boolean) {
  const next = { ...content.value, syncFieldOrder: enabled }
  content.value = enabled ? syncFieldOrderLayouts(next, breakpoint.value) : next
}

function setValidateOnBlur(enabled: boolean) {
  content.value = { ...content.value, validateOnBlur: enabled }
}

function setPreventEmptySubmit(enabled: boolean) {
  content.value = {
    ...content.value,
    preventEmptySubmit: enabled,
    emptySubmitMessage: content.value.emptySubmitMessage?.trim() || 'Empty form cannot be submitted.',
  }
}

function setEmptySubmitMessage(value: string) {
  content.value = { ...content.value, emptySubmitMessage: value }
}

function setNotification(key: typeof emailFields[number]['key'], value: string) {
  content.value = {
    ...content.value,
    notification: {
      ...content.value.notification,
      [key]: value,
    },
  }
}

function setSuccessMessage(value: string) {
  content.value = {
    ...content.value,
    confirmation: {
      ...content.value.confirmation,
      successMessage: value,
    },
  }
}

function setRedirectPage(value: string) {
  content.value = {
    ...content.value,
    confirmation: {
      ...content.value.confirmation,
      redirectPage: value,
    },
  }
}

watch(
  () => content.value.syncFieldOrder ? `${breakpoint.value}:${layoutOrderKey(content.value, breakpoint.value)}` : '',
  (key) => {
    if (!key || !content.value.syncFieldOrder) {
      return
    }
    const next = syncFieldOrderLayouts(content.value, breakpoint.value)
    const unchanged = formBreakpointList.every((item) => {
      const before = content.value.layouts[item.name] ?? []
      const after = next.layouts[item.name] ?? []
      return before.length === after.length && after.every((entry, index) => {
        const current = before[index]
        return current?.fieldId === entry.fieldId && current.x === entry.x && current.y === entry.y && current.w === entry.w && current.h === entry.h
      })
    })
    if (!unchanged) {
      content.value = next
    }
  },
)

function itemStyle(item: LayoutItem): CSSProperties {
  return {
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1}`,
  }
}

function itemVisualStyle(item: LayoutItem): CSSProperties {
  const ghost = dragGhost.value
  if (drag.value?.mode === 'move' && drag.value.fieldId === item.fieldId && ghost) {
    return {
      position: 'fixed',
      left: `${ghost.left}px`,
      top: `${ghost.top}px`,
      width: `${ghost.width}px`,
      height: `${ghost.height}px`,
      zIndex: 1000,
      margin: 0,
    }
  }
  return itemStyle(item)
}

const dropPlaceholderStyle = computed((): CSSProperties | undefined => {
  if (drag.value?.mode !== 'move' || !dragGhost.value) {
    return undefined
  }
  const item = layout.value.find(entry => entry.fieldId === drag.value?.fieldId)
  if (!item) {
    return undefined
  }
  return {
    ...itemStyle(item),
    height: `${dragGhost.value.height}px`,
  }
})

function fieldById(fieldId: string): FormField | undefined {
  return content.value.fields.find(field => field.id === fieldId)
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
  if (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, label, .miraicms-select')) {
    return
  }
  const point = cellFromEvent(event)
  const el = event.currentTarget
  if (el instanceof HTMLElement) {
    const rect = el.getBoundingClientRect()
    dragGhost.value = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
  }
  dragBase.value = (content.value.layouts[breakpoint.value] ?? []).map(entry => ({ ...entry }))
  document.body.style.userSelect = 'none'
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
  const item = (content.value.layouts[breakpoint.value] ?? []).find(entry => entry.fieldId === current.fieldId)
  if (!item) {
    return
  }
  const point = cellFromEvent(event)
  if (current.mode === 'move') {
    const ghost = dragGhost.value
    if (ghost) {
      dragGhost.value = {
        ...ghost,
        left: event.clientX - ghost.offsetX,
        top: event.clientY - ghost.offsetY,
      }
    }
    previewMove({
      ...item,
      x: clamp(point.col - current.grabCol, 0, GRID_COLUMNS - item.w),
      y: clamp(point.row - current.grabRow, 0, 400),
    })
    return
  }
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
}

function previewMove(item: LayoutItem) {
  const base = dragBase.value
  const source = base
    ? {
        ...content.value,
        layouts: {
          ...content.value.layouts,
          [breakpoint.value]: base.map(entry => ({ ...entry })),
        },
      }
    : content.value
  content.value = setLayoutItem(source, breakpoint.value, item, true)
}

function onPointerUp(event: PointerEvent) {
  const current = drag.value
  if (!current || event.pointerId !== current.pointerId) {
    return
  }
  const item = (content.value.layouts[breakpoint.value] ?? []).find(entry => entry.fieldId === current.fieldId)
  endDrag()
  if (item) {
    content.value = setLayoutItem(content.value, breakpoint.value, item, true)
  }
}

function endDrag() {
  drag.value = null
  dragGhost.value = null
  dragBase.value = null
  document.body.style.userSelect = ''
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
  const row = rowFromPointer(event.clientY, grid)
  return { col, row }
}

function rowFromPointer(clientY: number, grid: HTMLElement): number {
  const gridTop = grid.getBoundingClientRect().top
  const offsetY = clientY - gridTop
  const bands: { row: number, top: number, bottom: number }[] = []
  for (const el of grid.querySelectorAll<HTMLElement>(`:scope > .${rootClass}__item:not(.is-floating), :scope > .${rootClass}__drop-placeholder`)) {
    const raw = Number.parseInt(el.style.gridRow, 10)
    if (!Number.isFinite(raw)) {
      continue
    }
    const row = raw - 1
    const rect = el.getBoundingClientRect()
    const top = rect.top - gridTop
    const bottom = rect.bottom - gridTop
    const existing = bands.find(band => band.row === row)
    if (existing) {
      existing.top = Math.min(existing.top, top)
      existing.bottom = Math.max(existing.bottom, bottom)
    }
    else {
      bands.push({ row, top, bottom })
    }
  }
  bands.sort((a, b) => a.row - b.row)
  if (!bands.length) {
    return clamp(Math.floor(Math.max(0, offsetY) / ROW_HEIGHT), 0, 400)
  }
  for (const band of bands) {
    if (offsetY <= band.bottom) {
      return band.row
    }
  }
  const last = bands[bands.length - 1]!
  return clamp(last.row + 1 + Math.floor(Math.max(0, offsetY - last.bottom) / ROW_HEIGHT), 0, 400)
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
  if (target.closest(`.${rootClass}__step-menu, .${rootClass}__step-options, .${rootClass}__item-menu, .${rootClass}__more`)) {
    return
  }
  openStepMenu.value = ''
  openFieldMenu.value = ''
  openMoveMenu.value = ''
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
    :class="rootClass"
    tabindex="0"
    @keydown="onKeydown"
  >
    <div :class="`${rootClass}__modes`">
      <MiraiCmsUiButton
        tag="button"
        :variant="editorMode === 'builder' ? ['small'] : ['secondary', 'small']"
        :active="editorMode === 'builder'"
        @click="editorMode = 'builder'"
      >
        Builder
      </MiraiCmsUiButton>
      <MiraiCmsUiButton
        tag="button"
        :variant="editorMode === 'settings' ? ['small'] : ['secondary', 'small']"
        :active="editorMode === 'settings'"
        @click="editorMode = 'settings'"
      >
        Settings
      </MiraiCmsUiButton>
    </div>

    <div
      v-if="editorMode === 'builder'"
      :class="`${rootClass}__workspace`"
    >
      <div :class="`${rootClass}__sidebar`">
        <div :class="`${rootClass}__tabs`">
          <button
            type="button"
            :class="`${rootClass}__tab`"
            :class="{ 'is-active': sidebarTab === 'fields' }"
            aria-label="Add Fields"
            title="Add Fields"
            @click="sidebarTab = 'fields'"
          >
            <svg
              width="22"
              height="22"
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
              <line
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                x1="15"
                y1="10.18"
                x2="15"
                y2="19.82"
              />
              <line
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                x1="10.09"
                y1="15"
                x2="19.91"
                y2="15"
              />
            </svg>
            <span>Add Fields</span>
          </button>
          <button
            type="button"
            :class="`${rootClass}__tab`"
            :class="{ 'is-active': sidebarTab === 'options' }"
            aria-label="Field Options"
            title="Field Options"
            @click="sidebarTab = 'options'"
          >
            <svg
              viewBox="0 0 30 30"
              height="22"
              width="22"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M23.4 25.4v-9.1M23.4 10.5V4.6M15 25.4V22M15 16.1V4.6M6.6 25.4v-9.1M6.6 10.5V4.6"
                stroke-width="2"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                cx="6.6"
                cy="13.4"
                r="2.6"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                cx="15"
                cy="19.1"
                r="2.6"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                cx="23.4"
                cy="13.4"
                r="2.6"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Field Options</span>
          </button>
        </div>
        <div
          v-if="sidebarTab === 'fields'"
          :class="`${rootClass}__panel`"
        >
          <div
            v-for="group in palette"
            :key="group.title"
            :class="`${rootClass}__group`"
          >
            <div :class="`${rootClass}__heading`">
              {{ group.title }}
            </div>
            <MiraiCmsUiButton
              v-for="type in group.types"
              :key="type"
              tag="button"
              variant="secondary"
              :class="`${rootClass}__add`"
              @click="add(type)"
            >
              {{ FIELD_LABELS[type] }}
            </MiraiCmsUiButton>
          </div>
        </div>
        <div
          v-else
          :class="`${rootClass}__panel`"
        >
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
          />
          <div
            v-else
            :class="`${rootClass}__empty`"
          >
            Select a field
          </div>
        </div>
      </div>

      <div :class="`${rootClass}__stage`">
        <div :class="`${rootClass}__toolbar`">
          <div :class="`${rootClass}__breakpoints`">
            <MiraiCmsUiButton
              v-for="item in formBreakpointList"
              :key="item.name"
              :class="[`${rootClass}__breakpoint-btn`]"
              tag="button"
              :variant="hasBreakpointIcon(item.name)
                ? (breakpoint !== item.name ? ['icon', 'small', 'secondary'] : ['icon', 'small'])
                : (breakpoint !== item.name ? ['secondary', 'small'] : [])"
              :active="breakpoint === item.name"
              :aria-label="item.label"
              :title="item.label"
              @click="breakpoint = item.name"
            >
              <svg
                v-if="item.name === 'desktop'"
                width="29"
                height="29"
                viewBox="0 0 30 30"
              ><rect
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-miterlimit="10"
                stroke-width="1.6"
                x="5.76"
                y="7.71"
                width="18.47"
                height="11.61"
                rx="1"
              /><line
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-miterlimit="10"
                stroke-width="1.6"
                x1="4"
                y1="22.29"
                x2="26"
                y2="22.29"
              /></svg>
              <svg
                v-else-if="item.name === 'tablet'"
                width="22"
                height="22"
                viewBox="0 0 30 30"
              ><rect
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                x="5.81"
                y="4"
                width="18.38"
                height="22"
                rx="2"
              /><line
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                x1="13.01"
                y1="23.22"
                x2="16.99"
                y2="23.22"
              /></svg>
              <svg
                v-else-if="item.name === 'phone'"
                width="23"
                height="23"
                viewBox="0 0 30 30"
              ><rect
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                x="8.67"
                y="4"
                width="12.66"
                height="22"
                rx="3"
              /><line
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                x1="15"
                y1="23.22"
                x2="15"
                y2="23.22"
              /></svg>
              <span v-else>{{ item.label }}</span>
            </MiraiCmsUiButton>
          </div>
          <MiraiCmsUiButton
            v-if="breakpoint !== baseName"
            tag="button"
            :variant="['secondary', 'small']"
            @click="matchDesktop"
          >
            Match {{ baseLabel.toLowerCase() }}
          </MiraiCmsUiButton>
          <MiraiCmsTrueFalseField
            :class="`${rootClass}__sync`"
            title="When enabled, all layouts will automatically sync with and follow the active breakpoint’s field order."
            field-key="sync-field-order"
            :model-value="content.syncFieldOrder === true"
            :field="{
              type: 'true_false',
              message: 'Sync Field Order Across Breakpoints',
            }"
            @update:model-value="setSyncFieldOrder($event === true)"
          />
          <span :class="`${rootClass}__hint`">60 columns. Drag to move, drag the edge to resize. Arrows nudge, Shift changes width.</span>
        </div>
        <div :class="`${rootClass}__steps`">
          <template
            v-for="(step, index) in content.steps"
            :key="step.id"
          >
            <div
              v-if="isDraggingStep && dropStepIndex === index"
              :class="`${rootClass}__step-placeholder`"
              :style="stepPlaceholderStyle"
            />
            <div
              :ref="(el) => setStepRef(el as Element | null, index)"
              :class="`${rootClass}__step`"
              :class="{
                'is-active': step.id === currentStepId,
                'is-floating': isDraggingStep && draggingStepIndex === index,
              }"
              :style="stepDragStyle(index)"
            >
              <span
                v-if="content.steps.length > 1"
                :class="`${rootClass}__step-handle`"
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
                :class="`${rootClass}__step-label`"
                @click="selectStep(step.id)"
              >
                {{ step.label }}
              </button>
              <button
                type="button"
                :class="`${rootClass}__step-menu`"
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
                :class="`${rootClass}__step-options`"
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
            :class="`${rootClass}__step-placeholder`"
            :style="stepPlaceholderStyle"
          />
          <button
            type="button"
            :class="`${rootClass}__step-icon`"
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
            :class="`${rootClass}__step-icon`"
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
        <div :class="`${rootClass}__scroll`">
          <div
            :class="`${rootClass}__frame`"
            :style="frameStyle"
          >
            <div
              ref="gridRef"
              :class="`${rootClass}__grid`"
              @pointerdown.self="selectedId = null"
            >
              <div
                v-if="dropPlaceholderStyle"
                :class="`${rootClass}__drop-placeholder`"
                :style="dropPlaceholderStyle"
              />
              <div
                v-for="item in layout"
                :key="item.fieldId"
                :class="`${rootClass}__item`"
                :class="{
                  'is-selected': item.fieldId === selectedId,
                  'is-dragging': drag?.fieldId === item.fieldId && drag?.mode !== 'move',
                  'is-floating': drag?.fieldId === item.fieldId && drag?.mode === 'move',
                  'is-hidden': fieldById(item.fieldId)?.text?.hidden,
                  'is-menu-open': openFieldMenu === item.fieldId,
                }"
                :style="itemVisualStyle(item)"
                @pointerdown="onItemPointerDown($event, item)"
              >
                <FieldFace
                  v-if="fieldById(item.fieldId)"
                  :field="fieldById(item.fieldId)"
                  :height="item.h"
                  preview
                />
                <div
                  :class="`${rootClass}__item-actions`"
                  @pointerdown.stop
                >
                  <button
                    type="button"
                    :class="`${rootClass}__item-action`"
                    aria-label="Clone"
                    title="Clone"
                    @click="onCloneField(item.fieldId)"
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
                    type="button"
                    :class="`${rootClass}__item-action`"
                    aria-label="Remove"
                    title="Remove"
                    @click="onRemove(item.fieldId)"
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
                      :aria-expanded="openFieldMenu === item.fieldId"
                      @click="toggleFieldMenu(item.fieldId, $event)"
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
                      v-if="openFieldMenu === item.fieldId"
                      :class="`${rootClass}__item-menu`"
                      :class="{ 'is-left': fieldMenuSide === 'left' }"
                    >
                      <button
                        type="button"
                        @click="selectedId = null; openFieldMenu = ''"
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
                        type="button"
                        @click="onCloneField(item.fieldId)"
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
                        v-if="content.steps.length > 1"
                        :class="`${rootClass}__move`"
                        @mouseenter="showMoveMenu(item.fieldId, $event)"
                        @mouseleave="hideMoveMenu"
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
                          :class="`${rootClass}__move-steps`"
                          :class="{ 'is-open': openMoveMenu === item.fieldId }"
                          :style="openMoveMenu === item.fieldId ? moveMenuStyle : undefined"
                          @mouseenter="keepMoveMenu"
                        >
                          <button
                            v-for="step in otherSteps(item.fieldId)"
                            :key="step.id"
                            type="button"
                            @click="onMoveField(item.fieldId, step.id)"
                          >
                            {{ step.label }}
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        @click="onRemove(item.fieldId)"
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
                <div
                  :class="[`${rootClass}__resizable-handle`, `${rootClass}__resizable-handle--left`]"
                  @pointerdown="onResizePointerDown($event, item, 'left')"
                >
                  <svg
                    width="15"
                    height="93"
                    viewBox="0 0 15 93"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 7.3421C15 8.79424 14.5601 10.2138 13.736 11.4212C12.9119 12.6286 11.7406 13.5696 10.3701 14.1253C8.99968 14.681 7.49168 14.8264 6.03682 14.5431C4.58197 14.2598 3.2456 13.5606 2.1967 12.5338C1.14781 11.5069 0.433503 10.1987 0.144114 8.77448C-0.145275 7.35025 0.00324964 5.874 0.570907 4.5324C1.13856 3.19081 2.09986 2.04413 3.33323 1.23737C4.5666 0.430608 6.01664 0 7.5 0C9.48831 0.00259009 11.3944 0.776963 12.8004 2.15331C14.2063 3.52966 14.9974 5.39565 15 7.3421ZM7.5 39.1579C6.01664 39.1579 4.5666 39.5885 3.33323 40.3953C2.09986 41.202 1.13856 42.3487 0.570907 43.6903C0.00324964 45.0319 -0.145275 46.5081 0.144114 47.9324C0.433503 49.3566 1.14781 50.6648 2.1967 51.6917C3.2456 52.7185 4.58197 53.4177 6.03682 53.701C7.49168 53.9843 8.99968 53.8389 10.3701 53.2832C11.7406 52.7275 12.9119 51.7865 13.736 50.5791C14.5601 49.3717 15 47.9521 15 46.5C14.9974 44.5535 14.2063 42.6876 12.8004 41.3112C11.3944 39.9349 9.48831 39.1605 7.5 39.1579ZM7.5 78.3158C6.01664 78.3158 4.5666 78.7464 3.33323 79.5532C2.09986 80.3599 1.13856 81.5066 0.570907 82.8482C0.00324964 84.1898 -0.145275 85.666 0.144114 87.0903C0.433503 88.5145 1.14781 89.8227 2.1967 90.8495C3.2456 91.8764 4.58197 92.5756 6.03682 92.8589C7.49168 93.1422 8.99968 92.9968 10.3701 92.4411C11.7406 91.8854 12.9119 90.9444 13.736 89.7369C14.5601 88.5295 15 87.11 15 85.6579C14.9974 83.7114 14.2063 81.8455 12.8004 80.4691C11.3944 79.0928 9.48831 78.3184 7.5 78.3158Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div
                  :class="[`${rootClass}__resizable-handle`, `${rootClass}__resizable-handle--right`]"
                  @pointerdown="onResizePointerDown($event, item, 'right')"
                >
                  <svg
                    width="15"
                    height="93"
                    viewBox="0 0 15 93"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 7.3421C15 8.79424 14.5601 10.2138 13.736 11.4212C12.9119 12.6286 11.7406 13.5696 10.3701 14.1253C8.99968 14.681 7.49168 14.8264 6.03682 14.5431C4.58197 14.2598 3.2456 13.5606 2.1967 12.5338C1.14781 11.5069 0.433503 10.1987 0.144114 8.77448C-0.145275 7.35025 0.00324964 5.874 0.570907 4.5324C1.13856 3.19081 2.09986 2.04413 3.33323 1.23737C4.5666 0.430608 6.01664 0 7.5 0C9.48831 0.00259009 11.3944 0.776963 12.8004 2.15331C14.2063 3.52966 14.9974 5.39565 15 7.3421ZM7.5 39.1579C6.01664 39.1579 4.5666 39.5885 3.33323 40.3953C2.09986 41.202 1.13856 42.3487 0.570907 43.6903C0.00324964 45.0319 -0.145275 46.5081 0.144114 47.9324C0.433503 49.3566 1.14781 50.6648 2.1967 51.6917C3.2456 52.7185 4.58197 53.4177 6.03682 53.701C7.49168 53.9843 8.99968 53.8389 10.3701 53.2832C11.7406 52.7275 12.9119 51.7865 13.736 50.5791C14.5601 49.3717 15 47.9521 15 46.5C14.9974 44.5535 14.2063 42.6876 12.8004 41.3112C11.3944 39.9349 9.48831 39.1605 7.5 39.1579ZM7.5 78.3158C6.01664 78.3158 4.5666 78.7464 3.33323 79.5532C2.09986 80.3599 1.13856 81.5066 0.570907 82.8482C0.00324964 84.1898 -0.145275 85.666 0.144114 87.0903C0.433503 88.5145 1.14781 89.8227 2.1967 90.8495C3.2456 91.8764 4.58197 92.5756 6.03682 92.8589C7.49168 93.1422 8.99968 92.9968 10.3701 92.4411C11.7406 91.8854 12.9119 90.9444 13.736 89.7369C14.5601 88.5295 15 87.11 15 85.6579C14.9974 83.7114 14.2063 81.8455 12.8004 80.4691C11.3944 79.0928 9.48831 78.3184 7.5 78.3158Z"
                      fill="white"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      :class="`${rootClass}__settings`"
    >
      <div :class="`${rootClass}__settings-nav`">
        <button
          type="button"
          :class="`${rootClass}__settings-item`"
          :class="{ 'is-active': settingsSection === 'form' }"
          @click="settingsSection = 'form'"
        >
          Form Settings
        </button>
        <button
          type="button"
          :class="`${rootClass}__settings-item`"
          :class="{ 'is-active': settingsSection === 'email' }"
          @click="settingsSection = 'email'"
        >
          Email Notification
        </button>
        <button
          type="button"
          :class="`${rootClass}__settings-item`"
          :class="{ 'is-active': settingsSection === 'confirmations' }"
          @click="settingsSection = 'confirmations'"
        >
          Confirmations
        </button>
      </div>
      <div :class="`${rootClass}__settings-panel`">
        <div
          v-if="settingsSection === 'form'"
          :class="`${rootClass}__form`"
        >
          <MiraiCmsTrueFalseField
            field-key="validate-on-blur"
            :model-value="content.validateOnBlur !== false"
            :field="{
              type: 'true_false',
              label: 'Validate form input on focus lost',
              instructions: 'This will validate the field when the user leaves the field.',
            }"
            @update:model-value="setValidateOnBlur($event === true)"
          />
          <MiraiCmsTrueFalseField
            field-key="prevent-empty-submit"
            :model-value="content.preventEmptySubmit !== false"
            :field="{
              type: 'true_false',
              label: 'Prevent empty form submission',
              instructions: 'This will prevent empty form submission.',
            }"
            @update:model-value="setPreventEmptySubmit($event === true)"
          />
          <MiraiCmsTextField
            v-if="content.preventEmptySubmit !== false"
            field-key="empty-submit-message"
            :model-value="content.emptySubmitMessage || 'Empty form cannot be submitted.'"
            :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
            @update:model-value="setEmptySubmitMessage"
          />
        </div>
        <div
          v-else-if="settingsSection === 'email'"
          :class="`${rootClass}__form`"
        >
          <template
            v-for="field in emailFields"
            :key="field.key"
          >
            <MiraiCmsEmailField
              v-if="field.key !== 'fromName'"
              :field-key="`notify-${field.key}`"
              :model-value="content.notification?.[field.key] ?? ''"
              :field="{ type: 'email', label: field.label }"
              @update:model-value="setNotification(field.key, String($event ?? ''))"
            />
            <MiraiCmsTextField
              v-else
              :field-key="`notify-${field.key}`"
              :model-value="content.notification?.[field.key] ?? ''"
              :field="{ type: 'text', label: field.label, maxLength: field.maxLength }"
              @update:model-value="setNotification(field.key, String($event ?? ''))"
            />
          </template>
        </div>
        <div
          v-else
          :class="`${rootClass}__form`"
        >
          <MiraiCmsWysiwygField
            field-key="success-message"
            :model-value="content.confirmation?.successMessage ?? ''"
            :field="{ type: 'wysiwyg', label: 'Success Message' }"
            @update:model-value="setSuccessMessage(String($event ?? ''))"
          />
          <MiraiCmsTextField
            field-key="redirect-page"
            :model-value="content.confirmation?.redirectPage ?? ''"
            :field="{ type: 'text', label: 'Redirect Page', maxLength: 2000 }"
            @update:model-value="setRedirectPage"
          />
        </div>
      </div>
      <!--
      <div :class="`${rootClass}__form`">
        <div :class="`${rootClass}__heading`">
          Form
        </div>
        <MiraiCmsTextField
          v-model="name"
          field-key="form-name"
          :field="{ type: 'text', label: 'Name', maxLength: 160 }"
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
        <div :class="`${rootClass}__usage`">
          Published forms render with <span>&lt;MiraiCmsForm form="1" /&gt;</span>
        </div>
      </div>
      -->
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;
$root: '.miraicms-form-builder';

#{$root} {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  outline: none;
  border-top: 1px solid $color-border;

  &__modes {
    display: flex;
    gap: math-rem(6);
    padding: math-rem(8) 0;
    border-bottom: 1px solid $color-border;
  }

  &__workspace {
    display: grid;
    grid-template-columns: math-rem(400) minmax(0, 1fr);
    flex: 1;
    min-height: 0;
  }

  &__sidebar {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    border-right: 1px solid $color-border;
    background: $color-surface;
  }

  &__tabs {
    display: flex;
    border-bottom: 1px solid $color-border;
  }

  &__tab {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: math-rem(8);
    padding: math-rem(8) math-rem(4);
    border: 0;
    border-bottom: 3px solid transparent;
    background: transparent;
    color: $color-muted;
    font: inherit;
    font-size: math-rem(12);
    cursor: pointer;

    svg {
      display: block;
    }

    &.is-active {
      color: $color-accent;
      border-bottom-color: $color-accent;
    }
  }

  &__panel {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: math-rem(8);
  }

  &__empty {
    padding: math-rem(16) math-rem(4);
    color: $color-muted;
    font-size: math-rem(13);
  }

  &__settings {
    display: grid;
    grid-template-columns: math-rem(240) minmax(0, 1fr);
    flex: 1;
    min-height: 0;
    overflow: hidden;

    &-nav {
      display: flex;
      flex-direction: column;
      gap: math-rem(4);
      min-height: 0;
      overflow: auto;
      padding: math-rem(8);
      border-right: 1px solid $color-border;
      background: $color-surface;
    }

    &-item {
      width: 100%;
      padding: math-rem(8) math-rem(10);
      border: 0;
      border-radius: $border-radius;
      background: transparent;
      color: $color-ink;
      font: inherit;
      font-size: math-rem(13);
      line-height: 1.4;
      text-align: left;
      cursor: pointer;

      &.is-active {
        background: $color-accent-wash;
        color: $color-accent;
      }
    }

    &-panel {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      padding: math-rem(16);
    }
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
    position: relative;
    z-index: 2;
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

  &__sync {
    flex: 0 0 auto;
    width: auto;
    max-width: 100%;

    :deep(.miraicms-true-false-field) {
      flex-direction: row-reverse;
    }
  }

  :deep(#{$root}__breakpoint-btn.miraicms-btn:not(.miraicms-btn--small) svg) {
    width: auto;
    height: auto !important;
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

  &__step {
    &,
    &-icon {
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

    position: relative;

    &-label,
    &-menu {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    &-label {
      padding: 0 math-rem(38) 0 math-rem(36);
      line-height: math-rem(30);
    }

    &-menu,
    &-handle {
      position: absolute;
    }

    &-menu {
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

    &-options {
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

    &-handle {
      display: flex;
      justify-content: center;
      color: $color-muted;
      cursor: grab;
      width: 20px;
      height: 20px;
      top: math-rem(5);
      left: math-rem(8);
    }

    &.is-floating {
      box-shadow: $shadow-md;
    }

    &-placeholder {
      flex-shrink: 0;
      box-sizing: border-box;
      border: 1px dashed $color-border;
      border-radius: $border-radius;
      background-color: $color-bg;
    }

    &-icon {
      justify-content: center;
      width: math-rem(32);
      padding: 0;
    }
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

  &__grid {
    display: grid;
    grid-template-columns: repeat(60, minmax(0, 1fr));
    grid-auto-rows: auto;
    align-content: start;
    position: relative;
    width: 100%;
    min-height: math-rem(240);
    background-color: $color-surface;
    border: 1px solid $color-border;
    box-shadow: $shadow-sm;
    border-radius: $border-radius;
    padding: math-rem(16) math-rem(16);
  }

  &__drop {
    &-placeholder {
      box-sizing: border-box;
      align-self: start;
      margin: math-rem(6);
      border: 1px dashed $color-border;
      border-radius: $border-radius;
      background-color: $color-bg;
      pointer-events: none;
    }
  }

  &__item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: math-rem(6);
    min-width: 0;
    height: auto;
    align-self: start;
    margin: math-rem(6);
    padding: math-rem(8) math-rem(12) math-rem(8) math-rem(8);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    cursor: grab;
    user-select: none;
    z-index: 1;

    &.is-selected {
      border-color: $color-accent;
      border-style: dashed;
      background-color: rgba($color-accent-wash, .4);
    }

    &.is-dragging {
      opacity: 0.85;
      z-index: 2;
    }

    &.is-floating {
      box-shadow: $shadow-md;
      cursor: grabbing;
    }

    &.is-hidden {
      opacity: 0.55;
    }

    &-actions {
      display: none;
      position: absolute;
      top: math-rem(-14);
      right: math-rem(-1);
      z-index: 99;
      align-items: center;
      background-color: $color-accent-wash;
      border-radius: $border-radius $border-radius 0 $border-radius;
    }

    &:hover > &-actions,
    &.is-menu-open > &-actions {
      display: flex;
    }

    &-action {
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
        color: $color-surface;
      }
    }

    &-menu {
      position: absolute;
      z-index: 6;
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

        &:hover {
          background: $color-bg;
        }
      }

      top: 100%;
      left: 0;
      margin-top: math-rem(4);

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
    }

    &.is-menu-open {
      z-index: 5;
    }

    &-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: math-rem(13);
    }

    &-meta {
      margin-left: auto;
      color: $color-muted;
      font-size: math-rem(11);
    }

    &:hover #{$root}__resizable-handle,
    &.is-dragging #{$root}__resizable-handle {
      opacity: 1;
    }
  }

  &__more {
    position: relative;

    #{$root}__item-action {
      border-radius: 0 $border-radius-inter $border-radius-inter 0;
    }
  }

  &__move {
    &-steps {
      position: absolute;
      z-index: 6;
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

        &:hover {
          background: $color-bg;
        }
      }

      display: none;
      position: fixed;
      z-index: 30;

      &.is-open {
        display: flex;
      }
    }

    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      right: 100%;
      width: math-rem(12);
    }

    &.is-right::before {
      right: auto;
      left: 100%;
    }

    &:hover > &-steps,
    &:hover > &-steps.is-open {
      display: flex;
    }
  }

  &__resizable {
    &-handle {
      display: flex;
      align-items: center;
      justify-content: center;
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

      svg {
        display: block;
        width: 4px;
        height: 20px !important;
      }

      &--left {
        left: -6px;
      }

      &--right {
        right: -6px;
      }
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: math-rem(12);
    max-width: math-rem(720);
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
