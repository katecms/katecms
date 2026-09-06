<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import {
  createFieldDefault,
  ensureGroupDefaults,
  FLEXIBLE_CONTENT_LAYOUT_KEY as LAYOUT_KEY,
  isLayoutOnlyFieldType,
  isVisible,
  ROW_COLLAPSED_KEY,
} from '@miraicms/core'
import type { Field } from '@miraicms/core'
import { resolveField } from '../../utils/helpers'

type FlexibleContentFieldConfig = Extract<Field, { type: 'flexible_content' }>
type FlexibleLayoutConfig = FlexibleContentFieldConfig['layouts'][string]

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: FlexibleContentFieldConfig
}>(), {
  field: () => ({ type: 'flexible_content', label: '', layouts: {} }),
})

const model = defineModel<Record<string, unknown>[]>({ default: () => [] })

const rootClass = 'miraicms-flexible-content-field'

const layouts = computed<Record<string, FlexibleLayoutConfig>>(() => props.field?.layouts ?? {})
const layoutEntries = computed(() => Object.entries(layouts.value))
const hasLayouts = computed(() => layoutEntries.value.length > 0)
const firstLayoutId = computed(() => layoutEntries.value[0]?.[0])

const maxRows = computed(() => props.field?.max)
const buttonLabel = computed(() => props.field?.buttonLabel || 'Add layout')

const rows = ref<Record<string, unknown>[]>([])
const canAdd = computed(() => maxRows.value == null || rows.value.length < maxRows.value)
const allExpanded = computed(() =>
  rows.value.length > 0 && rows.value.every(row => !isRowCollapsed(row)),
)
const allCollapsed = computed(() =>
  rows.value.length > 0 && rows.value.every(row => isRowCollapsed(row)),
)
const showCollapseAll = computed(() => rows.value.length > 0 && !allCollapsed.value)
const showExpandAll = computed(() => rows.value.length > 0 && !allExpanded.value)

const draggingIndex = ref<number | null>(null)
const isDragging = ref(false)
const dropTargetIndex = ref(0)
const dragOffset = ref({ x: 0, y: 0 })
const dragSize = ref({ width: 0, height: 0 })
const dragPosition = ref({ left: 0, top: 0 })

const rowsContainerRef = ref<HTMLElement | null>(null)
const rowRefs = ref<(HTMLElement | null)[]>([])

const isLayoutPickerOpen = ref(false)
const layoutPickerInsertAt = ref(0)

watch(
  () => props.field,
  (field) => {
    if (!field) {
      return
    }
    for (const [layoutId, layout] of Object.entries(field.layouts ?? {})) {
      if (layout.subFields && ROW_COLLAPSED_KEY in layout.subFields) {
        console.warn(
          `[miraicms] Flexible Content "${props.fieldKey}" layout "${layoutId}": sub-field name "${ROW_COLLAPSED_KEY}" is reserved and will be ignored.`,
        )
      }
      if (layout.subFields && LAYOUT_KEY in layout.subFields) {
        console.warn(
          `[miraicms] Flexible Content "${props.fieldKey}" layout "${layoutId}": sub-field name "${LAYOUT_KEY}" is reserved and will be ignored.`,
        )
      }
    }
  },
  { immediate: true },
)

function isRowCollapsed(row: Record<string, unknown>): boolean {
  return row[ROW_COLLAPSED_KEY] === true
}

function getLayoutId(row: Record<string, unknown>): string {
  const value = row[LAYOUT_KEY]
  return typeof value === 'string' ? value : ''
}

function getLayout(layoutId: string): FlexibleLayoutConfig | undefined {
  return layouts.value[layoutId]
}

function getLayoutLabel(layoutId: string): string {
  return getLayout(layoutId)?.label || layoutId
}

function countLayout(layoutId: string, list: Record<string, unknown>[] = rows.value): number {
  return list.filter(row => getLayoutId(row) === layoutId).length
}

function canAddLayout(
  layoutId: string,
  list: Record<string, unknown>[] = rows.value,
): boolean {
  if (maxRows.value != null && list.length >= maxRows.value) {
    return false
  }
  const layout = getLayout(layoutId)
  if (!layout) {
    return false
  }
  return !(layout.max != null && countLayout(layoutId, list) >= layout.max)
}

function canRemoveRow(index: number): boolean {
  return !!rows.value[index]
}

function canDuplicateRow(index: number): boolean {
  const row = rows.value[index]
  if (!row) {
    return false
  }
  return canAddLayout(getLayoutId(row))
}

function layoutPreviewSrc(layout: FlexibleLayoutConfig): string | undefined {
  const previewPath = props.field?.previewPath
  if (!previewPath || !layout.preview) {
    return undefined
  }
  const base = previewPath.replace(/\/+$/, '')
  const file = layout.preview.replace(/^\/+/, '')
  return `${base}/${file}`
}

const rowKeyMap = new WeakMap<object, number>()
let rowKeySeq = 0

function keyForRow(row: Record<string, unknown>): number {
  const raw = toRaw(row)
  let key = rowKeyMap.get(raw)
  if (key === undefined) {
    rowKeySeq += 1
    key = rowKeySeq
    rowKeyMap.set(raw, key)
  }
  return key
}

function transferRowKey(from: Record<string, unknown>, to: Record<string, unknown>) {
  const key = rowKeyMap.get(toRaw(from))
  if (key !== undefined) {
    rowKeyMap.set(toRaw(to), key)
  }
}

function deepClone<T>(value: T): T {
  const raw = toRaw(value) as T
  if (raw === null || typeof raw !== 'object') {
    return raw
  }
  if (Array.isArray(raw)) {
    return raw.map(item => deepClone(item)) as unknown as T
  }
  if (raw instanceof Date) {
    return new Date(raw.getTime()) as unknown as T
  }
  const proto = Object.getPrototypeOf(raw)
  if (proto === Object.prototype || proto === null) {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(raw as Record<string, unknown>)) {
      result[key] = deepClone(item)
    }
    return result as T
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(raw)
    }
    catch {
      // Non-cloneable value — keep as-is.
    }
  }
  return raw
}

function createSubFieldDefault(subField: Field): unknown {
  return deepClone(createFieldDefault(subField))
}

function createRowForLayout(layoutId: string): Record<string, unknown> {
  const layout = getLayout(layoutId)
  const row: Record<string, unknown> = {
    [LAYOUT_KEY]: layoutId,
    [ROW_COLLAPSED_KEY]: false,
  }
  for (const [key, subField] of Object.entries(layout?.subFields ?? {})) {
    if (key === LAYOUT_KEY || key === ROW_COLLAPSED_KEY || isLayoutOnlyFieldType(subField.type)) {
      continue
    }
    row[key] = createSubFieldDefault(subField)
  }
  return row
}

function normalizeRow(
  row: unknown,
  layoutId: string,
): Record<string, unknown> {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return createRowForLayout(layoutId)
  }

  const source = row as Record<string, unknown>
  let next = source
  const assign = (key: string, value: unknown) => {
    if (next === source) {
      next = { ...source }
      transferRowKey(source, next)
    }
    next[key] = value
  }

  if (source[LAYOUT_KEY] !== layoutId) {
    assign(LAYOUT_KEY, layoutId)
  }

  const layout = getLayout(layoutId)
  for (const [key, subField] of Object.entries(layout?.subFields ?? {})) {
    if (key === LAYOUT_KEY || key === ROW_COLLAPSED_KEY || isLayoutOnlyFieldType(subField.type)) {
      continue
    }
    if (!(key in source)) {
      assign(key, createSubFieldDefault(subField))
      continue
    }
    if (subField.type === 'group') {
      const normalized = ensureGroupDefaults(source[key], subField)
      if (normalized !== source[key]) {
        assign(key, normalized)
      }
    }
    else if (
      (subField.type === 'repeater' || subField.type === 'flexible_content' || subField.type === 'gallery')
      && !Array.isArray(source[key])
    ) {
      assign(key, [])
    }
  }

  if (typeof source[ROW_COLLAPSED_KEY] !== 'boolean') {
    assign(ROW_COLLAPSED_KEY, source[ROW_COLLAPSED_KEY] === true)
  }

  return next
}

function normalizeFlexibleValue(
  value: unknown,
): { rows: Record<string, unknown>[], changed: boolean } {
  const source = Array.isArray(value) ? value : []
  let changed = !Array.isArray(value)
  const normalized: Record<string, unknown>[] = []

  for (const row of source) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      const fallbackId = firstLayoutId.value
      if (fallbackId) {
        normalized.push(createRowForLayout(fallbackId))
        changed = true
      }
      else {
        changed = true
      }
      continue
    }

    const sourceRow = row as Record<string, unknown>
    let layoutId = getLayoutId(sourceRow)
    if (!layoutId || !(layoutId in layouts.value)) {
      const fallbackId = firstLayoutId.value
      if (!fallbackId) {
        changed = true
        continue
      }
      layoutId = fallbackId
      changed = true
    }

    const next = normalizeRow(sourceRow, layoutId)
    if (next !== sourceRow) {
      changed = true
    }
    normalized.push(next)
  }

  return { rows: normalized, changed }
}

function commit(next: Record<string, unknown>[]) {
  rows.value = next
  model.value = next
}

function syncRowsFromModel() {
  rows.value = normalizeFlexibleValue(model.value).rows
}

function ensureModel() {
  const { rows: normalized, changed } = normalizeFlexibleValue(model.value)
  rows.value = normalized
  if (changed) {
    model.value = normalized
  }
}

syncRowsFromModel()

interface RowView {
  row: Record<string, unknown>
  key: number
  layoutId: string
  layoutLabel: string
  expanded: boolean
  visibleSubFields: Array<[string, Field]>
  canRemove: boolean
  canDuplicate: boolean
}

const rowViews = computed<RowView[]>(() =>
  rows.value.map((row, index) => {
    const layoutId = getLayoutId(row)
    const expanded = !isRowCollapsed(row)
    return {
      row,
      key: keyForRow(row),
      layoutId,
      layoutLabel: getLayoutLabel(layoutId),
      expanded,
      visibleSubFields: visibleSubFields(row, layoutId),
      canRemove: canRemoveRow(index),
      canDuplicate: canDuplicateRow(index),
    }
  }),
)

function visibleSubFields(
  row: Record<string, unknown>,
  layoutId: string,
): Array<[string, Field]> {
  const layout = getLayout(layoutId)
  if (!layout) {
    return []
  }
  return Object.entries(layout.subFields ?? {}).filter(([key, subField]) => {
    if (key === LAYOUT_KEY || key === ROW_COLLAPSED_KEY) {
      return false
    }
    return isVisible(subField.conditionalLogic, row)
  })
}

function subFieldKey(index: number, key: string): string {
  return `${props.fieldKey}_${index}_${key}`
}

function subFieldStyle(subField: Field) {
  return subField.columnWidth ? { width: `${subField.columnWidth}%` } : undefined
}

function closeLayoutPicker() {
  isLayoutPickerOpen.value = false
}

function openLayoutPicker(insertAt: number) {
  if (!canAdd.value || !hasLayouts.value) {
    return
  }
  layoutPickerInsertAt.value = insertAt
  isLayoutPickerOpen.value = true
}

function onLayoutPickerSelect(layoutId: string) {
  if (!canAddLayout(layoutId)) {
    return
  }
  insertRowAt(layoutPickerInsertAt.value, createRowForLayout(layoutId))
  closeLayoutPicker()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isLayoutPickerOpen.value) {
    closeLayoutPicker()
  }
}

function patchRow(index: number, patch: Record<string, unknown>) {
  commit(rows.value.map((row, rowIndex) => {
    if (rowIndex !== index) {
      return row
    }
    const next = { ...row, ...patch }
    transferRowKey(row, next)
    return next
  }))
}

function updateRowValue(index: number, key: string, value: unknown) {
  const layout = getLayout(getLayoutId(rows.value[index] ?? {}))
  if (isLayoutOnlyFieldType(layout?.subFields?.[key]?.type ?? '')) {
    return
  }
  patchRow(index, { [key]: value })
}

function toggleRow(index: number) {
  const row = rows.value[index]
  if (!row) {
    return
  }
  patchRow(index, { [ROW_COLLAPSED_KEY]: !isRowCollapsed(row) })
}

function collapseAllRows() {
  commit(rows.value.map((row) => {
    if (row[ROW_COLLAPSED_KEY] === true) {
      return row
    }
    const next = { ...row, [ROW_COLLAPSED_KEY]: true }
    transferRowKey(row, next)
    return next
  }))
}

function expandAllRows() {
  commit(rows.value.map((row) => {
    if (row[ROW_COLLAPSED_KEY] === false) {
      return row
    }
    const next = { ...row, [ROW_COLLAPSED_KEY]: false }
    transferRowKey(row, next)
    return next
  }))
}

function insertRowAt(index: number, row: Record<string, unknown>) {
  const layoutId = getLayoutId(row)
  if (!layoutId || !canAddLayout(layoutId)) {
    return
  }
  const rowToInsert = { ...row, [ROW_COLLAPSED_KEY]: false }
  const next = [...rows.value]
  next.splice(index, 0, rowToInsert)
  commit(next)
}

function duplicateRow(index: number) {
  const source = rows.value[index]
  if (!source || !canDuplicateRow(index)) {
    return
  }
  const copy = deepClone(source)
  insertRowAt(index + 1, copy)
}

function removeRow(index: number) {
  if (!canRemoveRow(index)) {
    return
  }
  commit(rows.value.filter((_, rowIndex) => rowIndex !== index))
}

function reorderRows(fromIndex: number, toIndex: number) {
  const length = rows.value.length
  if (
    fromIndex === toIndex
    || fromIndex < 0 || fromIndex >= length
    || toIndex < 0 || toIndex >= length
  ) {
    return
  }

  const next = [...rows.value]
  const [movedRow] = next.splice(fromIndex, 1)
  if (movedRow === undefined) {
    return
  }
  next.splice(toIndex, 0, movedRow)
  commit(next)
}

function reorderToInsert(from: number, insertAt: number) {
  const length = rows.value.length
  if (
    from < 0 || from >= length
    || insertAt < 0 || insertAt > length
    || insertAt === from || insertAt === from + 1
  ) {
    return
  }

  const next = [...rows.value]
  const [movedRow] = next.splice(from, 1)
  if (movedRow === undefined) {
    return
  }

  let target = insertAt
  if (from < insertAt) {
    target -= 1
  }
  next.splice(target, 0, movedRow)
  commit(next)
}

function moveRow(index: number, direction: -1 | 1) {
  reorderRows(index, index + direction)
}

const dragPlaceholderStyle = computed(() => ({
  width: `${dragSize.value.width}px`,
  height: `${dragSize.value.height}px`,
}))

function setRowRef(el: Element | null, index: number) {
  rowRefs.value[index] = el instanceof HTMLElement ? el : null
}

function rowDragStyle(index: number): CSSProperties | undefined {
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

function updateDropTargetFromPoint(clientY: number) {
  const from = draggingIndex.value
  if (from === null) {
    return
  }

  let insertAt = rows.value.length

  for (let i = 0; i < rows.value.length; i++) {
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

  dropTargetIndex.value = Math.max(0, Math.min(insertAt, rows.value.length))
}

function onDocumentMouseMove(event: MouseEvent) {
  if (!isDragging.value) {
    return
  }

  dragPosition.value = {
    left: event.clientX - dragOffset.value.x,
    top: event.clientY - dragOffset.value.y,
  }
  updateDropTargetFromPoint(event.clientY)
}

function onDocumentMouseUp() {
  if (!isDragging.value || draggingIndex.value === null) {
    return
  }

  reorderToInsert(draggingIndex.value, dropTargetIndex.value)
  resetDrag()
}

function onHandleMouseDown(index: number, event: MouseEvent) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  closeLayoutPicker()

  const handle = event.currentTarget
  if (!(handle instanceof HTMLElement)) {
    return
  }

  const rowEl = handle.closest<HTMLElement>(`.${rootClass}__row`)
  if (!rowEl) {
    return
  }

  const rect = rowEl.getBoundingClientRect()
  draggingIndex.value = index
  dropTargetIndex.value = index
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
  dragSize.value = {
    width: rect.width,
    height: rect.height,
  }
  dragPosition.value = {
    left: rect.left,
    top: rect.top,
  }
  isDragging.value = true

  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onDocumentMouseMove)
  document.addEventListener('mouseup', onDocumentMouseUp)
}

function resetDrag() {
  isDragging.value = false
  draggingIndex.value = null
  dropTargetIndex.value = 0
  dragSize.value = { width: 0, height: 0 }
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', onDocumentMouseUp)
}

onMounted(() => {
  ensureModel()
  watch(
    [model, () => props.field],
    () => {
      ensureModel()
    },
  )
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  resetDrag()
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div
        v-if="hasLayouts && rows.length"
        :class="`${rootClass}__toolbar`"
      >
        <div
          v-if="showCollapseAll || showExpandAll"
          :class="`${rootClass}__toggle-all-group`"
        >
          <MiraiCmsUiButton
            v-if="showCollapseAll"
            tag="button"
            variant="secondary"
            @click="collapseAllRows"
          >
            Collapse all
          </MiraiCmsUiButton>
          <MiraiCmsUiButton
            v-if="showExpandAll"
            tag="button"
            variant="secondary"
            @click="expandAllRows"
          >
            Expand all
          </MiraiCmsUiButton>
        </div>
        <div :class="`${rootClass}__add-wrap`">
          <MiraiCmsUiButton
            tag="button"
            :disabled="!canAdd"
            @click="openLayoutPicker(0)"
          >
            {{ buttonLabel }}
          </MiraiCmsUiButton>
        </div>
      </div>

      <p
        v-if="!hasLayouts"
        :class="`${rootClass}__hint`"
      >
        No layouts are specified.
      </p>

      <div
        v-else-if="rows.length"
        ref="rowsContainerRef"
        :class="`${rootClass}__rows`"
      >
        <template
          v-for="(view, index) in rowViews"
          :key="view.key"
        >
          <div
            v-if="isDragging && dropTargetIndex === index"
            :class="`${rootClass}__drop-placeholder`"
            :style="dragPlaceholderStyle"
          />

          <div
            :ref="(el) => setRowRef(el as Element | null, index)"
            :class="[
              `${rootClass}__row`,
              { 'is-floating': isDragging && draggingIndex === index },
            ]"
            :style="rowDragStyle(index)"
          >
            <div :class="`${rootClass}__row-header`">
              <button
                :class="`${rootClass}__handle`"
                type="button"
                aria-label="Drag to reorder"
                title="Drag to reorder"
                @mousedown="onHandleMouseDown(index, $event)"
              >
                <span
                  :class="`${rootClass}__handle-index`"
                  v-text="index + 1"
                />
                <span
                  :class="`${rootClass}__handle-title`"
                  v-text="view.layoutLabel"
                />
              </button>

              <button
                type="button"
                :class="`${rootClass}__btn`"
                :disabled="!canAdd"
                aria-label="Add layout before"
                title="Add layout before"
                @click="openLayoutPicker(index)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                >
                  <path
                    d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"
                  />
                </svg>
              </button>

              <button
                type="button"
                :class="`${rootClass}__btn`"
                :disabled="!view.canDuplicate"
                aria-label="Duplicate row"
                title="Duplicate row"
                @click="duplicateRow(index)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                >
                  <path
                    d="M352 528L128 528C119.2 528 112 520.8 112 512L112 288C112 279.2 119.2 272 128 272L176 272L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L368 464L368 512C368 520.8 360.8 528 352 528zM288 368C279.2 368 272 360.8 272 352L272 128C272 119.2 279.2 112 288 112L512 112C520.8 112 528 119.2 528 128L528 352C528 360.8 520.8 368 512 368L288 368zM224 352C224 387.3 252.7 416 288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352z"
                  />
                </svg>
              </button>

              <button
                type="button"
                :class="`${rootClass}__btn`"
                :disabled="!view.canRemove"
                aria-label="Remove row"
                title="Remove row"
                @click="removeRow(index)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                >
                  <path d="M262.2 48C248.9 48 236.9 56.3 232.2 68.8L216 112L120 112C106.7 112 96 122.7 96 136C96 149.3 106.7 160 120 160L520 160C533.3 160 544 149.3 544 136C544 122.7 533.3 112 520 112L424 112L407.8 68.8C403.1 56.3 391.2 48 377.8 48L262.2 48zM128 208L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 208L464 208L464 512C464 520.8 456.8 528 448 528L192 528C183.2 528 176 520.8 176 512L176 208L128 208zM288 280C288 266.7 277.3 256 264 256C250.7 256 240 266.7 240 280L240 456C240 469.3 250.7 480 264 480C277.3 480 288 469.3 288 456L288 280zM400 280C400 266.7 389.3 256 376 256C362.7 256 352 266.7 352 280L352 456C352 469.3 362.7 480 376 480C389.3 480 400 469.3 400 456L400 280z" />
                </svg>
              </button>

              <button
                type="button"
                :class="`${rootClass}__btn`"
                :disabled="index === 0"
                aria-label="Move up"
                title="Move up"
                @click="moveRow(index, -1)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                >
                  <path
                    d="M342.6 73.4C330.1 60.9 309.8 60.9 297.3 73.4L137.3 233.4C124.8 245.9 124.8 266.2 137.3 278.7C149.8 291.2 170.1 291.2 182.6 278.7L288 173.3L288 544C288 561.7 302.3 576 320 576C337.7 576 352 561.7 352 544L352 173.3L457.4 278.7C469.9 291.2 490.2 291.2 502.7 278.7C515.2 266.2 515.2 245.9 502.7 233.4L342.7 73.4z"
                  />
                </svg>
              </button>

              <button
                type="button"
                :class="`${rootClass}__btn`"
                :disabled="index === rows.length - 1"
                aria-label="Move down"
                title="Move down"
                @click="moveRow(index, 1)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                >
                  <path
                    d="M297.4 566.6C309.9 579.1 330.2 579.1 342.7 566.6L502.7 406.6C515.2 394.1 515.2 373.8 502.7 361.3C490.2 348.8 469.9 348.8 457.4 361.3L352 466.7L352 96C352 78.3 337.7 64 320 64C302.3 64 288 78.3 288 96L288 466.7L182.6 361.3C170.1 348.8 149.8 348.8 137.3 361.3C124.8 373.8 124.8 394.1 137.3 406.6L297.3 566.6z"
                  />
                </svg>
              </button>

              <button
                type="button"
                :class="`${rootClass}__btn`"
                :aria-label="view.expanded ? 'Collapse row' : 'Expand row'"
                :title="view.expanded ? 'Collapse row' : 'Expand row'"
                :aria-expanded="view.expanded"
                @click="toggleRow(index)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  :class="[{ 'is-open': view.expanded }]"
                >
                  <path
                    d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"
                  />
                </svg>
              </button>
            </div>

            <div
              v-show="view.expanded"
              :class="`${rootClass}__row-body`"
            >
              <div
                v-for="[subKey, subField] in view.visibleSubFields"
                :key="subKey"
                :class="`${rootClass}__sub-field`"
                :style="subFieldStyle(subField)"
              >
                <component
                  :is="resolveField(subField.type)"
                  :model-value="view.row[subKey]"
                  :field-key="subFieldKey(index, subKey)"
                  :field="subField"
                  @update:model-value="updateRowValue(index, subKey, $event)"
                />
              </div>
            </div>
          </div>
        </template>

        <div
          v-if="isDragging && dropTargetIndex === rowViews.length"
          :class="`${rootClass}__drop-placeholder`"
          :style="dragPlaceholderStyle"
        />
      </div>

      <div
        v-if="hasLayouts"
        :class="`${rootClass}__toolbar`"
      >
        <div
          v-if="showCollapseAll || showExpandAll"
          :class="`${rootClass}__toggle-all-group`"
        >
          <MiraiCmsUiButton
            v-if="showCollapseAll"
            tag="button"
            variant="secondary"
            @click="collapseAllRows"
          >
            Collapse all
          </MiraiCmsUiButton>
          <MiraiCmsUiButton
            v-if="showExpandAll"
            tag="button"
            variant="secondary"
            @click="expandAllRows"
          >
            Expand all
          </MiraiCmsUiButton>
        </div>
        <div :class="`${rootClass}__add-wrap`">
          <MiraiCmsUiButton
            tag="button"
            variant="small"
            :disabled="!canAdd"
            @click="openLayoutPicker(rows.length)"
          >
            {{ buttonLabel }}
          </MiraiCmsUiButton>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="isLayoutPickerOpen"
        :class="`${rootClass}__picker`"
        role="dialog"
        aria-modal="true"
        aria-label="Select a layout"
        @click.self="closeLayoutPicker"
      >
        <div :class="`${rootClass}__picker-dialog`">
          <div :class="`${rootClass}__picker-head`">
            <h2 :class="`${rootClass}__picker-title`">
              Choose a block
            </h2>
            <MiraiCmsUiButton
              tag="button"
              :variant="['tertiary', 'small', 'icon']"
              aria-label="Close"
              @click="closeLayoutPicker"
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

          <div :class="`${rootClass}__picker-grid`">
            <button
              v-for="[layoutId, layout] in layoutEntries"
              :key="layoutId"
              type="button"
              :class="[
                `${rootClass}__picker-card`,
                { 'is-disabled': !canAddLayout(layoutId) },
              ]"
              :disabled="!canAddLayout(layoutId)"
              @click="onLayoutPickerSelect(layoutId)"
            >
              <span
                v-if="layoutPreviewSrc(layout)"
                :class="`${rootClass}__picker-preview`"
              >
                <img
                  :src="layoutPreviewSrc(layout)"
                  :alt="layout.label"
                >
              </span>
              <span
                v-else
                :class="`${rootClass}__picker-preview-empty`"
                aria-hidden="true"
              />
              <span :class="`${rootClass}__picker-label`">{{ layout.label }}</span>
              <span
                v-if="layout.max != null"
                :class="`${rootClass}__picker-meta`"
              >
                {{ countLayout(layoutId) }} / {{ layout.max }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-flexible-content-field';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(12);

  &__hint {
    margin: 0;
    color: $color-muted;
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: math-rem(10);
    position: relative;
  }

  &__drop-placeholder {
    flex-shrink: 0;
    box-sizing: border-box;
    border: 1px dashed $color-border;
    border-radius: $border-radius;
    background-color: $color-bg;
  }

  &__row {
    position: relative;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background-color: $color-surface;
    overflow: hidden;

    &.is-floating {
      box-shadow: $shadow-md;
    }

    &-header {
      display: flex;
      column-gap: math-rem(10);
      background-color: $color-bg;
      height: 42px;
      padding-right: math-rem(8);
    }

    &-body {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(16) 0;
      padding: math-rem(12) math-rem(8);
      margin-left: math-rem(-8);
      margin-right: math-rem(-8);
      border-top: 1px solid $color-border;
    }
  }

  &__handle {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%;
    cursor: move;
    background-color: transparent;
    display: flex;
    align-items: center;
    column-gap: math-rem(10);
    border: 0;
    padding: 0 math-rem(8);
    margin: 0;
    border-radius: 0;
    color: $color-ink;

    span {
      display: block;
    }

    &-index {
      flex: 0 0 auto;
      width: auto;
      min-width: 32px;
      max-width: 100%;
      height: 20px;
      border-radius: 11px;
      border: 1px solid $color-border;
      text-align: center;
      align-self: center;
      font-size: math-rem(12);
      color: $color-muted;
    }

    &-title {
      font-size: math-rem(14);
    }
  }

  &__btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    border-radius: $border-radius-inter;
    border: 1px solid $color-border;
    background-color: transparent;
    z-index: 5;
    cursor: pointer;
    align-self: center;

    &[disabled] {
      cursor: not-allowed;

      svg {
        opacity: .3;
      }
    }

    &:not([disabled]):hover {
      background-color: $color-accent-wash;
    }

    svg {
      width: 14px;
      height: 14px;
      fill: $color-ink;
      transition: transform .3s;

      &.is-open {
        transform: rotate(-180deg);
      }
    }
  }

  &__sub-field {
    padding-left: math-rem(8);
    padding-right: math-rem(8);
    width: 100%;
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(8);
  }

  &__toggle-all-group {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(8);
  }

  &__add-wrap {
    position: relative;
    align-self: flex-start;
    margin-left: auto;
  }

  &__picker {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: math-rem(24);
    background: rgba($color-ink, 0.45);
  }

  &__picker-dialog {
    display: flex;
    flex-direction: column;
    width: min(1200px, calc(100vw - 48px));
    height: min(820px, calc(100vh - 48px));
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    box-shadow: $shadow-md;
    overflow: hidden;
  }

  &__picker-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(12);
    padding: math-rem(16) math-rem(20);
    border-bottom: 1px solid $color-border;
    background: $color-bg;
  }

  &__picker-title {
    margin: 0;
    font-size: math-rem(16);
    font-weight: 600;
    color: $color-ink;
  }

  &__picker-grid {
    flex: 1 1 auto;
    overflow: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: math-rem(16);
    padding: math-rem(20);
    align-content: start;
  }

  &__picker-card {
    display: flex;
    flex-direction: column;
    gap: math-rem(10);
    padding: math-rem(12);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    text-align: left;
    cursor: pointer;
    color: $color-ink;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover:not(:disabled) {
      border-color: $color-accent;
      box-shadow: $shadow-sm;
    }

    &:disabled,
    &.is-disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__picker-preview,
  &__picker-preview-empty {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: $border-radius-inter;
    overflow: hidden;
    background: $color-bg;
    border: 1px solid $color-border;
  }

  &__picker-preview {
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__picker-label {
    font-size: math-rem(14);
    font-weight: 600;
  }

  &__picker-meta {
    font-size: math-rem(12);
    color: $color-muted;
  }
}
</style>
