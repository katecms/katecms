<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FieldFace from './FieldFace.vue'
import FieldItemMenu from './FieldItemMenu.vue'
import FieldSettings from './FieldSettings.vue'
import type { Breakpoint, FieldType, FormContent, FormField, LayoutItem } from '../form/model'
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
  moveFieldToRepeater,
  moveFieldToStep,
  removeField,
  reorderSteps,
  replaceField,
  fieldConditionStates,
  isFieldContainer,
  isSubmitButton,
  setLayoutItem,
  textStoredValue,
} from '../form/model'
import { clientFormBreakpoints } from '../form/runtime-config'
import { iconUrl } from '../form/text-options'
import { provideMiraiCmsFieldErrors } from 'miraicms-nuxt/extensions'
import ConditionalLogic from './settings/ConditionalLogic.vue'
import StepSettings from './StepSettings.vue'

const rootClass = 'miraicms-form-builder'

defineModel<string>('name', { required: true })
const content = defineModel<FormContent, string, FormContent, FormContent>('content', { required: true })

const notificationErrors = ref<Record<string, string>>({})
watch(() => content.value.notification, (notification) => {
  notificationErrors.value = notificationFieldErrors(notification)
}, { immediate: true })
provideMiraiCmsFieldErrors(notificationErrors)

const rootRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const dragGrid = ref<HTMLElement | null>(null)
const repeaterGrids = new Map<string, HTMLElement>()
const canvasValues = ref<Record<string, string | string[]>>({})
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
const settingsSection = ref<'form' | 'email' | 'confirmations' | 'conditions'>('form')
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
  const field = content.value.fields.find(entry => entry.id === item.fieldId)
  return field?.stepId === currentStepId.value && !field.parentId
}).sort((a, b) => a.y - b.y || a.x - b.x || a.fieldId.localeCompare(b.fieldId)))
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
const selectedItem = computed(() => (content.value.layouts[breakpoint.value] ?? []).find(item => item.fieldId === selectedId.value) ?? null)
const selectedLayout = computed(() => {
  if (!selected.value) {
    return null
  }
  return selectedItem.value ?? (selected.value.parentId ? { fieldId: selected.value.id, x: 0, y: 0, w: GRID_COLUMNS } : null)
})
const submitTaken = computed(() => {
  const current = selected.value
  if (!current) {
    return false
  }
  return content.value.fields.some(field => field.id !== current.id && isSubmitButton(field))
})
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
  { title: 'Basic Fields', types: ['text', 'textarea', 'email', 'phone', 'number', 'password', 'range', 'url', 'color', 'rating', 'button', 'file', 'date', 'time', 'datetime', 'week', 'month', 'decision_box'] as FieldType[] },
  { title: 'Option/Choice Fields', types: ['image_select', 'select', 'radio', 'checkbox'] as FieldType[] },
  { title: 'Advanced Fields', types: ['repeater', 'section'] as FieldType[] },
  { title: 'Elements', types: ['title', 'image', 'divider', 'html', 'spacer'] as FieldType[] },
]

function hasBreakpointIcon(name: string) {
  return name === 'desktop' || name === 'tablet' || name === 'phone'
}

function add(type: FieldType) {
  const before = new Set(content.value.fields.map(field => field.id))
  const next = addField(content.value, type, currentStepId.value)
  content.value = next
  const created = next.fields.find(field => !before.has(field.id))
  selectedId.value = created?.id ?? null
  if (created) {
    activeStepId.value = created.stepId
  }
  stepSettingsOpen.value = false
}

function fieldLocked(fieldId: string) {
  return content.value.fields.some(field => field.id === fieldId && field.locked)
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

function onMoveToRepeater(fieldId: string, repeaterId: string) {
  content.value = moveFieldToRepeater(content.value, fieldId, repeaterId)
  selectedId.value = fieldId
  openFieldMenu.value = ''
  openMoveMenu.value = ''
}

function repeaterLayout(repeaterId: string) {
  return (content.value.layouts[breakpoint.value] ?? []).filter((item) => {
    return content.value.fields.find(field => field.id === item.fieldId)?.parentId === repeaterId
  }).sort((a, b) => a.y - b.y || a.x - b.x || a.fieldId.localeCompare(b.fieldId))
}

function bindRepeaterGrid(repeaterId: string) {
  return (element: unknown) => {
    if (element instanceof HTMLElement) {
      repeaterGrids.set(repeaterId, element)
      return
    }
    repeaterGrids.delete(repeaterId)
  }
}

function repeaterTargets(fieldId: string) {
  return containerTargets(fieldId, 'repeater')
}

function sectionTargets(fieldId: string) {
  return containerTargets(fieldId, 'section')
}

function containerTargets(fieldId: string, type: 'repeater' | 'section') {
  const field = content.value.fields.find(item => item.id === fieldId)
  if (!field || field.locked || isFieldContainer(field) || isSubmitButton(field)) {
    return []
  }
  return content.value.fields
    .filter(item => item.type === type && item.id !== field.parentId)
    .map(item => ({ id: item.id, label: repeaterName(item) }))
}

function repeaterName(repeater: FormField): string {
  const marked = repeater.text?.label
  if (marked) {
    const label = marked.text.trim()
    if (!marked.enabled || !label) {
      return repeater.key
    }
    return label
  }
  return repeater.label.trim() || repeater.key
}

function moveSteps(fieldId: string) {
  const field = content.value.fields.find(item => item.id === fieldId)
  if (!field) {
    return []
  }
  return content.value.steps.filter(step => step.id !== field.stepId || !!field.parentId)
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

function movePlaceholder(items: LayoutItem[]): CSSProperties | undefined {
  if (drag.value?.mode !== 'move' || !dragGhost.value) {
    return undefined
  }
  const item = items.find(entry => entry.fieldId === drag.value?.fieldId)
  if (!item) {
    return undefined
  }
  return {
    ...itemStyle(item),
    height: `${dragGhost.value.height}px`,
  }
}

function fieldById(fieldId: string): FormField | undefined {
  return content.value.fields.find(field => field.id === fieldId)
}

function canvasState(fieldId: string) {
  return fieldConditionStates(content.value, canvasValues.value)[fieldId] ?? {
    hidden: false,
    disabled: false,
    readonly: false,
    required: false,
  }
}

function readCanvasValues() {
  const root = gridRef.value
  if (!root) {
    return
  }
  const next: Record<string, string | string[]> = {}
  for (const field of content.value.fields) {
    const nodes = [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${CSS.escape(field.key)}"]`)]
    const multiple = field.type === 'checkbox'
      || (field.type === 'image_select' && field.text?.allowMultiple === true)
      || (field.type === 'select' && field.text?.selectMultiple.enabled === true)
    if (multiple && nodes[0] instanceof HTMLSelectElement) {
      next[field.id] = [...nodes[0].selectedOptions].map(option => option.value)
    }
    else if (multiple) {
      next[field.id] = nodes.flatMap(node => node instanceof HTMLInputElement && node.checked ? [node.value] : [])
    }
    else if (field.type === 'decision_box') {
      const checked = nodes.find(node => node instanceof HTMLInputElement && node.checked)
      next[field.id] = textStoredValue(field, checked instanceof HTMLInputElement ? checked.value : '')
    }
    else if (nodes.some(node => node instanceof HTMLInputElement && (node.type === 'radio' || node.type === 'checkbox'))) {
      const checked = nodes.find(node => node instanceof HTMLInputElement && node.checked)
      next[field.id] = checked instanceof HTMLInputElement ? checked.value : ''
    }
    else {
      next[field.id] = nodes[0]?.value ?? ''
    }
  }
  for (let pass = 0; pass < content.value.fields.length; pass += 1) {
    const states = fieldConditionStates(content.value, next)
    let changed = false
    for (const field of content.value.fields) {
      const current = next[field.id]
      const empty = Array.isArray(current) ? current.length === 0 : !String(current ?? '').trim()
      if (states[field.id]?.hidden && !empty) {
        next[field.id] = Array.isArray(current) ? [] : ''
        changed = true
      }
    }
    if (!changed) {
      break
    }
  }
  canvasValues.value = next
}

function focusBoard() {
  rootRef.value?.focus()
}

function onItemPointerDown(event: PointerEvent, item: LayoutItem, grid?: HTMLElement | null) {
  if (event.button !== 0) {
    return
  }
  dragGrid.value = grid || gridRef.value
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

function onResizePointerDown(event: PointerEvent, item: LayoutItem, edge: 'left' | 'right', grid?: HTMLElement | null) {
  event.stopPropagation()
  dragGrid.value = grid || gridRef.value
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
  dragGrid.value = null
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function cellFromEvent(event: PointerEvent): { col: number, row: number } {
  const grid = dragGrid.value || gridRef.value
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
            :class="[
              `${rootClass}__tab`,
              { 'is-active': sidebarTab === 'fields' },
            ]"
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
            :class="[
              `${rootClass}__tab`,
              { 'is-active': sidebarTab === 'options' },
            ]"
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
            v-else-if="selected && selectedLayout"
            :field="selected"
            :item="selectedLayout"
            :submit-taken="submitTaken"
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
              :class="[`${rootClass}__step`, {
                'is-active': step.id === currentStepId,
                'is-floating': isDraggingStep && draggingStepIndex === index,
              }]"
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
                :class="[`${rootClass}__step-menu`, { 'is-open': openStepMenu === step.id }]"
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
            :class="[`${rootClass}__step-icon`, { 'is-active': stepSettingsOpen }]"
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
              @input="readCanvasValues"
              @change="readCanvasValues"
          >
              <div
                v-if="movePlaceholder(layout)"
                :class="`${rootClass}__drop-placeholder`"
                :style="movePlaceholder(layout)"
              />
            <div
              v-for="item in layout"
              :key="item.fieldId"
                :class="[`${rootClass}__item`, {
                  'is-selected': item.fieldId === selectedId,
                  'is-dragging': drag?.fieldId === item.fieldId && drag?.mode !== 'move',
                  'is-floating': drag?.fieldId === item.fieldId && drag?.mode === 'move',
                  'is-hidden': canvasState(item.fieldId).hidden,
                  'is-menu-open': openFieldMenu === item.fieldId,
                }]"
                :style="itemVisualStyle(item)"
              @pointerdown="onItemPointerDown($event, item)"
            >
                <FieldFace
                  v-if="fieldById(item.fieldId)"
                  :field="fieldById(item.fieldId)"
                  :height="item.h"
                  :disabled="canvasState(item.fieldId).disabled"
                  :logic-readonly="canvasState(item.fieldId).readonly"
                  preview
                />
                <div
                  v-if="fieldById(item.fieldId) && isFieldContainer(fieldById(item.fieldId)!)"
                  :class="`${rootClass}__repeater`"
                  :data-position="fieldById(item.fieldId)?.text?.repeatButtonPosition || 'bottom'"
                  :data-align="fieldById(item.fieldId)?.text?.repeatButtonAlign || 'start'"
                  @pointerdown.stop
                >
                  <div
                    :ref="bindRepeaterGrid(item.fieldId)"
                    :class="[`${rootClass}__grid`, `${rootClass}__grid--nested`, `${rootClass}__repeater-fields`]"
                  >
                    <div
                      v-if="movePlaceholder(repeaterLayout(item.fieldId))"
                      :class="`${rootClass}__drop-placeholder`"
                      :style="movePlaceholder(repeaterLayout(item.fieldId))"
                    />
                    <div
                      v-for="child in repeaterLayout(item.fieldId)"
                      :key="child.fieldId"
                      :class="[`${rootClass}__item`, {
                        'is-selected': child.fieldId === selectedId,
                        'is-dragging': drag?.fieldId === child.fieldId && drag?.mode !== 'move',
                        'is-floating': drag?.fieldId === child.fieldId && drag?.mode === 'move',
                        'is-hidden': canvasState(child.fieldId).hidden,
                        'is-menu-open': openFieldMenu === child.fieldId,
                      }]"
                      :style="itemVisualStyle(child)"
                      @pointerdown="onItemPointerDown($event, child, repeaterGrids.get(item.fieldId))"
                    >
                      <FieldFace
                        v-if="fieldById(child.fieldId)"
                        :field="fieldById(child.fieldId)"
                        :height="child.h"
                        :disabled="canvasState(child.fieldId).disabled"
                        :logic-readonly="canvasState(child.fieldId).readonly"
                        preview
                      />
                      <FieldItemMenu
                        :field-id="child.fieldId"
                        :locked="fieldLocked(child.fieldId)"
                        :menu-open="openFieldMenu === child.fieldId"
                        :menu-side="fieldMenuSide"
                        :move-open="openMoveMenu === child.fieldId"
                        :move-style="moveMenuStyle"
                        :steps="moveSteps(child.fieldId)"
                        :repeaters="repeaterTargets(child.fieldId)"
                        :sections="sectionTargets(child.fieldId)"
                        @clone="onCloneField(child.fieldId)"
                        @remove="onRemove(child.fieldId)"
                        @deselect="selectedId = null; openFieldMenu = ''"
                        @toggle-menu="toggleFieldMenu(child.fieldId, $event)"
                        @move-enter="showMoveMenu(child.fieldId, $event)"
                        @move-leave="hideMoveMenu"
                        @move-keep="keepMoveMenu"
                        @move-step="onMoveField(child.fieldId, $event)"
                        @move-repeater="onMoveToRepeater(child.fieldId, $event)"
                      />
                      <div
                        :class="[`${rootClass}__resizable-handle`, `${rootClass}__resizable-handle--left`]"
                        @pointerdown="onResizePointerDown($event, child, 'left', repeaterGrids.get(item.fieldId))"
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
                        @pointerdown="onResizePointerDown($event, child, 'right', repeaterGrids.get(item.fieldId))"
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
                  <div
                    v-if="fieldById(item.fieldId)?.type === 'repeater'"
                    :class="`${rootClass}__repeater-buttons`"
                    :data-view="fieldById(item.fieldId)?.text?.repeatButtonView || 'horizontal'"
                  >
                    <button
                      v-if="fieldById(item.fieldId)?.text?.repeatAdd.enabled !== false"
                      type="button"
                    >
                      <img
                        v-if="iconUrl(fieldById(item.fieldId)?.text?.repeatAdd.prefix)"
                        :src="iconUrl(fieldById(item.fieldId)?.text?.repeatAdd.prefix)"
                        alt=""
                      >
                      <span>{{ fieldById(item.fieldId)?.text?.repeatAdd.text || 'Add' }}</span>
                      <img
                        v-if="iconUrl(fieldById(item.fieldId)?.text?.repeatAdd.suffix)"
                        :src="iconUrl(fieldById(item.fieldId)?.text?.repeatAdd.suffix)"
                        alt=""
                      >
                    </button>
                    <button type="button">
                      <img
                        v-if="iconUrl(fieldById(item.fieldId)?.text?.repeatRemove.prefix)"
                        :src="iconUrl(fieldById(item.fieldId)?.text?.repeatRemove.prefix)"
                        alt=""
                      >
                      <span>{{ fieldById(item.fieldId)?.text?.repeatRemove.text || 'Remove' }}</span>
                      <img
                        v-if="iconUrl(fieldById(item.fieldId)?.text?.repeatRemove.suffix)"
                        :src="iconUrl(fieldById(item.fieldId)?.text?.repeatRemove.suffix)"
                        alt=""
                      >
                    </button>
                  </div>
                </div>
                <div
                  v-if="fieldById(item.fieldId)?.type === 'repeater' && fieldById(item.fieldId)?.text?.repeatAddEnd.enabled"
                  :class="`${rootClass}__repeater-end`"
                  :data-align="fieldById(item.fieldId)?.text?.repeatAddEndAlign || 'start'"
                >
                  <button type="button">
                    <img
                      v-if="iconUrl(fieldById(item.fieldId)?.text?.repeatAddEnd.prefix)"
                      :src="iconUrl(fieldById(item.fieldId)?.text?.repeatAddEnd.prefix)"
                      alt=""
                    >
                    <span>{{ fieldById(item.fieldId)?.text?.repeatAddEnd.text || 'Add to end' }}</span>
                    <img
                      v-if="iconUrl(fieldById(item.fieldId)?.text?.repeatAddEnd.suffix)"
                      :src="iconUrl(fieldById(item.fieldId)?.text?.repeatAddEnd.suffix)"
                      alt=""
                    >
                  </button>
                </div>
                <FieldItemMenu
                  :field-id="item.fieldId"
                  :locked="fieldLocked(item.fieldId)"
                  :menu-open="openFieldMenu === item.fieldId"
                  :menu-side="fieldMenuSide"
                  :move-open="openMoveMenu === item.fieldId"
                  :move-style="moveMenuStyle"
                  :steps="moveSteps(item.fieldId)"
                  :repeaters="repeaterTargets(item.fieldId)"
                  :sections="sectionTargets(item.fieldId)"
                  @clone="onCloneField(item.fieldId)"
                  @remove="onRemove(item.fieldId)"
                  @deselect="selectedId = null; openFieldMenu = ''"
                  @toggle-menu="toggleFieldMenu(item.fieldId, $event)"
                  @move-enter="showMoveMenu(item.fieldId, $event)"
                  @move-leave="hideMoveMenu"
                  @move-keep="keepMoveMenu"
                  @move-step="onMoveField(item.fieldId, $event)"
                  @move-repeater="onMoveToRepeater(item.fieldId, $event)"
                />
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
          :class="[`${rootClass}__settings-item`, { 'is-active': settingsSection === 'form' }]"
          @click="settingsSection = 'form'"
        >
          Form Settings
        </button>
        <button
          type="button"
          :class="[`${rootClass}__settings-item`, { 'is-active': settingsSection === 'email' }]"
          @click="settingsSection = 'email'"
        >
          Email Notification
        </button>
        <button
          type="button"
          :class="[`${rootClass}__settings-item`, { 'is-active': settingsSection === 'confirmations' }]"
          @click="settingsSection = 'confirmations'"
        >
          Confirmations
        </button>
        <button
          type="button"
          :class="[`${rootClass}__settings-item`, { 'is-active': settingsSection === 'conditions' }]"
          @click="settingsSection = 'conditions'"
        >
          Conditional Logic
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
          v-else-if="settingsSection === 'confirmations'"
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
        <ConditionalLogic
          v-else
          :content="content"
          @update="content = { ...content, conditions: $event }"
        />
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
        <div :class="`${rootClass}__usage`">
          Forms render with <span>&lt;MiraiCmsForm form="1" /&gt;</span>
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

    #{$root} {
      &__group {
        &:not(:last-child) {
          margin-bottom: math-rem(16);
        }
      }
    }
  }

  &__group {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(8);

    #{$root} {
      &__heading {
        flex: 0 0 100%;
        max-width: 100%;
      }
    }
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
    flex: 0 0 calc(50% - math-rem(4.01));
    max-width: calc(50% - math-rem(4.01));
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

    &--nested {
      min-height: math-rem(72);
      border: 0;
      box-shadow: none;
      background: transparent;
      padding: 0;
      border-radius: 0;
    }
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
      z-index: 2;
    }

    &.is-dragging {
      opacity: 0.85;
      z-index: 5;
    }

    &.is-floating {
      box-shadow: $shadow-md;
      cursor: grabbing;
    }

    &.is-hidden {
      opacity: 0.55;
    }

    &:hover > :deep(#{$root}__item-actions),
    &.is-menu-open > :deep(#{$root}__item-actions) {
      display: flex;
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

  &__repeater {
    display: flex;
    gap: math-rem(8);
    width: 100%;

    &[data-position='top'] {
      flex-direction: column-reverse;
    }

    &[data-position='bottom'] {
    flex-direction: column;
    }

    &[data-position='left'] {
      flex-direction: row-reverse;
    }

    &[data-position='right'] {
      flex-direction: row;
    }

    &[data-position='top'],
    &[data-position='bottom'] {
      #{$root}__repeater-buttons {
        align-self: flex-start;
      }

      &[data-align='center'] #{$root}__repeater-buttons {
        align-self: center;
      }

      &[data-align='end'] #{$root}__repeater-buttons {
        align-self: flex-end;
      }
    }

    &[data-position='left'],
    &[data-position='right'] {
      align-items: flex-start;

      &[data-align='center'] {
        align-items: center;
      }

      &[data-align='end'] {
        align-items: flex-end;
      }
    }

    &-fields {
      flex: 1 1 auto;
      min-width: 0;
    }

    &-buttons {
      display: flex;
      flex: 0 0 auto;
      gap: math-rem(8);

      &[data-view='horizontal'] {
        flex-direction: row;
      }

      &[data-view='horizontal-reverse'] {
        flex-direction: row-reverse;
      }

      &[data-view='vertical'] {
      flex-direction: column;
      }

      &[data-view='vertical-reverse'] {
        flex-direction: column-reverse;
      }
    }
  }

  &__repeater-end {
    display: flex;
      width: 100%;
    margin-top: math-rem(8);

    &[data-align='center'] {
      justify-content: center;
    }

    &[data-align='end'] {
      justify-content: flex-end;
    }
  }

  &__repeater-buttons,
  &__repeater-end {
    button {
      display: inline-flex;
      align-items: center;
      gap: math-rem(6);
      padding: math-rem(6) math-rem(10);
      border: 1px solid $color-border;
      border-radius: $border-radius;
      background: $color-surface;
      color: $color-ink;
      font: inherit;
      cursor: default;
    }

    img {
      width: math-rem(16);
      height: math-rem(16);
      object-fit: contain;
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
