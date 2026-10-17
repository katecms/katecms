<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import {
  createFieldDefault,
  isLayoutOnlyFieldType,
  isVisible,
  ROW_COLLAPSED_KEY,
} from '@miraicms/core'
import type { Field } from '@miraicms/core'
import { resolveField } from '../../utils/helpers'

type RepeaterFieldConfig = Extract<Field, { type: 'repeater' }>

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: RepeaterFieldConfig
}>(), {
  field: () => ({ type: 'repeater', label: '', subFields: {} }),
})

const model = defineModel<Record<string, unknown>[]>({ default: () => [] })

const rootClass = 'miraicms-repeater-field'

const subFields = computed<Record<string, Field>>(() => {
  const fields = props.field?.subFields ?? {}
  if (!(ROW_COLLAPSED_KEY in fields)) {
    return fields
  }
  const { [ROW_COLLAPSED_KEY]: _conflict, ...rest } = fields
  return rest
})
const minRows = computed(() => props.field?.min ?? 0)
const maxRows = computed(() => props.field?.max)
const buttonLabel = computed(() => props.field?.buttonLabel || 'Add Row')
const collapsedKey = computed(() => resolveCollapsedKey(props.field))
const collapsible = computed(() => !!collapsedKey.value)

const rows = ref<Record<string, unknown>[]>([])
const canAdd = computed(() => maxRows.value == null || rows.value.length < maxRows.value)
const canRemove = computed(() => rows.value.length > minRows.value)
const allExpanded = computed(() =>
  rows.value.length > 0 && rows.value.every(row => !isRowCollapsed(row)),
)
const allCollapsed = computed(() =>
  rows.value.length > 0 && rows.value.every(row => isRowCollapsed(row)),
)
const showCollapseAll = computed(() => collapsible.value && rows.value.length > 0 && !allCollapsed.value)
const showExpandAll = computed(() => collapsible.value && rows.value.length > 0 && !allExpanded.value)

const draggingIndex = ref<number | null>(null)
const isDragging = ref(false)
const dropTargetIndex = ref(0)
const dragOffset = ref({ x: 0, y: 0 })
const dragSize = ref({ width: 0, height: 0 })
const dragPosition = ref({ left: 0, top: 0 })

const rowsContainerRef = ref<HTMLElement | null>(null)
const rowRefs = ref<(HTMLElement | null)[]>([])

watch(
  () => props.field,
  (field) => {
    if (!field) {
      return
    }
    if (field.collapsed && !resolveCollapsedKey(field)) {
      console.warn(
        `[miraicms] Repeater "${props.fieldKey}": option "collapsed" refers to unknown sub-field "${field.collapsed}". Collapsible mode is disabled.`,
      )
    }
    if (field.subFields && ROW_COLLAPSED_KEY in field.subFields) {
      console.warn(
        `[miraicms] Repeater "${props.fieldKey}": sub-field name "${ROW_COLLAPSED_KEY}" is reserved and will be ignored.`,
      )
    }
  },
  { immediate: true },
)

function resolveCollapsedKey(field: RepeaterFieldConfig): string | undefined {
  const key = field?.collapsed
  if (!key || key === ROW_COLLAPSED_KEY) {
    return undefined
  }
  return key in (field.subFields ?? {}) ? key : undefined
}

function isRowCollapsed(row: Record<string, unknown>, field: RepeaterFieldConfig = props.field): boolean {
  if (!resolveCollapsedKey(field)) {
    return false
  }
  return row[ROW_COLLAPSED_KEY] === true
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
  if (subField.type === 'repeater') {
    return createRepeaterRows(subField)
  }
  return deepClone(createFieldDefault(subField))
}

function createRowForRepeater(
  field: RepeaterFieldConfig,
  collapsed?: boolean,
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, subField] of Object.entries(field.subFields ?? {})) {
    if (key === ROW_COLLAPSED_KEY || isLayoutOnlyFieldType(subField.type)) {
      continue
    }
    row[key] = createSubFieldDefault(subField)
  }
  row[ROW_COLLAPSED_KEY] = collapsed ?? false
  return row
}

function createRepeaterRows(field: RepeaterFieldConfig): Record<string, unknown>[] {
  const count = field.min ?? 0
  const result: Record<string, unknown>[] = []
  while (result.length < count) {
    result.push(createRowForRepeater(field))
  }
  return result
}

function createRow(): Record<string, unknown> {
  return createRowForRepeater(props.field, false)
}

function normalizeRow(row: unknown, field: RepeaterFieldConfig): Record<string, unknown> {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return createRowForRepeater(field)
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

  for (const [key, subField] of Object.entries(field.subFields ?? {})) {
    if (key === ROW_COLLAPSED_KEY || subField.type !== 'repeater') {
      continue
    }
    const { rows: nestedRows, changed } = normalizeRepeaterValue(source[key], subField)
    if (changed) {
      assign(key, nestedRows)
    }
  }

  const collapsedValue = source[ROW_COLLAPSED_KEY]
  if (resolveCollapsedKey(field)) {
    if (typeof collapsedValue !== 'boolean') {
      assign(ROW_COLLAPSED_KEY, false)
    }
  }
  else if (ROW_COLLAPSED_KEY in source && typeof collapsedValue !== 'boolean') {
    assign(ROW_COLLAPSED_KEY, collapsedValue === true)
  }

  return next
}

function normalizeRepeaterValue(
  value: unknown,
  field: RepeaterFieldConfig,
): { rows: Record<string, unknown>[], changed: boolean } {
  const source = Array.isArray(value) ? value : []
  let changed = !Array.isArray(value)

  const normalized = source.map((row) => {
    const next = normalizeRow(row, field)
    if (next !== row) {
      changed = true
    }
    return next
  })

  const min = field.min ?? 0
  while (normalized.length < min) {
    normalized.push(createRowForRepeater(field))
    changed = true
  }

  return { rows: normalized, changed }
}

function commit(next: Record<string, unknown>[]) {
  rows.value = next
  model.value = next
}

function syncRowsFromModel() {
  rows.value = normalizeRepeaterValue(model.value, props.field).rows
}

function ensureModel() {
  const { rows: normalized, changed } = normalizeRepeaterValue(model.value, props.field)
  rows.value = normalized
  if (changed) {
    model.value = normalized
  }
}

syncRowsFromModel()

onMounted(() => {
  ensureModel()
  watch(
    [model, () => props.field],
    () => {
      ensureModel()
    },
  )
})

interface RowView {
  row: Record<string, unknown>
  key: number
  expanded: boolean
  visibleSubFields: Array<[string, Field]>
}

const rowViews = computed<RowView[]>(() =>
  rows.value.map((row) => {
    const expanded = !collapsible.value || !isRowCollapsed(row)
    return {
      row,
      key: keyForRow(row),
      expanded,
      visibleSubFields: visibleSubFields(row, expanded),
    }
  }),
)

function visibleSubFields(row: Record<string, unknown>, expanded: boolean): Array<[string, Field]> {
  return Object.entries(subFields.value).filter(([key, subField]) => {
    if (!isVisible(subField.conditionalLogic, row)) {
      return false
    }
    if (collapsible.value && !expanded) {
      return key === collapsedKey.value
    }
    return true
  })
}

function subFieldKey(index: number, key: string): string {
  return `${props.fieldKey}_${index}_${key}`
}

function subFieldStyle(subField: Field, expanded: boolean, subKey: string) {
  if (collapsible.value && !expanded && subKey === collapsedKey.value) {
    return { width: '100%' }
  }
  return subField.columnWidth ? { width: `${subField.columnWidth}%` } : undefined
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
  if (isLayoutOnlyFieldType(subFields.value[key]?.type ?? '')) {
    return
  }
  patchRow(index, { [key]: value })
}

function toggleRow(index: number) {
  if (!collapsible.value) {
    return
  }
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
  if (!canAdd.value) {
    return
  }
  const rowToInsert = collapsible.value
    ? { ...row, [ROW_COLLAPSED_KEY]: false }
    : row
  const next = [...rows.value]
  next.splice(index, 0, rowToInsert)
  commit(next)
}

function addRowBefore(index: number) {
  insertRowAt(index, createRow())
}

function addRow() {
  insertRowAt(rows.value.length, createRow())
}

function duplicateRow(index: number) {
  const source = rows.value[index]
  if (!source) {
    return
  }
  const copy = deepClone(source)
  insertRowAt(index + 1, copy)
}

function removeRow(index: number) {
  if (!canRemove.value) {
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

onBeforeUnmount(() => {
  resetDrag()
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
        v-if="!Object.keys(subFields).length"
        :class="`${rootClass}__hint`"
      >
        No subfields defined.
      </div>

      <div
        v-else
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
            <button
              v-if="collapsible"
              type="button"
              :class="`${rootClass}__toggle`"
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

            <button
              :class="`${rootClass}__handle`"
              type="button"
              aria-label="Drag to reorder"
              title="Drag to reorder"
              @mousedown="onHandleMouseDown(index, $event)"
              v-text="index + 1"
            />

            <div :class="`${rootClass}__row-wrap`">
              <div
                v-if="view.visibleSubFields.length"
                :class="`${rootClass}__row-body`"
              >
                <div
                  v-for="[subKey, subField] in view.visibleSubFields"
                  :key="subKey"
                  :class="`${rootClass}__sub-field`"
                  :style="subFieldStyle(subField, view.expanded, subKey)"
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

            <div :class="`${rootClass}__row-options`">
              <div :class="`${rootClass}__row-options-wrap`">
                <button
                  type="button"
                  :class="`${rootClass}__btn`"
                  :disabled="!canAdd"
                  aria-label="Add row"
                  title="Add row"
                  @click="addRowBefore(index)"
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
                  :disabled="!canAdd"
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
                  :disabled="!canRemove"
                  aria-label="Remove row"
                  title="Remove row"
                  @click="removeRow(index)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                  >
                    <path
                      d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"
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
        v-if="Object.keys(subFields).length"
        :class="`${rootClass}__toolbar`"
      >
        <div
          v-if="showCollapseAll || showExpandAll"
          :class="`${rootClass}__toggle-all-group`"
        >
          <MiraiCmsUiButton
            v-if="showCollapseAll"
            tag="button"
            :variant="['secondary', 'small']"
            @click="collapseAllRows"
          >
            Collapse all
          </MiraiCmsUiButton>
          <MiraiCmsUiButton
            v-if="showExpandAll"
            tag="button"
            :variant="['secondary', 'small']"
            @click="expandAllRows"
          >
            Expand all
          </MiraiCmsUiButton>
        </div>
        <MiraiCmsUiButton
          tag="button"
          variant="small"
          :disabled="!canAdd"
          @click="addRow"
        >
          {{ buttonLabel }}
        </MiraiCmsUiButton>
      </div>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-repeater-field';

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

  &__drop {
    &-placeholder {
      flex-shrink: 0;
      box-sizing: border-box;
      border: 1px dashed $color-border;
      border-radius: $border-radius;
      background-color: $color-bg;
    }
  }

  &__row {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    column-gap: math-rem(4);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background-color: $color-surface;

    &.is-floating {
      box-shadow: $shadow-md;
    }

    &-wrap {
      flex-basis: 0;
      flex-grow: 1;
      max-width: 100%;
    }

    &-options {
      flex: 0 0 32px;
      background-color: $color-bg;
      border-left: 1px solid $color-border;
      border-radius: 0 $border-radius $border-radius 0;

      &-wrap {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 90px;
        position: sticky;
        top: 0;

        > #{$root} {
          &__btn {
            &:first-child {
              border-radius: 0 $border-radius-inter 0 0;
            }
          }
        }
      }
    }

    &-body {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(16) 0;
      padding: math-rem(12) math-rem(8);
      margin-left: math-rem(-8);
      margin-right: math-rem(-8);
    }
  }

  &__handle {
    flex: 0 0 32px;
    cursor: move;
    background-color: $color-bg;
    font-size: math-rem(14);
    color: $color-muted;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 0;
    border-right: 1px solid $color-border;
    padding: 0;
    margin: 0;
    border-radius: $border-radius-inter 0 0 $border-radius-inter;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    border-radius: 0;
    border: none;
    background-color: $color-bg;
    flex-basis: 0;
    flex-grow: 1;
    cursor: pointer;

    &:not(:last-child) {
      border-bottom: 1px solid $color-border;
    }

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
      width: 12px;
      height: 12px;
      fill: $color-ink;
    }
  }

  &__toggle {
    position: absolute;
    top: 0;
    left: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    border-radius: $border-radius-inter 0 0 0;
    border: 0;
    border-bottom: 1px solid $color-border;
    border-right: 1px solid $color-border;
    background-color: $color-bg;
    z-index: 5;
    cursor: pointer;

    &:hover {
      background-color: $color-accent-wash;
    }

    svg {
      width: 12px;
      height: 12px;
      fill: $color-ink;
      transition: transform .3s;

      &.is-open {
        transform: rotate(-180deg);
      }
    }

    &-all {
      &-group {
      display: flex;
      flex-wrap: wrap;
      gap: math-rem(8);
      }
    }
  }

  &__sub {
    &-field {
      padding-left: math-rem(8);
      padding-right: math-rem(8);
      width: 100%;
    }
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(8);
  }
}
</style>
