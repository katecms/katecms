<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { FormField, LayoutItem } from '../../form/model'
import { GRID_COLUMNS } from '../../form/model'
import { AUTOCOMPLETE_CHOICES, FILE_TYPE_ACCEPT, INPUT_MODE_CHOICES, PATTERN_PRESETS, defaultTextOptions, fieldHasOption, fileAccept, headingTag, isTemporalType, listedChoiceOptions, normalizeIcon, resolveChoiceEntries, temporalInputType } from '../../form/text-options'
import type { CheckPosition, FormChoiceGroup, FormChoiceOption, FormMarkedText, FormTextOptions, HeadingTag, LayoutAlign, LayoutDirection } from '../../form/text-options'
import ChoiceOptions from './ChoiceOptions.vue'
import DecoratedText from './DecoratedText.vue'
import OptionAccordion from './OptionAccordion.vue'
import SuggestionRepeater from './SuggestionRepeater.vue'
import RatingOptions from './RatingOptions.vue'

const rootClass = 'miraicms-text-settings'


const props = defineProps<{
  field: FormField
  item: LayoutItem
  submitTaken?: boolean
}>()

const emit = defineEmits<{
  update: [field: FormField]
  layout: [item: LayoutItem]
}>()

const options = computed(() => props.field.text ?? defaultTextOptions(props.field.label))

function has(id: number) {
  return fieldHasOption(props.field.type, id)
}

function repeatCount(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return null
  }
  return Math.floor(value)
}

const checkPositions: { id: CheckPosition, svg: string }[] = [
  { id: 'top-left', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm10 6h-4m0 0v4m0-4l4 4"></path></svg>' },
  { id: 'top-right', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm10 10v-4m0 0h-4m4 0l-4 4"></path></svg>' },
  { id: 'center', svg: '<svg width="22" height="22" viewBox="0 0 30 30"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.4,4.16H23.6a2.43,2.43,0,0,1,2.45,2.41V23.43a2.43,2.43,0,0,1-2.45,2.41H6.4A2.43,2.43,0,0,1,4,23.43V6.57A2.43,2.43,0,0,1,6.4,4.16Z"></path><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="15" y1="10.18" x2="15" y2="19.82"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="10.09" y1="15" x2="19.91" y2="15"></line></svg>' },
  { id: 'bottom-left', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm6 6v4m0 0h4m-4 0l4-4"></path></svg>' },
  { id: 'bottom-right', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm6 10h4m0 0v-4m0 4l-4-4"></path></svg>' },
]

const headingTagChoices = [
  { val: 'h1', lbl: 'H1' },
  { val: 'h2', lbl: 'H2' },
  { val: 'h3', lbl: 'H3' },
  { val: 'h4', lbl: 'H4' },
  { val: 'h5', lbl: 'H5' },
  { val: 'h6', lbl: 'H6' },
  { val: 'div', lbl: 'Div' },
  { val: 'span', lbl: 'Span' },
  { val: 'p', lbl: 'p' },
]

const alignChoices: { id: LayoutAlign, svg: string }[] = [
  { id: 'left', svg: '<svg width="17" height="17" viewBox="0 0 30 30"><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="6.81" x2="21.1" y2="6.81"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="15" x2="28" y2="15"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="23.19" x2="21.1" y2="23.19"></line></svg>' },
  { id: 'center', svg: '<svg width="17" height="17" viewBox="0 0 30 30"><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="5.45" y1="6.81" x2="24.55" y2="6.81"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="15" x2="28" y2="15"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="5.45" y1="23.19" x2="24.55" y2="23.19"></line></svg>' },
  { id: 'right', svg: '<svg width="17" height="17" viewBox="0 0 30 30"><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="8.9" y1="6.81" x2="28" y2="6.81"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="2" y1="15" x2="28" y2="15"></line><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke-miterlimit="10" x1="8.9" y1="23.19" x2="28" y2="23.19"></line></svg>' },
]

const directionChoices: { id: LayoutDirection, label: string, rotate: string }[] = [
  { id: 'vertical', label: 'Vertical', rotate: 'rotate(0deg)' },
  { id: 'vertical-reverse', label: 'Vertical Reverse', rotate: 'rotate(180deg)' },
  { id: 'horizontal', label: 'Horizontal', rotate: 'rotate(-90deg)' },
  { id: 'horizontal-reverse', label: 'Horizontal Reverse', rotate: 'rotate(90deg)' },
]

const patternPreset = computed(() => {
  return PATTERN_PRESETS.find(preset => preset.expression === options.value.pattern)?.id ?? ''
})

function commit(text: FormTextOptions) {
  const temporal = isTemporalType(props.field.type)
  emit('update', {
    ...props.field,
    text,
    label: text.label.text,
    placeholder: text.placeholder,
    required: text.required.enabled,
    help: text.helper.enabled ? text.helper.text : '',
    value: text.defaultValue,
    min: temporal ? text.rangeMin : props.field.type === 'number' || props.field.type === 'range' ? (text.valueMin == null ? '' : String(text.valueMin)) : props.field.min,
    max: temporal ? text.rangeMax : props.field.type === 'number' || props.field.type === 'range' ? (text.valueMax == null ? '' : String(text.valueMax)) : props.field.max,
    step: text.step == null ? '' : String(text.step),
    buttonLabel: props.field.type === 'button' ? text.buttonText.text : props.field.buttonLabel,
    accept: props.field.type === 'file' ? (fileAccept(text.fileType) || props.field.accept) : props.field.accept,
    options: listedChoiceOptions(text).length
      ? listedChoiceOptions(text).map(item => ({ label: item.label, value: item.value }))
      : props.field.options,
  })
}

function setButtonType(value: unknown) {
  const next = value === 'button' || value === 'reset' ? value : 'submit'
  if (next === 'submit' && props.submitTaken && options.value.buttonType !== 'submit') {
    return
  }
  patch({ buttonType: next })
}

function patch(partial: Partial<FormTextOptions>) {
  commit({ ...options.value, ...partial })
}

function patchMarked(key: 'label' | 'subtitle' | 'helper', value: FormMarkedText) {
  patch({ [key]: value })
}

function setCount(key: 'minLength' | 'maxLength' | 'minWords' | 'maxWords', value: number | null) {
  patch({ [key]: value == null || !Number.isFinite(value) ? null : Math.max(0, Math.floor(value)) })
}

function setPatternPreset(value: unknown) {
  const id = String(value ?? '')
  const preset = PATTERN_PRESETS.find(item => item.id === id)
  patch({ pattern: preset?.expression ?? options.value.pattern })
}

function setAxis(raw: number | null) {
  if (raw == null || !Number.isFinite(raw)) {
    return
  }
  emit('layout', { ...props.item, x: raw })
}

function setWidth(raw: number | null) {
  if (raw == null || !Number.isFinite(raw)) {
    return
  }
  emit('layout', { ...props.item, w: raw })
}

function setHeight(raw: number | null) {
  emit('layout', { ...props.item, h: raw == null || !Number.isFinite(raw) ? 0 : Math.max(0, Math.floor(raw)) })
}

const choiceRuns = computed(() => {
  const entries = resolveChoiceEntries(options.value)
  const runs: Array<
    | { kind: 'options', key: string, start: number, count: number, options: FormChoiceOption[] }
    | { kind: 'group', key: string, index: number, group: FormChoiceGroup }
  > = []
  let index = 0
  while (index < entries.length) {
    const entry = entries[index]
    if (!entry || entry.type === 'group') {
      if (entry?.type === 'group') {
        runs.push({ kind: 'group', key: entry.group.id, index, group: entry.group })
      }
      index += 1
      continue
    }
    const start = index
    const list: FormChoiceOption[] = []
    while (index < entries.length && entries[index]?.type === 'option') {
      const item = entries[index]
      if (item?.type === 'option') {
        list.push(item.option)
      }
      index += 1
    }
    runs.push({
      kind: 'options',
      key: list[0]?.id || `options-${start}`,
      start,
      count: list.length,
      options: list,
    })
  }
  return runs
})

function writeEntries(entries: ReturnType<typeof resolveChoiceEntries>) {
  patch({ choiceEntries: entries })
}

function nextOptionNumber() {
  const listed = listedChoiceOptions(options.value)
  let max = 0
  for (const option of listed) {
    const label = /^Option (\d+)$/.exec(option.label)
    const value = /^option_(\d+)$/.exec(option.value)
    max = Math.max(max, label ? Number(label[1]) : 0, value ? Number(value[1]) : 0)
  }
  return Math.max(max, listed.length) + 1
}

function nextChoiceOption(): FormChoiceOption {
  const n = nextOptionNumber()
  return {
    id: `opt_${crypto.randomUUID()}`,
    image: null,
    label: `Option ${n}`,
    value: `option_${n}`,
    checked: false,
    required: false,
    disabled: false,
  }
}

function addListedOption() {
  if (props.field.type !== 'select') {
    patch({ choiceOptions: [...options.value.choiceOptions, nextChoiceOption()] })
    return
  }
  writeEntries([...resolveChoiceEntries(options.value), { type: 'option', option: nextChoiceOption() }])
}

function addGroup() {
  const n = resolveChoiceEntries(options.value).filter(entry => entry.type === 'group').length + 1
  writeEntries([...resolveChoiceEntries(options.value), {
    type: 'group',
    group: {
      id: `grp_${crypto.randomUUID()}`,
      label: `Group ${n}`,
      options: [nextChoiceOption()],
    },
  }])
}

function setOptionRun(start: number, count: number, nextOptions: FormChoiceOption[]) {
  const entries = [...resolveChoiceEntries(options.value)]
  entries.splice(start, count, ...nextOptions.map(option => ({ type: 'option' as const, option })))
  writeEntries(entries)
}

function setGroup(index: number, group: FormChoiceGroup) {
  const entries = [...resolveChoiceEntries(options.value)]
  const current = entries[index]
  if (!current || current.type !== 'group') {
    return
  }
  entries.splice(index, 1, { type: 'group', group })
  writeEntries(entries)
}

function removeGroup(index: number) {
  writeEntries(resolveChoiceEntries(options.value).filter((_, entryIndex) => entryIndex !== index))
}

type DropMark
  = | { kind: 'none' }
    | { kind: 'before-row', listKey: string, index: number, groupId: string }
    | { kind: 'group-end', groupId: string }
    | { kind: 'before-group', groupId: string }
    | { kind: 'loose-end' }

type ActiveDrag = {
  kind: 'option' | 'group'
  groupId: string
  listKey: string
  entryStart: number
  index: number
  originX: number
  originY: number
  moved: boolean
  offset: { x: number, y: number }
  size: { width: number, height: number }
  position: { left: number, top: number }
  mark: DropMark
}

const activeDrag = ref<ActiveDrag | null>(null)

const dragFloatStyle = computed<CSSProperties | null>(() => {
  const drag = activeDrag.value
  if (!drag) {
    return null
  }
  return {
    position: 'fixed',
    left: `${drag.position.left}px`,
    top: `${drag.position.top}px`,
    width: `${drag.size.width}px`,
    height: `${drag.size.height}px`,
    zIndex: 1100,
  }
})

const dragPlaceholderStyle = computed(() => {
  const drag = activeDrag.value
  if (!drag) {
    return null
  }
  return {
    width: `${drag.size.width}px`,
    height: `${drag.size.height}px`,
  }
})

function choiceRows() {
  return [...document.querySelectorAll<HTMLElement>('[data-choice-row]')]
}

function floatIndex(listKey: string) {
  const drag = activeDrag.value
  if (!drag?.moved || drag.kind !== 'option' || drag.listKey !== listKey) {
    return null
  }
  return drag.index
}

function placeholderIndex(listKey: string) {
  const drag = activeDrag.value
  const mark = drag?.mark
  if (!drag?.moved || !mark) {
    return null
  }
  if (mark.kind === 'before-row' && mark.listKey === listKey) {
    return mark.index
  }
  if (mark.kind === 'group-end' && listKey === `group:${mark.groupId}`) {
    return choiceRows().filter(el => el.dataset.listKey === listKey).length
  }
  return null
}

function optionMark(clientY: number, listKey: string, index: number): DropMark {
  const rows = choiceRows()
    .filter(el => !(el.dataset.listKey === listKey && Number(el.dataset.optionIndex) === index))
    .map(el => ({ el, rect: el.getBoundingClientRect() }))
    .sort((a, b) => a.rect.top - b.rect.top)
  for (const row of rows) {
    if (clientY < row.rect.top + row.rect.height / 2) {
      return {
        kind: 'before-row',
        listKey: row.el.dataset.listKey || '',
        index: Number(row.el.dataset.optionIndex),
        groupId: row.el.dataset.groupId || '',
      }
    }
  }
  for (const group of document.querySelectorAll<HTMLElement>('[data-choice-group]')) {
    const rect = group.getBoundingClientRect()
    if (clientY >= rect.top && clientY <= rect.bottom) {
      return { kind: 'group-end', groupId: group.dataset.choiceGroup || '' }
    }
  }
  return { kind: 'loose-end' }
}

function groupMark(clientY: number, skipGroupId: string): DropMark {
  const points: { top: number, mid: number, mark: DropMark }[] = []
  for (const el of choiceRows()) {
    if (el.dataset.groupId) {
      continue
    }
    const rect = el.getBoundingClientRect()
    points.push({
      top: rect.top,
      mid: rect.top + rect.height / 2,
      mark: {
        kind: 'before-row',
        listKey: el.dataset.listKey || '',
        index: Number(el.dataset.optionIndex),
        groupId: '',
      },
    })
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-choice-group]')) {
    if (el.dataset.choiceGroup === skipGroupId) {
      continue
    }
    const rect = el.getBoundingClientRect()
    points.push({
      top: rect.top,
      mid: rect.top + rect.height / 2,
      mark: { kind: 'before-group', groupId: el.dataset.choiceGroup || '' },
    })
  }
  points.sort((a, b) => a.top - b.top)
  for (const point of points) {
    if (clientY < point.mid) {
      return point.mark
    }
  }
  return { kind: 'loose-end' }
}

function cloneChoiceEntries() {
  return resolveChoiceEntries(options.value).map(entry => entry.type === 'option'
    ? { type: 'option' as const, option: { ...entry.option } }
    : { type: 'group' as const, group: { ...entry.group, options: entry.group.options.map(option => ({ ...option })) } })
}

function looseEntryIndex(listKey: string, index: number) {
  const run = choiceRuns.value.find(item => item.kind === 'options' && `loose:${item.key}` === listKey)
  if (!run || run.kind !== 'options') {
    return null
  }
  return run.start + index
}

function commitOptionDrop(drag: ActiveDrag, mark: DropMark) {
  if (mark.kind === 'none') {
    return
  }
  const entries = cloneChoiceEntries()
  let destGroupId = ''
  let destEntry: number | null = null
  let destOptionIndex = 0
  if (mark.kind === 'group-end') {
    destGroupId = mark.groupId
    destOptionIndex = Number.POSITIVE_INFINITY
  }
  else if (mark.kind === 'before-row' && mark.groupId) {
    destGroupId = mark.groupId
    destOptionIndex = mark.index
  }
  else if (mark.kind === 'before-row') {
    destEntry = looseEntryIndex(mark.listKey, mark.index)
  }
  else if (mark.kind === 'before-group') {
    destEntry = entries.findIndex(entry => entry.type === 'group' && entry.group.id === mark.groupId)
  }
  else {
    destEntry = entries.length
  }
  let moved: FormChoiceOption | undefined
  if (drag.groupId) {
    const entry = entries.find(item => item.type === 'group' && item.group.id === drag.groupId)
    if (!entry || entry.type !== 'group') {
      return
    }
    moved = entry.group.options[drag.index]
    entry.group.options = entry.group.options.filter((_, index) => index !== drag.index)
  }
  else {
    const at = drag.entryStart + drag.index
    const entry = entries[at]
    if (!entry || entry.type !== 'option') {
      return
    }
    moved = entry.option
    entries.splice(at, 1)
  }
  if (!moved) {
    return
  }
  if (!drag.groupId && destEntry != null && drag.entryStart + drag.index < destEntry) {
    destEntry -= 1
  }
  if (drag.groupId && drag.groupId !== destGroupId) {
    const emptyAt = entries.findIndex(entry => entry.type === 'group' && entry.group.id === drag.groupId && entry.group.options.length === 0)
    if (emptyAt >= 0) {
      entries.splice(emptyAt, 1)
      if (destEntry != null && emptyAt < destEntry) {
        destEntry -= 1
      }
    }
  }
  if (destGroupId) {
    const entry = entries.find(item => item.type === 'group' && item.group.id === destGroupId)
    if (!entry || entry.type !== 'group') {
      entries.push({ type: 'option', option: moved })
    }
    else if (!Number.isFinite(destOptionIndex)) {
      entry.group.options.push(moved)
    }
    else {
      let at = destOptionIndex
      if (drag.groupId === destGroupId && drag.index < destOptionIndex) {
        at -= 1
      }
      entry.group.options.splice(Math.max(0, at), 0, moved)
    }
  }
  else {
    entries.splice(destEntry == null || destEntry < 0 ? entries.length : destEntry, 0, { type: 'option', option: moved })
  }
  writeEntries(entries)
}

function commitGroupDrop(groupId: string, mark: DropMark) {
  if (mark.kind === 'none') {
    return
  }
  const entries = cloneChoiceEntries()
  const from = entries.findIndex(entry => entry.type === 'group' && entry.group.id === groupId)
  if (from < 0) {
    return
  }
  const [moved] = entries.splice(from, 1)
  if (!moved) {
    return
  }
  let at = entries.length
  if (mark.kind === 'before-group') {
    at = entries.findIndex(entry => entry.type === 'group' && entry.group.id === mark.groupId)
  }
  else if (mark.kind === 'before-row') {
    const entryIndex = looseEntryIndex(mark.listKey, mark.index)
    at = entryIndex == null ? entries.length : entryIndex > from ? entryIndex - 1 : entryIndex
  }
  entries.splice(at < 0 ? entries.length : at, 0, moved)
  writeEntries(entries)
}

function onChoiceDragMove(event: MouseEvent) {
  const drag = activeDrag.value
  if (!drag) {
    return
  }
  const dx = event.clientX - drag.originX
  const dy = event.clientY - drag.originY
  if (!drag.moved && dx * dx + dy * dy < 16) {
    return
  }
  drag.moved = true
  drag.position = {
    left: event.clientX - drag.offset.x,
    top: event.clientY - drag.offset.y,
  }
  drag.mark = drag.kind === 'group'
    ? groupMark(event.clientY, drag.groupId)
    : optionMark(event.clientY, drag.listKey, drag.index)
}

function resetChoiceDrag() {
  activeDrag.value = null
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onChoiceDragMove)
  document.removeEventListener('mouseup', onChoiceDragEnd)
}

function onChoiceDragEnd() {
  const drag = activeDrag.value
  if (drag?.moved && drag.kind === 'option') {
    commitOptionDrop(drag, drag.mark)
  }
  else if (drag?.moved && drag.kind === 'group') {
    commitGroupDrop(drag.groupId, drag.mark)
  }
  resetChoiceDrag()
}

function beginDrag(partial: Omit<ActiveDrag, 'position' | 'mark' | 'moved'>, rect: DOMRect) {
  activeDrag.value = {
    ...partial,
    moved: false,
    position: { left: rect.left, top: rect.top },
    mark: { kind: 'none' },
  }
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onChoiceDragMove)
  document.addEventListener('mouseup', onChoiceDragEnd)
}

function onOptionDragStart(listKey: string, groupId: string, entryStart: number, index: number, event: MouseEvent) {
  const source = event.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : event.target instanceof HTMLElement ? event.target : null
  const row = source?.closest<HTMLElement>('[data-choice-row]') ?? null
  if (!row) {
    return
  }
  const rect = row.getBoundingClientRect()
  beginDrag({
    kind: 'option',
    groupId,
    listKey,
    entryStart,
    index,
    originX: event.clientX,
    originY: event.clientY,
    offset: { x: event.clientX - rect.left, y: event.clientY - rect.top },
    size: { width: rect.width, height: rect.height },
  }, rect)
}

function onGroupHandleDown(groupId: string, event: MouseEvent) {
  if (event.button !== 0) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  const source = event.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : event.target instanceof HTMLElement ? event.target : null
  const block = source?.closest<HTMLElement>('[data-choice-group]') ?? null
  if (!block) {
    return
  }
  const rect = block.getBoundingClientRect()
  beginDrag({
    kind: 'group',
    groupId,
    listKey: '',
    entryStart: 0,
    index: 0,
    originX: event.clientX,
    originY: event.clientY,
    offset: { x: event.clientX - rect.left, y: event.clientY - rect.top },
    size: { width: rect.width, height: rect.height },
  }, rect)
}

function groupIsFloating(groupId: string) {
  const drag = activeDrag.value
  return !!drag?.moved && drag.kind === 'group' && drag.groupId === groupId
}

function insertLoose(start: number, index: number) {
  const entries = cloneChoiceEntries()
  entries.splice(start + index + 1, 0, { type: 'option', option: nextChoiceOption() })
  writeEntries(entries)
}

function insertInGroup(entryIndex: number, index: number) {
  const entries = cloneChoiceEntries()
  const entry = entries[entryIndex]
  if (!entry || entry.type !== 'group') {
    return
  }
  const nextOptions = [...entry.group.options]
  nextOptions.splice(index + 1, 0, nextChoiceOption())
  entries[entryIndex] = { type: 'group', group: { ...entry.group, options: nextOptions } }
  writeEntries(entries)
}

function repairOptionIds() {
  if (props.field.type !== 'select') {
    return
  }
  const seen = new Set<string>()
  let changed = false
  const fix = (option: FormChoiceOption) => {
    if (option.id && !seen.has(option.id)) {
      seen.add(option.id)
      return option
    }
    changed = true
    const id = `opt_${crypto.randomUUID()}`
    seen.add(id)
    return { ...option, id }
  }
  const next = resolveChoiceEntries(options.value).map(entry => entry.type === 'option'
    ? { type: 'option' as const, option: fix(entry.option) }
    : { type: 'group' as const, group: { ...entry.group, options: entry.group.options.map(fix) } })
  if (changed) {
    writeEntries(next)
  }
}

watch(() => props.field.id, repairOptionIds, { immediate: true })

onBeforeUnmount(resetChoiceDrag)
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsWysiwygField
      v-if="field.type === 'html'"
      :model-value="field.html"
      :field-key="`${field.id}-content`"
      :field="{ type: 'wysiwyg', label: 'Content' }"
      @update:model-value="emit('update', { ...field, html: String($event ?? '') })"
    />

    <OptionAccordion
      v-if="has(62)"
      title="Title"
      :enabled="options.heading.enabled"
      @update:enabled="patch({ heading: { ...options.heading, enabled: $event } })"
    >
      <MiraiCmsTextareaField
        :model-value="options.heading.text"
        :field-key="`${field.id}-heading-text`"
        :field="{ type: 'textarea', label: 'Text', rows: 3 }"
        @update:model-value="patch({ heading: { ...options.heading, text: String($event ?? '') } })"
      />
      <MiraiCmsSelectField
        :model-value="options.heading.tag"
        :field-key="`${field.id}-heading-tag`"
        :field="{ type: 'select', label: 'HTML Tag', returnFormat: 'value', choices: headingTagChoices }"
        @update:model-value="patch({ heading: { ...options.heading, tag: headingTag(String($event ?? '')) } })"
      />
      <div :class="`${rootClass}__icon-row`">
        <MiraiCmsImageField
          :model-value="options.heading.prefix"
          :field-key="`${field.id}-heading-prefix`"
          :field="{ type: 'image', label: 'Prefix Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="patch({ heading: { ...options.heading, prefix: normalizeIcon($event) } })"
        />
        <MiraiCmsImageField
          :model-value="options.heading.suffix"
          :field-key="`${field.id}-heading-suffix`"
          :field="{ type: 'image', label: 'Suffix Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="patch({ heading: { ...options.heading, suffix: normalizeIcon($event) } })"
        />
      </div>
    </OptionAccordion>

    <OptionAccordion
      v-if="has(63)"
      title="Subtitle"
      :enabled="options.subheading.enabled"
      @update:enabled="patch({ subheading: { ...options.subheading, enabled: $event } })"
    >
      <MiraiCmsTextareaField
        :model-value="options.subheading.text"
        :field-key="`${field.id}-subheading-text`"
        :field="{ type: 'textarea', label: 'Text', rows: 3 }"
        @update:model-value="patch({ subheading: { ...options.subheading, text: String($event ?? '') } })"
      />
      <MiraiCmsSelectField
        :model-value="options.subheading.tag"
        :field-key="`${field.id}-subheading-tag`"
        :field="{ type: 'select', label: 'HTML Tag', returnFormat: 'value', choices: headingTagChoices }"
        @update:model-value="patch({ subheading: { ...options.subheading, tag: headingTag(String($event ?? '')) } })"
      />
      <div :class="`${rootClass}__icon-row`">
        <MiraiCmsImageField
          :model-value="options.subheading.prefix"
          :field-key="`${field.id}-subheading-prefix`"
          :field="{ type: 'image', label: 'Prefix Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="patch({ subheading: { ...options.subheading, prefix: normalizeIcon($event) } })"
        />
        <MiraiCmsImageField
          :model-value="options.subheading.suffix"
          :field-key="`${field.id}-subheading-suffix`"
          :field="{ type: 'image', label: 'Suffix Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="patch({ subheading: { ...options.subheading, suffix: normalizeIcon($event) } })"
        />
      </div>
    </OptionAccordion>

    <div
      v-if="has(65)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Label Alignment</span>
      <div :class="`${rootClass}__positions`">
        <MiraiCmsUiButton
          v-for="item in alignChoices"
          :key="item.id"
          tag="button"
          :variant="options.layoutAlign === item.id ? ['icon'] : ['icon', 'secondary']"
          :active="options.layoutAlign === item.id"
          :aria-label="item.id"
          @click="patch({ layoutAlign: item.id })"
        >
          <span v-html="item.svg" />
        </MiraiCmsUiButton>
      </div>
    </div>

    <div
      v-if="has(66)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Layout Direction</span>
      <div :class="`${rootClass}__positions`">
        <MiraiCmsUiButton
          v-for="item in directionChoices"
          :key="item.id"
          tag="button"
          :variant="options.layoutDirection === item.id ? ['icon'] : ['icon', 'secondary']"
          :active="options.layoutDirection === item.id"
          :aria-label="item.label"
          @click="patch({ layoutDirection: item.id })"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            :style="{ transform: item.rotate }"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M5 21q-.425 0-.713-.288Q4 20.425 4 20t.287-.712Q4.575 19 5 19h14q.425 0 .712.288q.288.287.288.712t-.288.712Q19.425 21 19 21Zm7-4.425q-.2 0-.375-.063q-.175-.062-.325-.212l-3.625-3.625Q7.4 12.4 7.4 12t.3-.7q.275-.275.7-.275q.425 0 .7.275l1.9 1.9V4q0-.425.288-.713Q11.575 3 12 3t.713.287Q13 3.575 13 4v9.2l1.925-1.925Q15.2 11 15.6 11t.7.3q.275.275.275.7q0 .425-.275.7l-3.6 3.6q-.15.15-.325.212q-.175.063-.375.063Z"
            />
          </svg>
        </MiraiCmsUiButton>
      </div>
    </div>

    <MiraiCmsImageField
      v-if="has(67)"
      :model-value="options.elementImage"
      :field-key="`${field.id}-element-image`"
      :field="{ type: 'image', label: 'Image', returnFormat: 'array' }"
      @update:model-value="patch({ elementImage: normalizeIcon($event) })"
    />

    <div
      v-if="has(68)"
      :class="`${rootClass}__grid`"
    >
      <MiraiCmsNumberField
        :model-value="options.imageWidth"
        :field-key="`${field.id}-image-width`"
        :field="{ type: 'number', label: 'Width', min: 1, step: 1 }"
        @update:model-value="patch({ imageWidth: $event == null || !Number.isFinite($event) ? null : Math.max(1, Math.floor($event)) })"
      />
      <MiraiCmsNumberField
        :model-value="options.imageHeight"
        :field-key="`${field.id}-image-height`"
        :field="{ type: 'number', label: 'Height', min: 1, step: 1 }"
        @update:model-value="patch({ imageHeight: $event == null || !Number.isFinite($event) ? null : Math.max(1, Math.floor($event)) })"
      />
    </div>

    <MiraiCmsTextareaField
      v-if="has(69)"
      :model-value="options.imageAlt"
      :field-key="`${field.id}-image-alt`"
      :field="{ type: 'textarea', label: 'Image Alt Text', rows: 3 }"
      @update:model-value="patch({ imageAlt: String($event ?? '') })"
    />

    <OptionAccordion
      v-if="has(1)"
      title="Label"
      :enabled="options.label.enabled"
      @update:enabled="patchMarked('label', { ...options.label, enabled: $event })"
    >
      <DecoratedText
        :field-key="`${field.id}-label`"
        :model="options.label"
        @update="patchMarked('label', $event)"
      />
    </OptionAccordion>

    <MiraiCmsWysiwygField
      v-if="has(76)"
      :model-value="options.decisionLabel"
      :field-key="`${field.id}-decision-label`"
      :field="{ type: 'wysiwyg', label: 'Label' }"
      @update:model-value="patch({ decisionLabel: String($event ?? '') })"
    />

    <OptionAccordion
      v-if="has(2)"
      title="Required"
      :enabled="options.required.enabled"
      @update:enabled="patch({ required: { ...options.required, enabled: $event } })"
    >
      <MiraiCmsTrueFalseField
        :model-value="options.required.showError"
        :field-key="`${field.id}-show-error`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ required: { ...options.required, showError: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.required.customError"
        :field-key="`${field.id}-custom-error`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ required: { ...options.required, customError: $event === true } })"
      />
      <DecoratedText
        v-if="options.required.customError"
        :field-key="`${field.id}-error`"
        :model="{ enabled: true, text: options.required.errorText, prefix: options.required.errorPrefix, suffix: options.required.errorSuffix }"
        text-label="Error message"
        @update="patch({ required: { ...options.required, errorText: $event.text, errorPrefix: $event.prefix, errorSuffix: $event.suffix } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.required.showAsterisk"
        :field-key="`${field.id}-asterisk`"
        :field="{ type: 'true_false', label: 'Show Asterisk Symbol' }"
        @update:model-value="patch({ required: { ...options.required, showAsterisk: $event === true } })"
      />
      <MiraiCmsSelectField
        v-if="options.required.showAsterisk"
        :model-value="options.required.asteriskPosition"
        :field-key="`${field.id}-asterisk-position`"
        :field="{
          type: 'select',
          label: 'Asterisk Position',
          returnFormat: 'value',
          choices: [
            { val: 'left', lbl: 'Left' },
            { val: 'before', lbl: 'Before' },
            { val: 'after', lbl: 'After' },
            { val: 'right', lbl: 'Right' },
          ],
        }"
        @update:model-value="patch({ required: { ...options.required, asteriskPosition: $event === 'left' || $event === 'before' || $event === 'right' ? $event : 'after' } })"
      />
    </OptionAccordion>

    <MiraiCmsTrueFalseField
      v-if="has(77)"
      :model-value="options.decisionChecked"
      :field-key="`${field.id}-decision-checked`"
      :field="{ type: 'true_false', label: 'Checked by Default' }"
      @update:model-value="patch({ decisionChecked: $event === true })"
    />
    <MiraiCmsTextField
      v-if="has(78)"
      :model-value="options.decisionCheckedValue"
      :field-key="`${field.id}-decision-checked-value`"
      :field="{ type: 'text', label: 'Checked Value' }"
      @update:model-value="patch({ decisionCheckedValue: String($event ?? '').slice(0, 200) || 'Accepted' })"
    />
    <MiraiCmsTextField
      v-if="has(79)"
      :model-value="options.decisionUncheckedValue"
      :field-key="`${field.id}-decision-unchecked-value`"
      :field="{ type: 'text', label: 'Unchecked Value' }"
      @update:model-value="patch({ decisionUncheckedValue: String($event ?? '').slice(0, 200) || 'Rejected' })"
    />

    <OptionAccordion
      v-if="has(3)"
      title="Subtitle"
      :enabled="options.subtitle.enabled"
      @update:enabled="patchMarked('subtitle', { ...options.subtitle, enabled: $event })"
    >
      <DecoratedText
        :field-key="`${field.id}-subtitle`"
        :model="options.subtitle"
        @update="patchMarked('subtitle', $event)"
      />
    </OptionAccordion>

    <OptionAccordion
      v-if="has(35)"
      title="Allow Multiple"
      :enabled="options.fileMultiple.enabled"
      @update:enabled="patch({ fileMultiple: { ...options.fileMultiple, enabled: $event } })"
    >
      <MiraiCmsNumberField
        :model-value="options.fileMultiple.minimum.value"
        :field-key="`${field.id}-file-min`"
        :field="{ type: 'number', label: 'Minimum File', min: 0, step: 1 }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, minimum: { ...options.fileMultiple.minimum, value: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) } } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.fileMultiple.minimum.showError"
        :field-key="`${field.id}-file-min-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, minimum: { ...options.fileMultiple.minimum, showError: $event === true } } })"
      />
      <MiraiCmsTrueFalseField
        v-if="options.fileMultiple.minimum.showError"
        :model-value="options.fileMultiple.minimum.customError"
        :field-key="`${field.id}-file-min-custom`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, minimum: { ...options.fileMultiple.minimum, customError: $event === true } } })"
      />
      <MiraiCmsTextField
        v-if="options.fileMultiple.minimum.showError && options.fileMultiple.minimum.customError"
        :model-value="options.fileMultiple.minimum.errorText"
        :field-key="`${field.id}-file-min-text`"
        :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, minimum: { ...options.fileMultiple.minimum, errorText: String($event ?? '') } } })"
      />
      <MiraiCmsNumberField
        :model-value="options.fileMultiple.maximum.value"
        :field-key="`${field.id}-file-max`"
        :field="{ type: 'number', label: 'Maximum File', min: 0, step: 1 }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, maximum: { ...options.fileMultiple.maximum, value: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) } } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.fileMultiple.maximum.showError"
        :field-key="`${field.id}-file-max-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, maximum: { ...options.fileMultiple.maximum, showError: $event === true } } })"
      />
      <MiraiCmsTrueFalseField
        v-if="options.fileMultiple.maximum.showError"
        :model-value="options.fileMultiple.maximum.customError"
        :field-key="`${field.id}-file-max-custom`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, maximum: { ...options.fileMultiple.maximum, customError: $event === true } } })"
      />
      <MiraiCmsTextField
        v-if="options.fileMultiple.maximum.showError && options.fileMultiple.maximum.customError"
        :model-value="options.fileMultiple.maximum.errorText"
        :field-key="`${field.id}-file-max-text`"
        :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
        @update:model-value="patch({ fileMultiple: { ...options.fileMultiple, maximum: { ...options.fileMultiple.maximum, errorText: String($event ?? '') } } })"
      />
    </OptionAccordion>

    <MiraiCmsSelectField
      v-if="has(36)"
      :model-value="options.fileType"
      :field-key="`${field.id}-file-type`"
      :field="{
        type: 'select',
        label: 'Allowed File Type',
        returnFormat: 'value',
        choices: Object.entries(FILE_TYPE_ACCEPT).map(([val, item]) => ({ val, lbl: item.label })),
      }"
      @update:model-value="patch({ fileType: typeof $event === 'string' ? $event as FormTextOptions['fileType'] : '' })"
    />

    <MiraiCmsTextField
      v-if="has(37)"
      :model-value="options.uploadButtonText"
      :field-key="`${field.id}-upload-text`"
      :field="{ type: 'text', label: 'Upload Button Text', maxLength: 80 }"
      @update:model-value="patch({ uploadButtonText: String($event ?? '') })"
    />

    <MiraiCmsTextField
      v-if="has(4)"
      :model-value="options.placeholder"
      :field-key="`${field.id}-placeholder`"
      :field="{ type: 'text', label: 'Placeholder', maxLength: 200 }"
      @update:model-value="patch({ placeholder: String($event ?? '') })"
    />

    <MiraiCmsTrueFalseField
      v-if="has(61)"
      :model-value="options.optionIcon"
      :field-key="`${field.id}-option-icon`"
      :field="{ type: 'true_false', label: 'Option Icon/Image', instructions: 'By disabling this option, the field option icon will be hidden.' }"
      @update:model-value="patch({ optionIcon: $event === true })"
    />

    <div
      v-if="has(44) || has(50)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Options</span>
      <ChoiceOptions
        :field-key="`${field.id}-choices`"
        :model="field.type === 'select' ? [] : options.choiceOptions"
        :show-image="field.type === 'image_select' || (field.type === 'select' && options.optionIcon)"
        :show-required="field.type === 'image_select' || field.type === 'checkbox' || field.type === 'select'"
        :show-disabled="has(44)"
        :single-check="field.type === 'radio' || (field.type === 'select' && !options.selectMultiple.enabled) || (field.type === 'image_select' && !options.allowMultiple)"
        :show-add-group="field.type === 'select'"
        :count="listedChoiceOptions(options).length"
        @update="patch({ choiceOptions: $event })"
        @add-group="addGroup"
        @add-option="addListedOption"
      >
        <template
          v-if="field.type === 'select'"
          #extra
        >
          <template
            v-for="run in choiceRuns"
            :key="run.key"
          >
            <div
              v-if="run.kind === 'group' && activeDrag?.kind === 'group' && activeDrag.mark.kind === 'before-group' && activeDrag.mark.groupId === run.group.id"
              :class="`${rootClass}__group-placeholder`"
              :style="dragPlaceholderStyle"
            />
            <div
              :class="[`${rootClass}__choice-block`, { 'is-floating': run.kind === 'group' && groupIsFloating(run.group.id) }]"
              :style="run.kind === 'group' && groupIsFloating(run.group.id) ? dragFloatStyle ?? undefined : undefined"
            >
              <ChoiceOptions
                v-if="run.kind === 'options'"
                :field-key="`${field.id}-choices-${run.key}`"
                :model="run.options"
                :show-image="options.optionIcon"
                :show-required="true"
                :show-disabled="true"
                :single-check="!options.selectMultiple.enabled"
                external-drag
                :list-key="`loose:${run.key}`"
                :floating-index="floatIndex(`loose:${run.key}`)"
                :placeholder-index="placeholderIndex(`loose:${run.key}`)"
                :float-style="dragFloatStyle"
                :external-placeholder-style="dragPlaceholderStyle"
                embedded
                @update="setOptionRun(run.start, run.count, $event)"
                @insert="insertLoose(run.start, $event)"
                @drag-start="(index, event) => onOptionDragStart(`loose:${run.key}`, '', run.start, index, event)"
              />
              <div
                v-else
                :class="[`${rootClass}__group`, `${rootClass}__group--popup`]"
                :data-choice-group="run.group.id"
              >
                <div :class="`${rootClass}__group-header`">
                  <button
                    type="button"
                    :class="`${rootClass}__group-handle`"
                    aria-label="Move group"
                    @mousedown="onGroupHandleDown(run.group.id, $event)"
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
                        /><circle
                          cx="16"
                          cy="4"
                          r="1"
                        />
                        <circle
                          cx="8"
                          cy="12"
                          r="1"
                        /><circle
                          cx="16"
                          cy="12"
                          r="1"
                        />
                        <circle
                          cx="8"
                          cy="20"
                          r="1"
                        /><circle
                          cx="16"
                          cy="20"
                          r="1"
                        />
                      </g>
                    </svg>
                  </button>

                  <MiraiCmsTextField
                    :model-value="run.group.label"
                    :field-key="`${field.id}-group-${run.group.id}`"
                    :field="{ type: 'text', label: 'Group', maxLength: 200 }"
                    @update:model-value="setGroup(run.index, { ...run.group, label: String($event ?? '') })"
                  />
                  <MiraiCmsUiButton
                    tag="button"
                    :variant="['red', 'icon']"
                    aria-label="Remove Group"
                    title="Remove Group"
                    @click="removeGroup(run.index)"
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
                <ChoiceOptions
                  :field-key="`${field.id}-group-options-${run.group.id}`"
                  :model="run.group.options"
                  :show-image="options.optionIcon"
                  :show-required="true"
                  :show-disabled="true"
                  :single-check="!options.selectMultiple.enabled"
                  external-drag
                  :list-key="`group:${run.group.id}`"
                  :group-id="run.group.id"
                  :floating-index="floatIndex(`group:${run.group.id}`)"
                  :placeholder-index="placeholderIndex(`group:${run.group.id}`)"
                  :float-style="dragFloatStyle"
                  :external-placeholder-style="dragPlaceholderStyle"
                  embedded
                  @update="setGroup(run.index, { ...run.group, options: $event })"
                  @insert="insertInGroup(run.index, $event)"
                  @drag-start="(index, event) => onOptionDragStart(`group:${run.group.id}`, run.group.id, run.index, index, event)"
                />
              </div>
            </div>
          </template>
          <div
            v-if="activeDrag?.mark.kind === 'loose-end'"
            :class="`${rootClass}__group-placeholder`"
            :style="dragPlaceholderStyle ?? undefined"
          />
        </template>
      </ChoiceOptions>
    </div>

    <div
      v-if="has(54)"
      :class="`${rootClass}__group`"
    >
      <MiraiCmsTrueFalseField
        :model-value="options.selectMultiple.enabled"
        :field-key="`${field.id}-select-multiple`"
        :field="{ type: 'true_false', label: 'Allow Multiple Select' }"
        @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, enabled: $event === true } })"
      />
      <template v-if="options.selectMultiple.enabled">
        <MiraiCmsNumberField
          :model-value="options.selectMultiple.minimum.value"
          :field-key="`${field.id}-select-min`"
          :field="{ type: 'number', label: 'Minimum Option', min: 0, step: 1 }"
          @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, minimum: { ...options.selectMultiple.minimum, value: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) } } })"
        />
        <template v-if="(options.selectMultiple.minimum.value ?? 0) > 0">
          <MiraiCmsTrueFalseField
            :model-value="options.selectMultiple.minimum.showError"
            :field-key="`${field.id}-select-min-show`"
            :field="{ type: 'true_false', label: 'Show Error Message' }"
            @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, minimum: { ...options.selectMultiple.minimum, showError: $event === true } } })"
          />
          <MiraiCmsTrueFalseField
            v-if="options.selectMultiple.minimum.showError"
            :model-value="options.selectMultiple.minimum.customError"
            :field-key="`${field.id}-select-min-custom`"
            :field="{ type: 'true_false', label: 'Custom Error Message' }"
            @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, minimum: { ...options.selectMultiple.minimum, customError: $event === true } } })"
          />
          <MiraiCmsTextField
            v-if="options.selectMultiple.minimum.showError && options.selectMultiple.minimum.customError"
            :model-value="options.selectMultiple.minimum.errorText"
            :field-key="`${field.id}-select-min-text`"
            :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
            @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, minimum: { ...options.selectMultiple.minimum, errorText: String($event ?? '') } } })"
          />
        </template>
        <MiraiCmsNumberField
          :model-value="options.selectMultiple.maximum.value"
          :field-key="`${field.id}-select-max`"
          :field="{ type: 'number', label: 'Maximum Option', min: 0, step: 1 }"
          @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, maximum: { ...options.selectMultiple.maximum, value: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) } } })"
        />
        <template v-if="(options.selectMultiple.maximum.value ?? 0) > 0">
          <MiraiCmsTrueFalseField
            :model-value="options.selectMultiple.maximum.showError"
            :field-key="`${field.id}-select-max-show`"
            :field="{ type: 'true_false', label: 'Show Error Message' }"
            @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, maximum: { ...options.selectMultiple.maximum, showError: $event === true } } })"
          />
          <MiraiCmsTrueFalseField
            v-if="options.selectMultiple.maximum.showError"
            :model-value="options.selectMultiple.maximum.customError"
            :field-key="`${field.id}-select-max-custom`"
            :field="{ type: 'true_false', label: 'Custom Error Message' }"
            @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, maximum: { ...options.selectMultiple.maximum, customError: $event === true } } })"
          />
          <MiraiCmsTextField
            v-if="options.selectMultiple.maximum.showError && options.selectMultiple.maximum.customError"
            :model-value="options.selectMultiple.maximum.errorText"
            :field-key="`${field.id}-select-max-text`"
            :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
            @update:model-value="patch({ selectMultiple: { ...options.selectMultiple, maximum: { ...options.selectMultiple.maximum, errorText: String($event ?? '') } } })"
          />
        </template>
      </template>
    </div>

    <MiraiCmsTrueFalseField
      v-if="has(45)"
      :model-value="options.allowMultiple"
      :field-key="`${field.id}-allow-multiple`"
      :field="{ type: 'true_false', label: 'Allow Multiple' }"
      @update:model-value="patch({ allowMultiple: $event === true })"
    />

    <div
      v-if="has(46) && options.allowMultiple"
      :class="`${rootClass}__grid`"
    >
      <MiraiCmsNumberField
        :model-value="options.choiceMin"
        :field-key="`${field.id}-choice-min`"
        :field="{ type: 'number', label: 'Minimum', min: 0, step: 1 }"
        @update:model-value="patch({ choiceMin: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) })"
      />
      <MiraiCmsNumberField
        :model-value="options.choiceMax"
        :field-key="`${field.id}-choice-max`"
        :field="{ type: 'number', label: 'Maximum', min: 0, step: 1 }"
        @update:model-value="patch({ choiceMax: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) })"
      />
    </div>

    <MiraiCmsTextareaField
      v-if="has(5) && field.type === 'textarea'"
      :model-value="options.defaultValue"
      :field-key="`${field.id}-default`"
      :field="{ type: 'textarea', label: 'Default value', rows: 4 }"
      @update:model-value="patch({ defaultValue: String($event ?? '') })"
    />
    <MiraiCmsTextField
      v-if="has(5) && field.type !== 'textarea' && !isTemporalType(field.type)"
      :model-value="options.defaultValue"
      :field-key="`${field.id}-default`"
      :field="{ type: 'text', label: 'Default value', maxLength: 20000 }"
      @update:model-value="patch({ defaultValue: String($event ?? '') })"
    />
    <div
      v-if="has(5) && isTemporalType(field.type)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Default value</span>
      <input
        :class="`${rootClass}__native`"
        :type="temporalInputType(field.type)"
        :value="options.defaultValue"
        @input="patch({ defaultValue: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <div
      v-if="has(6)"
      :class="`${rootClass}__icons`"
    >
      <span :class="`${rootClass}__heading`">Input Icons</span>
      <div :class="`${rootClass}__icon-row`">
        <MiraiCmsImageField
          :model-value="options.prefix"
          :field-key="`${field.id}-input-prefix`"
          :field="{ type: 'image', label: 'Prefix Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="patch({ prefix: normalizeIcon($event) })"
        />
        <MiraiCmsImageField
          :model-value="options.suffix"
          :field-key="`${field.id}-input-suffix`"
          :field="{ type: 'image', label: 'Suffix Icon', iconMode: true, returnFormat: 'array' }"
          @update:model-value="patch({ suffix: normalizeIcon($event) })"
        />
      </div>
    </div>

    <div
      v-if="has(70)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Repeatable Row Count (Min/Max)</span>
      <MiraiCmsNumberField
        :model-value="options.repeatDefault"
        :field-key="`${field.id}-repeat-default`"
        :field="{ type: 'number', label: 'Default Row', min: 0, step: 1 }"
        @update:model-value="patch({ repeatDefault: repeatCount($event) })"
      />
      <MiraiCmsNumberField
        :model-value="options.repeatMinimum.value"
        :field-key="`${field.id}-repeat-min`"
        :field="{ type: 'number', label: 'Minimum Row', min: 0, step: 1 }"
        @update:model-value="patch({ repeatMinimum: { ...options.repeatMinimum, value: repeatCount($event) }, repeatMaximum: { ...options.repeatMaximum, value: options.repeatMaximum.value != null && repeatCount($event) != null && options.repeatMaximum.value < (repeatCount($event) ?? 0) ? repeatCount($event) : options.repeatMaximum.value } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.repeatMinimum.showError"
        :field-key="`${field.id}-repeat-min-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ repeatMinimum: { ...options.repeatMinimum, showError: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        v-if="options.repeatMinimum.showError"
        :model-value="options.repeatMinimum.customError"
        :field-key="`${field.id}-repeat-min-custom`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ repeatMinimum: { ...options.repeatMinimum, customError: $event === true } })"
      />
      <DecoratedText
        v-if="options.repeatMinimum.showError && options.repeatMinimum.customError"
        :field-key="`${field.id}-repeat-min-error`"
        :model="{ enabled: true, text: options.repeatMinimum.errorText, prefix: options.repeatMinimum.errorPrefix, suffix: options.repeatMinimum.errorSuffix }"
        text-label="Error message"
        @update="patch({ repeatMinimum: { ...options.repeatMinimum, errorText: $event.text, errorPrefix: $event.prefix, errorSuffix: $event.suffix } })"
      />
      <MiraiCmsNumberField
        :model-value="options.repeatMaximum.value"
        :field-key="`${field.id}-repeat-max`"
        :field="{ type: 'number', label: 'Maximum Row', min: options.repeatMinimum.value ?? 0, step: 1 }"
        @update:model-value="patch({ repeatMaximum: { ...options.repeatMaximum, value: repeatCount($event) != null && options.repeatMinimum.value != null && (repeatCount($event) ?? 0) < options.repeatMinimum.value ? options.repeatMinimum.value : repeatCount($event) } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.repeatMaximum.showError"
        :field-key="`${field.id}-repeat-max-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ repeatMaximum: { ...options.repeatMaximum, showError: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        v-if="options.repeatMaximum.showError"
        :model-value="options.repeatMaximum.customError"
        :field-key="`${field.id}-repeat-max-custom`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ repeatMaximum: { ...options.repeatMaximum, customError: $event === true } })"
      />
      <DecoratedText
        v-if="options.repeatMaximum.showError && options.repeatMaximum.customError"
        :field-key="`${field.id}-repeat-max-error`"
        :model="{ enabled: true, text: options.repeatMaximum.errorText, prefix: options.repeatMaximum.errorPrefix, suffix: options.repeatMaximum.errorSuffix }"
        text-label="Error message"
        @update="patch({ repeatMaximum: { ...options.repeatMaximum, errorText: $event.text, errorPrefix: $event.prefix, errorSuffix: $event.suffix } })"
      />
    </div>

    <div
      v-if="has(71)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Button Layout and Position</span>
      <MiraiCmsSelectField
        :model-value="options.repeatButtonPosition"
        :field-key="`${field.id}-repeat-position`"
        :field="{
          type: 'select',
          label: 'Button Position',
          returnFormat: 'value',
          choices: [
            { val: 'top', lbl: 'Top' },
            { val: 'bottom', lbl: 'Bottom' },
            { val: 'left', lbl: 'Left' },
            { val: 'right', lbl: 'Right' },
          ],
        }"
        @update:model-value="patch({ repeatButtonPosition: $event === 'top' || $event === 'left' || $event === 'right' ? $event : 'bottom' })"
      />
      <MiraiCmsSelectField
        :model-value="options.repeatButtonAlign"
        :field-key="`${field.id}-repeat-align`"
        :field="{
          type: 'select',
          label: 'Button Alignment',
          returnFormat: 'value',
          choices: [
            { val: 'start', lbl: 'Start' },
            { val: 'center', lbl: 'Center' },
            { val: 'end', lbl: 'End' },
          ],
        }"
        @update:model-value="patch({ repeatButtonAlign: $event === 'center' || $event === 'end' ? $event : 'start' })"
      />
      <MiraiCmsSelectField
        :model-value="options.repeatButtonView"
        :field-key="`${field.id}-repeat-view`"
        :field="{
          type: 'select',
          label: 'Button View',
          returnFormat: 'value',
          choices: [
            { val: 'vertical', lbl: 'Vertical' },
            { val: 'vertical-reverse', lbl: 'Vertical-reverse' },
            { val: 'horizontal', lbl: 'Horizontal' },
            { val: 'horizontal-reverse', lbl: 'Horizontal-Reverse' },
          ],
        }"
        @update:model-value="patch({ repeatButtonView: $event === 'vertical' || $event === 'vertical-reverse' || $event === 'horizontal-reverse' ? $event : 'horizontal' })"
      />
    </div>

    <OptionAccordion
      v-if="has(72)"
      title="Add Button"
      :enabled="options.repeatAdd.enabled"
      @update:enabled="patch({ repeatAdd: { ...options.repeatAdd, enabled: $event } })"
    >
      <DecoratedText
        :field-key="`${field.id}-repeat-add`"
        :model="options.repeatAdd"
        text-label="Text"
        @update="patch({ repeatAdd: $event })"
      />
    </OptionAccordion>

    <div
      v-if="has(73)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Remove Button</span>
      <DecoratedText
        :field-key="`${field.id}-repeat-remove`"
        :model="options.repeatRemove"
        text-label="Text"
        @update="patch({ repeatRemove: { ...$event, enabled: true } })"
      />
    </div>

    <OptionAccordion
      v-if="has(74)"
      title="Add To End Button"
      :enabled="options.repeatAddEnd.enabled"
      @update:enabled="patch({ repeatAddEnd: { ...options.repeatAddEnd, enabled: $event } })"
    >
      <DecoratedText
        :field-key="`${field.id}-repeat-end`"
        :model="options.repeatAddEnd"
        text-label="Text"
        @update="patch({ repeatAddEnd: $event })"
      />
      <MiraiCmsSelectField
        :model-value="options.repeatAddEndAlign"
        :field-key="`${field.id}-repeat-end-align`"
        :field="{
          type: 'select',
          label: 'Button Alignment',
          returnFormat: 'value',
          choices: [
            { val: 'start', lbl: 'Start' },
            { val: 'center', lbl: 'Center' },
            { val: 'end', lbl: 'End' },
          ],
        }"
        @update:model-value="patch({ repeatAddEndAlign: $event === 'center' || $event === 'end' ? $event : 'start' })"
      />
    </OptionAccordion>

    <OptionAccordion
      v-if="has(7)"
      title="Helper Text"
      :enabled="options.helper.enabled"
      @update:enabled="patchMarked('helper', { ...options.helper, enabled: $event })"
    >
      <DecoratedText
        :field-key="`${field.id}-helper`"
        :model="options.helper"
        @update="patchMarked('helper', $event)"
      />
    </OptionAccordion>

    <MiraiCmsTrueFalseField
      v-if="has(55)"
      :model-value="options.showSearch"
      :field-key="`${field.id}-show-search`"
      :field="{ type: 'true_false', label: 'Show Search Input' }"
      @update:model-value="patch({ showSearch: $event === true })"
    />
    <MiraiCmsTextField
      v-if="has(56) && options.showSearch"
      :model-value="options.searchPlaceholder"
      :field-key="`${field.id}-search-placeholder`"
      :field="{ type: 'text', label: 'Search Placeholder', maxLength: 200 }"
      @update:model-value="patch({ searchPlaceholder: String($event ?? '') })"
    />
    <MiraiCmsTrueFalseField
      v-if="has(57)"
      :model-value="options.searchClearable"
      :field-key="`${field.id}-search-clear`"
      :field="{ type: 'true_false', label: 'Search Clearable', instructions: 'By disabling this option, the field search clearable will be hidden.' }"
      @update:model-value="patch({ searchClearable: $event === true })"
    />
    <MiraiCmsTrueFalseField
      v-if="has(58)"
      :model-value="options.selectedClearable"
      :field-key="`${field.id}-selected-clear`"
      :field="{ type: 'true_false', label: 'Selected Option Clearable', instructions: 'By disabling this option, the field selected option clearable will be hidden.' }"
      @update:model-value="patch({ selectedClearable: $event === true })"
    />

    <MiraiCmsNumberField
      v-if="has(47)"
      :model-value="options.itemSize"
      :field-key="`${field.id}-item-size`"
      :field="{ type: 'number', label: 'Item Size', min: 1, step: 1 }"
      @update:model-value="patch({ itemSize: $event == null || !Number.isFinite($event) ? 200 : Math.max(1, Math.floor($event)) })"
    />

    <div
      v-if="has(48)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Check Position</span>
      <div :class="`${rootClass}__positions`">
        <MiraiCmsUiButton
          v-for="position in checkPositions"
          :key="position.id"
          tag="button"
          :variant="options.checkPosition === position.id ? ['icon'] : ['icon', 'secondary']"
          :active="options.checkPosition === position.id"
          :aria-label="position.id"
          :title="position.id"
          @click="patch({ checkPosition: position.id })"
        >
          <span v-html="position.svg" />
        </MiraiCmsUiButton>
      </div>
    </div>

    <MiraiCmsTrueFalseField
      v-if="has(49)"
      :model-value="options.hideImageLabel"
      :field-key="`${field.id}-hide-label`"
      :field="{ type: 'true_false', label: 'Hide Image Label' }"
      @update:model-value="patch({ hideImageLabel: $event === true })"
    />

    <MiraiCmsNumberField
      v-if="has(51)"
      :model-value="options.optionsColumn"
      :field-key="`${field.id}-columns`"
      :field="{ type: 'number', label: 'Options Column', min: 1, step: 1 }"
      @update:model-value="patch({ optionsColumn: $event == null || !Number.isFinite($event) ? 1 : Math.max(1, Math.floor($event)) })"
    />

    <div
      v-if="has(52)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Minimum</span>
      <MiraiCmsNumberField
        :model-value="options.choiceMinimum.value"
        :field-key="`${field.id}-bound-min`"
        :field="{ type: 'number', label: 'Minimum', min: 0, step: 1 }"
        @update:model-value="patch({ choiceMinimum: { ...options.choiceMinimum, value: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) } })"
      />
      <template v-if="(options.choiceMinimum.value ?? 0) > 0">
        <MiraiCmsTrueFalseField
          :model-value="options.choiceMinimum.showError"
          :field-key="`${field.id}-bound-min-show`"
          :field="{ type: 'true_false', label: 'Show Error Message' }"
          @update:model-value="patch({ choiceMinimum: { ...options.choiceMinimum, showError: $event === true } })"
        />
        <MiraiCmsTrueFalseField
          v-if="options.choiceMinimum.showError"
          :model-value="options.choiceMinimum.customError"
          :field-key="`${field.id}-bound-min-custom`"
          :field="{ type: 'true_false', label: 'Custom Error Message' }"
          @update:model-value="patch({ choiceMinimum: { ...options.choiceMinimum, customError: $event === true } })"
        />
        <DecoratedText
          v-if="options.choiceMinimum.showError && options.choiceMinimum.customError"
          :field-key="`${field.id}-bound-min-text`"
          :model="{ enabled: true, text: options.choiceMinimum.errorText, prefix: options.choiceMinimum.errorPrefix, suffix: options.choiceMinimum.errorSuffix }"
          @update="patch({ choiceMinimum: { ...options.choiceMinimum, errorText: $event.text, errorPrefix: $event.prefix, errorSuffix: $event.suffix } })"
        />
      </template>
    </div>

    <div
      v-if="has(53)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Maximum</span>
      <MiraiCmsNumberField
        :model-value="options.choiceMaximum.value"
        :field-key="`${field.id}-bound-max`"
        :field="{ type: 'number', label: 'Maximum', min: 0, step: 1 }"
        @update:model-value="patch({ choiceMaximum: { ...options.choiceMaximum, value: $event == null || !Number.isFinite($event) ? null : Math.max(0, Math.floor($event)) } })"
      />
      <template v-if="(options.choiceMaximum.value ?? 0) > 0">
        <MiraiCmsTrueFalseField
          :model-value="options.choiceMaximum.showError"
          :field-key="`${field.id}-bound-max-show`"
          :field="{ type: 'true_false', label: 'Show Error Message' }"
          @update:model-value="patch({ choiceMaximum: { ...options.choiceMaximum, showError: $event === true } })"
        />
        <MiraiCmsTrueFalseField
          v-if="options.choiceMaximum.showError"
          :model-value="options.choiceMaximum.customError"
          :field-key="`${field.id}-bound-max-custom`"
          :field="{ type: 'true_false', label: 'Custom Error Message' }"
          @update:model-value="patch({ choiceMaximum: { ...options.choiceMaximum, customError: $event === true } })"
        />
        <DecoratedText
          v-if="options.choiceMaximum.showError && options.choiceMaximum.customError"
          :field-key="`${field.id}-bound-max-text`"
          :model="{ enabled: true, text: options.choiceMaximum.errorText, prefix: options.choiceMaximum.errorPrefix, suffix: options.choiceMaximum.errorSuffix }"
          @update="patch({ choiceMaximum: { ...options.choiceMaximum, errorText: $event.text, errorPrefix: $event.prefix, errorSuffix: $event.suffix } })"
        />
      </template>
    </div>

    <MiraiCmsTextField
      v-if="has(38)"
      :model-value="options.fileSelectStatus"
      :field-key="`${field.id}-file-status`"
      :field="{ type: 'text', label: 'File Select Status', instructions: 'By enabling this feature, you will see file select status.', maxLength: 120 }"
      @update:model-value="patch({ fileSelectStatus: String($event ?? '') })"
    />

    <MiraiCmsTextField
      v-if="has(39)"
      :model-value="options.showMaximumSize"
      :field-key="`${field.id}-file-size-label`"
      :field="{ type: 'text', label: 'Show Maximum Size', placeholder: 'Write a Max Size Label Ex:(Max 2MB)', instructions: 'By disabling this option, the field show maximum size will be hidden.', maxLength: 120 }"
      @update:model-value="patch({ showMaximumSize: String($event ?? '') })"
    />

    <OptionAccordion
      v-if="has(40)"
      title="Allow Maximum Upload Size"
      :enabled="options.maxUpload.enabled"
      @update:enabled="patch({ maxUpload: { ...options.maxUpload, enabled: $event } })"
    >
      <MiraiCmsNumberField
        :model-value="options.maxUpload.size"
        :field-key="`${field.id}-upload-size`"
        :field="{ type: 'number', label: 'Size (MB)', min: 20, step: 1 }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, size: $event == null || !Number.isFinite($event) ? null : Math.max(20, $event) } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.maxUpload.total"
        :field-key="`${field.id}-upload-total`"
        :field="{ type: 'true_false', label: 'Total Maximum Size' }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, total: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.maxUpload.showError"
        :field-key="`${field.id}-upload-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, showError: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        v-if="options.maxUpload.showError"
        :model-value="options.maxUpload.customError"
        :field-key="`${field.id}-upload-custom`"
        :field="{ type: 'true_false', label: 'Custom Error Message' }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, customError: $event === true } })"
      />
      <MiraiCmsTextField
        v-if="options.maxUpload.showError && options.maxUpload.customError"
        :model-value="options.maxUpload.errorText"
        :field-key="`${field.id}-upload-error`"
        :field="{ type: 'text', label: 'Error message', maxLength: 400 }"
        @update:model-value="patch({ maxUpload: { ...options.maxUpload, errorText: String($event ?? '') } })"
      />
    </OptionAccordion>

    <div
      v-if="has(41)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Show File List</span>
      <MiraiCmsTrueFalseField
        :model-value="options.showFilePreview"
        :field-key="`${field.id}-file-preview`"
        :field="{ type: 'true_false', label: 'Show File Preview' }"
        @update:model-value="patch({ showFilePreview: $event === true })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.showFileSize"
        :field-key="`${field.id}-file-show-size`"
        :field="{ type: 'true_false', label: 'Show File Size' }"
        @update:model-value="patch({ showFileSize: $event === true })"
      />
    </div>

    <MiraiCmsTextField
      v-if="has(42)"
      :model-value="options.fileExistMessage"
      :field-key="`${field.id}-file-exists`"
      :field="{ type: 'text', label: 'File Exist Message', maxLength: 200 }"
      @update:model-value="patch({ fileExistMessage: String($event ?? '') })"
    />

    <div
      v-if="has(43)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Value Range (Min/Max)</span>
      <div :class="`${rootClass}__grid`">
        <div :class="`${rootClass}__native-field`">
          <span>Minimum</span>
          <input
            :class="`${rootClass}__native`"
            :type="temporalInputType(field.type)"
            :value="options.rangeMin"
            @input="patch({ rangeMin: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div :class="`${rootClass}__native-field`">
          <span>Maximum</span>
          <input
            :class="`${rootClass}__native`"
            :type="temporalInputType(field.type)"
            :value="options.rangeMax"
            @input="patch({ rangeMax: ($event.target as HTMLInputElement).value })"
          >
        </div>
      </div>
    </div>

    <OptionAccordion
      v-if="has(24)"
      title="Validations"
      plain
    >
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.digit"
        :field-key="`${field.id}-rule-digit`"
        :field="{ type: 'true_false', label: 'At least one digit (0-9)' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, digit: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.lowercase"
        :field-key="`${field.id}-rule-lower`"
        :field="{ type: 'true_false', label: 'At least one lowercase character (a-z)' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, lowercase: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.uppercase"
        :field-key="`${field.id}-rule-upper`"
        :field="{ type: 'true_false', label: 'At least one uppercase character (A-Z)' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, uppercase: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.special"
        :field-key="`${field.id}-rule-special`"
        :field="{ type: 'true_false', label: 'At least one special character (~!@#$%^&*(){}[]<>+-_=/|;:,.)' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, special: $event === true } })"
      />
      <MiraiCmsTrueFalseField
        :model-value="options.passwordRules.limitLength"
        :field-key="`${field.id}-rule-length`"
        :field="{ type: 'true_false', label: 'Limit Password Length' }"
        @update:model-value="patch({ passwordRules: { ...options.passwordRules, limitLength: $event === true } })"
      />
      <div
        v-if="options.passwordRules.limitLength"
        :class="`${rootClass}__grid`"
      >
        <MiraiCmsNumberField
          :model-value="options.passwordRules.min"
          :field-key="`${field.id}-pass-min`"
          :field="{ type: 'number', label: 'Min', min: 0, step: 1 }"
          @update:model-value="patch({ passwordRules: { ...options.passwordRules, min: $event == null ? 8 : Math.max(0, Math.floor($event)) } })"
        />
        <MiraiCmsNumberField
          :model-value="options.passwordRules.max"
          :field-key="`${field.id}-pass-max`"
          :field="{ type: 'number', label: 'Max', min: 0, step: 1 }"
          @update:model-value="patch({ passwordRules: { ...options.passwordRules, max: $event == null ? 32 : Math.max(0, Math.floor($event)) } })"
        />
      </div>
    </OptionAccordion>

    <div
      v-if="has(8)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Min/Max Text Length</span>
      <div :class="`${rootClass}__grid`">
        <MiraiCmsNumberField
          :model-value="options.minLength"
          :field-key="`${field.id}-min-length`"
          :field="{ type: 'number', label: 'Min Length', min: 0, step: 1 }"
          @update:model-value="setCount('minLength', $event)"
        />
        <MiraiCmsNumberField
          :model-value="options.maxLength"
          :field-key="`${field.id}-max-length`"
          :field="{ type: 'number', label: 'Max Length', min: 0, step: 1 }"
          @update:model-value="setCount('maxLength', $event)"
        />
        <MiraiCmsNumberField
          :model-value="options.minWords"
          :field-key="`${field.id}-min-words`"
          :field="{ type: 'number', label: 'Min Word', min: 0, step: 1 }"
          @update:model-value="setCount('minWords', $event)"
        />
        <MiraiCmsNumberField
          :model-value="options.maxWords"
          :field-key="`${field.id}-max-words`"
          :field="{ type: 'number', label: 'Max Word', min: 0, step: 1 }"
          @update:model-value="setCount('maxWords', $event)"
        />
      </div>
    </div>

    <div
      v-if="has(9)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Suggestion</span>
      <SuggestionRepeater
        :field-key="`${field.id}-suggestions`"
        :model="options.suggestions"
        @update="patch({ suggestions: $event })"
      />
    </div>

    <MiraiCmsSelectField
      v-if="has(10)"
      :model-value="options.autocomplete"
      :field-key="`${field.id}-autocomplete`"
      :field="{ type: 'select', label: 'Auto Complete', returnFormat: 'value', choices: AUTOCOMPLETE_CHOICES }"
      @update:model-value="patch({ autocomplete: String($event ?? 'off') })"
    />

    <MiraiCmsSelectField
      v-if="has(11)"
      :model-value="options.inputMode"
      :field-key="`${field.id}-input-mode`"
      :field="{ type: 'select', label: 'Input mode', returnFormat: 'value', choices: INPUT_MODE_CHOICES }"
      @update:model-value="patch({ inputMode: $event === 'none' || $event === 'decimal' || $event === 'numeric' || $event === 'tel' || $event === 'search' || $event === 'email' || $event === 'url' ? $event : 'text' })"
    />

    <MiraiCmsTextField
      v-if="has(12)"
      :model-value="options.mask"
      :field-key="`${field.id}-mask`"
      :field="{ type: 'text', label: 'Input Mask', placeholder: '(999) 999-9999', maxLength: 200 }"
      @update:model-value="patch({ mask: String($event ?? '') })"
    />

    <div
      v-if="has(13)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">RegEx Pattern</span>
      <MiraiCmsSelectField
        :model-value="patternPreset"
        :field-key="`${field.id}-pattern-preset`"
        :field="{
          type: 'select',
          label: 'Preset',
          returnFormat: 'value',
          choices: [
            { val: '', lbl: 'Custom' },
            ...PATTERN_PRESETS.map(preset => ({ val: preset.id, lbl: preset.label })),
          ],
        }"
        @update:model-value="setPatternPreset"
      />
      <MiraiCmsTextField
        :model-value="options.pattern"
        :field-key="`${field.id}-pattern`"
        :field="{ type: 'text', label: 'Expression', maxLength: 500 }"
        @update:model-value="patch({ pattern: String($event ?? '') })"
      />
      <MiraiCmsTextField
        :model-value="options.patternFlags"
        :field-key="`${field.id}-flags`"
        :field="{ type: 'text', label: 'Flags', placeholder: 'i', maxLength: 12 }"
        @update:model-value="patch({ patternFlags: String($event ?? '').replace(/[^gimsuy]/g, '') })"
      />
    </div>

    <MiraiCmsTrueFalseField
      v-if="has(14)"
      :model-value="options.readOnly"
      :field-key="`${field.id}-readonly`"
      :field="{ type: 'true_false', label: 'Read-only' }"
      @update:model-value="patch({ readOnly: $event === true })"
    />

    <MiraiCmsTrueFalseField
      v-if="has(15)"
      :model-value="options.hidden"
      :field-key="`${field.id}-hidden`"
      :field="{ type: 'true_false', label: 'Hidden' }"
      @update:model-value="patch({ hidden: $event === true })"
    />

    <div
      v-if="has(16)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Size & Position</span>
      <div :class="`${rootClass}__grid`">
        <MiraiCmsNumberField
          :model-value="item.x"
          :field-key="`${field.id}-x`"
          :field="{ type: 'number', label: 'X', min: 0, max: GRID_COLUMNS - 1, step: 1 }"
          @update:model-value="setAxis"
        />
        <MiraiCmsNumberField
          :model-value="item.w"
          :field-key="`${field.id}-w`"
          :field="{ type: 'number', label: 'W', min: 1, max: GRID_COLUMNS, step: 1 }"
          @update:model-value="setWidth"
        />
      </div>
    </div>

    <MiraiCmsNumberField
      v-if="field.type === 'spacer'"
      :model-value="item.h ?? options.spacerHeight ?? 40"
      :field-key="`${field.id}-spacer-height-${item.fieldId}`"
      :field="{ type: 'number', label: 'Height', min: 0, step: 1 }"
      @update:model-value="setHeight"
    />

    <MiraiCmsTrueFalseField
      v-if="has(17)"
      :model-value="options.disabled"
      :field-key="`${field.id}-disabled`"
      :field="{ type: 'true_false', label: 'Disabled' }"
      @update:model-value="patch({ disabled: $event === true })"
    />

    <MiraiCmsTextField
      v-if="has(18)"
      :model-value="field.key"
      :field-key="`${field.id}-name`"
      :field="{
        type: 'text',
        label: 'Name Attribute',
        instructions: 'Name is the unique identifier for the field. It is used to reference the field in the form submission data.',
        maxLength: 64,
      }"
      @update:model-value="emit('update', { ...field, key: String($event ?? '') })"
    />

    <OptionAccordion
      v-if="has(19) || has(23)"
      :title="has(23) ? 'Enable confirm password field' : 'Enable confirm email field'"
      :enabled="options.confirm.enabled"
      @update:enabled="patch({ confirm: { ...options.confirm, enabled: $event } })"
    >
      <OptionAccordion
        title="Label"
        :enabled="options.confirm.label.enabled"
        @update:enabled="patch({ confirm: { ...options.confirm, label: { ...options.confirm.label, enabled: $event } } })"
      >
        <DecoratedText
          :field-key="`${field.id}-confirm-label`"
          :model="options.confirm.label"
          @update="patch({ confirm: { ...options.confirm, label: $event } })"
        />
      </OptionAccordion>
      <MiraiCmsTextField
        :model-value="options.confirm.placeholder"
        :field-key="`${field.id}-confirm-placeholder`"
        :field="{ type: 'text', label: 'Placeholder', maxLength: 200 }"
        @update:model-value="patch({ confirm: { ...options.confirm, placeholder: String($event ?? '') } })"
      />
      <OptionAccordion
        title="Helper Text"
        :enabled="options.confirm.helper.enabled"
        @update:enabled="patch({ confirm: { ...options.confirm, helper: { ...options.confirm.helper, enabled: $event } } })"
      >
        <DecoratedText
          :field-key="`${field.id}-confirm-helper`"
          :model="options.confirm.helper"
          @update="patch({ confirm: { ...options.confirm, helper: $event } })"
        />
      </OptionAccordion>
      <MiraiCmsSelectField
        :model-value="options.confirm.placement"
        :field-key="`${field.id}-confirm-placement`"
        :field="{
          type: 'select',
          label: 'Fields placement',
          returnFormat: 'value',
          choices: [
            { val: 'below', lbl: 'Below' },
            { val: 'inline', lbl: 'Inline' },
          ],
        }"
        @update:model-value="patch({ confirm: { ...options.confirm, placement: $event === 'inline' ? 'inline' : 'below' } })"
      />
    </OptionAccordion>

    <OptionAccordion
      v-if="has(20)"
      title="Invalid Error Message"
      :enabled="options.invalid.enabled"
      @update:enabled="patch({ invalid: { ...options.invalid, enabled: $event } })"
    >
      <MiraiCmsTrueFalseField
        :model-value="options.invalid.showError"
        :field-key="`${field.id}-invalid-show`"
        :field="{ type: 'true_false', label: 'Show Error Message' }"
        @update:model-value="patch({ invalid: { ...options.invalid, showError: $event === true } })"
      />
      <template v-if="options.invalid.showError">
        <MiraiCmsTrueFalseField
          :model-value="options.invalid.customError"
          :field-key="`${field.id}-invalid-custom`"
          :field="{ type: 'true_false', label: 'Custom Error Message' }"
          @update:model-value="patch({ invalid: { ...options.invalid, customError: $event === true } })"
        />
        <DecoratedText
          v-if="options.invalid.customError"
          :field-key="`${field.id}-invalid-text`"
          :model="{ enabled: true, text: options.invalid.errorText, prefix: options.invalid.errorPrefix, suffix: options.invalid.errorSuffix }"
          text-label="Error message"
          @update="patch({ invalid: { ...options.invalid, errorText: $event.text, errorPrefix: $event.prefix, errorSuffix: $event.suffix } })"
        />
      </template>
    </OptionAccordion>

    <div
      v-if="has(21)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Value Range (Min/Max)</span>
      <div :class="`${rootClass}__grid`">
        <MiraiCmsNumberField
          :model-value="options.valueMin"
          :field-key="`${field.id}-value-min`"
          :field="{ type: 'number', label: 'Minimum', step: 1 }"
          @update:model-value="patch({ valueMin: $event == null || !Number.isFinite($event) ? null : $event })"
        />
        <MiraiCmsNumberField
          :model-value="options.valueMax"
          :field-key="`${field.id}-value-max`"
          :field="{ type: 'number', label: 'Maximum', step: 1 }"
          @update:model-value="patch({ valueMax: $event == null || !Number.isFinite($event) ? null : $event })"
        />
      </div>
    </div>

    <MiraiCmsTrueFalseField
      v-if="has(22)"
      :model-value="options.showPassword"
      :field-key="`${field.id}-show-password`"
      :field="{ type: 'true_false', label: 'Include show/hide password icon', instructions: 'This allows to show the password icon. You can toggle this option to show or hide the password icon.' }"
      @update:model-value="patch({ showPassword: $event === true })"
    />

    <MiraiCmsNumberField
      v-if="has(25)"
      :model-value="options.step"
      :field-key="`${field.id}-step`"
      :field="{ type: 'number', label: 'Step', step: 1 }"
      @update:model-value="patch({ step: $event == null || !Number.isFinite($event) ? null : $event })"
    />

    <div
      v-if="has(26)"
      :class="`${rootClass}__group`"
    >
      <MiraiCmsImageField
        :model-value="options.ratingIcon"
        :field-key="`${field.id}-rating-icon`"
        :field="{ type: 'image', label: 'Rating Icon', iconMode: true, returnFormat: 'array' }"
        @update:model-value="patch({ ratingIcon: normalizeIcon($event) })"
      />
    </div>

    <div
      v-if="has(27)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Options</span>
      <RatingOptions
        :field-key="`${field.id}-rating-options`"
        :model="options.ratingOptions"
        @update="patch({ ratingOptions: $event, defaultValue: $event.find(item => item.checked)?.value || options.defaultValue })"
      />
    </div>

    <MiraiCmsSelectField
      v-if="has(28)"
      :model-value="options.ratingPosition"
      :field-key="`${field.id}-rating-position`"
      :field="{
        type: 'select',
        label: 'Rating Position',
        returnFormat: 'value',
        choices: [
          { val: 'left', lbl: 'Left' },
          { val: 'center', lbl: 'Center' },
          { val: 'right', lbl: 'Right' },
        ],
      }"
      @update:model-value="patch({ ratingPosition: $event === 'center' || $event === 'right' ? $event : 'left' })"
    />

    <MiraiCmsTrueFalseField
      v-if="has(29)"
      :model-value="options.ratingHoverMessage"
      :field-key="`${field.id}-rating-hover`"
      :field="{ type: 'true_false', label: 'Show rating message on hover', instructions: 'This allows to show the rating message on hover. You can toggle this option to show or hide the rating message on hover.' }"
      @update:model-value="patch({ ratingHoverMessage: $event === true })"
    />

    <MiraiCmsTrueFalseField
      v-if="has(30)"
      :model-value="options.ratingSelectedMessage"
      :field-key="`${field.id}-rating-selected`"
      :field="{ type: 'true_false', label: 'Show Rating Message On Selected', instructions: 'This allows to show the rating message on rating selected. You can toggle this option to show or hide the rating message on rating selected.' }"
      @update:model-value="patch({ ratingSelectedMessage: $event === true })"
    />

    <div
      v-if="has(31)"
      :class="`${rootClass}__group`"
    >
      <span :class="`${rootClass}__heading`">Button Text</span>
      <DecoratedText
        :field-key="`${field.id}-button-text`"
        :model="options.buttonText"
        text-label="Text"
        @update="patch({ buttonText: { ...$event, enabled: true } })"
      />
    </div>

    <MiraiCmsSelectField
      v-if="has(32)"
      :model-value="options.buttonType"
      :field-key="`${field.id}-button-type`"
      :field="{
        type: 'select',
        label: 'Button Type',
        returnFormat: 'value',
        choices: [
          { val: 'submit', lbl: 'Submit', disabled: submitTaken && options.buttonType !== 'submit' },
          { val: 'button', lbl: 'Button' },
          { val: 'reset', lbl: 'Reset' },
        ],
      }"
      @update:model-value="setButtonType"
    />

    <MiraiCmsTrueFalseField
      v-if="has(33)"
      :model-value="options.fullWidth"
      :field-key="`${field.id}-full-width`"
      :field="{ type: 'true_false', label: 'Full Width' }"
      @update:model-value="patch({ fullWidth: $event === true })"
    />

    <MiraiCmsSelectField
      v-if="has(34) && !options.fullWidth"
      :model-value="options.buttonAlign"
      :field-key="`${field.id}-button-align`"
      :field="{
        type: 'select',
        label: 'Button Align',
        returnFormat: 'value',
        choices: [
          { val: 'left', lbl: 'Left' },
          { val: 'center', lbl: 'Center' },
          { val: 'right', lbl: 'Right' },
        ],
      }"
      @update:model-value="patch({ buttonAlign: $event === 'center' || $event === 'right' ? $event : 'left' })"
    />
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;
$root: '.miraicms-text-settings';


#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(12);

  &__group,
  &__icons {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
  }

  &__group {

    &--popup {
      padding: math-rem(12) math-rem(8);
      background-color: $color-bg;
      border-radius: $border-radius;
    }

    &-header {
      display: flex;
      gap: math-rem(8);
      align-items: flex-end;

      :deep(.miraicms-field) {
        flex-basis: 0;
        flex-grow: 1;
        max-width: 100%;
      }
    }

    &-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: math-rem(24);
      height: math-rem(62);
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

    &-placeholder {
      box-sizing: border-box;
      border: 1px dashed $color-border;
      border-radius: $border-radius;
      background: $color-bg;
    }
  }

  &__choice {
    &-block {
      &.is-floating {
        z-index: 1100;
        box-shadow: $shadow-md;
      }
    }
  }

  &__heading {
    font-size: math-rem(13);
    font-weight: 600;
  }
  &__grid {
    display: grid;
    gap: math-rem(8);

  }

  &__icon {
    &-row {
      display: grid;
      gap: math-rem(8);

      grid-template-columns: repeat(2, minmax(0, 1fr));

      :deep(.miraicms-field) {
        width: 100%;
        min-width: 0;
      }
    }
  }

  &__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &__positions {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(6);
  }

  &__native {
    &-field {
      display: flex;
      flex-direction: column;
      gap: math-rem(4);
      font-size: math-rem(13);
    }

    width: 100%;
    min-height: math-rem(36);
    padding: math-rem(6) math-rem(8);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
    color: $color-ink;
    font: inherit;
  }
}
</style>
