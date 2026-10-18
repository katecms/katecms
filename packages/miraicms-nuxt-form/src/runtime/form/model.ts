import type { FormTextOptions } from './text-options.ts'
import { customErrorText, defaultChoiceOptions, defaultTextOptions, fileAccept, invalidErrorText, isRichFieldType, isTemporalType, listedChoiceOptions, normalizeTextOptions, passwordRuleStates, textConstraintError } from './text-options.ts'

export const GRID_COLUMNS = 60
export const ROW_HEIGHT = 72
export const MAX_FIELDS = 200
export const MAX_STEPS = 20
export const MAX_TEXT = 20000

const DEFAULT_BREAKPOINT_NAMES = ['phone', 'tablet', 'desktop'] as const

let activeBreakpoints: string[] = [...DEFAULT_BREAKPOINT_NAMES]

/** Layout keys currently in use. Defaults match `miraicms.form.breakpoints`. */
export function formBreakpoints(): readonly string[] {
  return activeBreakpoints
}

/** Replace the layout keys used when creating and normalising forms. */
export function setFormBreakpoints(names: readonly string[]) {
  const next = [...new Set(names.map(name => name.trim().toLowerCase()).filter(name => /^[a-z][a-z0-9-]{0,31}$/.test(name)))]
  activeBreakpoints = next.length ? next : [...DEFAULT_BREAKPOINT_NAMES]
}

/** Breakpoint that keeps partial column widths and unsuffixed data-x/y/w attributes. */
export function baseBreakpoint(): string {
  const names = formBreakpoints()
  if (names.includes('desktop')) {
    return 'desktop'
  }
  return names[names.length - 1] ?? 'desktop'
}

export type Breakpoint = string

export const FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'phone',
  'number',
  'password',
  'range',
  'url',
  'color',
  'rating',
  'select',
  'image_select',
  'radio',
  'checkbox',
  'title',
  'image',
  'divider',
  'spacer',
  'date',
  'time',
  'datetime',
  'week',
  'month',
  'file',
  'hidden',
  'html',
  'button',
  'repeater',
] as const
export type FieldType = typeof FIELD_TYPES[number]

export const FIELD_LABELS: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Multiline Text',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  password: 'Password',
  range: 'Slider',
  url: 'URL',
  color: 'Color Picker',
  rating: 'Rating',
  select: 'Select',
  image_select: 'Image Select',
  radio: 'Radio Button',
  checkbox: 'Check Box',
  title: 'Title',
  image: 'Image',
  divider: 'Divider',
  spacer: 'Spacer',
  date: 'Date',
  time: 'Time',
  datetime: 'Date-Time',
  week: 'Week',
  month: 'Month',
  file: 'File Upload',
  hidden: 'Hidden',
  html: 'HTML',
  button: 'Button',
  repeater: 'Repeater',
}

export interface FormFieldOption {
  label: string
  value: string
}

export interface FormStepHeader {
  show: boolean
  showLabel: boolean
  showSubtitle: boolean
  showIcon: boolean
}

export interface FormStep {
  id: string
  label: string
  subtitle: string
  icon: string
  labelPrefix: string
  labelSuffix: string
  subtitlePrefix: string
  subtitleSuffix: string
}

export interface FormField {
  id: string
  type: FieldType
  stepId: string
  key: string
  label: string
  placeholder: string
  help: string
  required: boolean
  options: FormFieldOption[]
  html: string
  value: string
  buttonLabel: string
  accept: string
  rows: number
  min: string
  max: string
  step: string
  text?: FormTextOptions
  /** Extra classes for the public field container. Not applied in the builder. */
  containerClass?: string
  /** Set when this field lives inside a repeater. */
  parentId?: string
  /** The button created with the form. It cannot be deleted or cloned. */
  locked?: boolean
}

export interface LayoutItem {
  fieldId: string
  x: number
  y: number
  w: number
  h?: number
}

export const EMPTY_SUBMIT_MESSAGE = 'Empty form cannot be submitted.'

export interface FormNotification {
  to: string
  fromMail: string
  fromName: string
  cc: string
  bcc: string
  replyTo: string
}

export interface FormConfirmation {
  successMessage: string
  redirectPage: string
}

export const FORM_CONDITION_LOGICS = [
  'equal',
  'not_equal',
  'null',
  'not_null',
  'contain',
  'not_contain',
  'contain_all',
  'greater',
  'less',
  'greater_or_equal',
  'less_or_equal',
  'start_with',
  'end_with',
  'between',
] as const

export type FormConditionLogic = typeof FORM_CONDITION_LOGICS[number]

export const FORM_CONDITION_ACTIONS = [
  'show',
  'hide',
  'enable',
  'disable',
  'readonly',
  'writable',
  'required',
] as const

export type FormConditionAction = typeof FORM_CONDITION_ACTIONS[number]

export interface FormConditionRule {
  id: string
  /** Field this rule tests. Missing means the branch field. */
  fieldId?: string
  logic: FormConditionLogic
  value: string
}

export interface FormConditionGroup {
  id: string
  /** `all` is And. `any` is Or. */
  match: 'all' | 'any'
  rules: FormConditionRule[]
}

export interface FormConditionBranch {
  id: string
  kind: 'if' | 'else_if' | 'else'
  /** Empty on an else branch. */
  fieldId: string
  /** Empty on an else branch. Groups are combined with And. */
  groups: FormConditionGroup[]
  action: FormConditionAction
  targetFieldIds: string[]
}

export interface FormCondition {
  id: string
  enabled: boolean
  title: string
  branches: FormConditionBranch[]
}

export interface FormFieldConditionState {
  hidden: boolean
  disabled: boolean
  readonly: boolean
  required: boolean
}

export interface FormContent {
  steps: FormStep[]
  stepHeader: FormStepHeader
  fields: FormField[]
  layouts: Record<Breakpoint, LayoutItem[]>
  conditions: FormCondition[]
  /** When set, every breakpoint layout follows the active breakpoint’s field order. */
  syncFieldOrder?: boolean
  /** Validate a field when the visitor leaves it. Missing means enabled. */
  validateOnBlur?: boolean
  /** Block a submission that has no visitor-entered values. Missing means enabled. */
  preventEmptySubmit?: boolean
  /** Shown when an empty submission is blocked. */
  emptySubmitMessage?: string
  notification: FormNotification
  confirmation: FormConfirmation
}

export interface FormRecord {
  id: number
  name: string
  content: FormContent
  createdAt: string
  updatedAt: string
}

export interface FormListItem {
  id: number
  name: string
  fieldCount: number
  updatedAt: string
}

export interface PublicForm {
  id: number
  name: string
  maxFileBytes: number
  content: FormContent
}

export interface MailSettings {
  host: string
  port: number
  encryption: 'none' | 'starttls' | 'ssl'
  username: string
  fromEmail: string
  fromName: string
  passwordSet: boolean
}

const CHOICE_TYPES = new Set<FieldType>(['select', 'radio', 'checkbox', 'image_select'])
const KEY_PATTERN = /^[\p{L}_][\p{L}\p{N}_-]{0,63}$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+().\-\s]{3,40}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && (FIELD_TYPES as readonly string[]).includes(value)
}

export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'form'
}

export function clampItem(item: LayoutItem): LayoutItem {
  const w = clampInt(item.w, 1, GRID_COLUMNS)
  const x = clampInt(item.x, 0, GRID_COLUMNS - w)
  const y = clampInt(item.y, 0, 400)
  const next: LayoutItem = { fieldId: item.fieldId, x, y, w }
  if (item.h != null && Number.isFinite(item.h)) {
    next.h = Math.max(0, Math.round(item.h))
  }
  return next
}

export function overlaps(a: LayoutItem, b: LayoutItem): boolean {
  if (a.fieldId === b.fieldId || a.y !== b.y) {
    return false
  }
  return a.x < b.x + b.w && b.x < a.x + a.w
}

export function resolveLayout(items: LayoutItem[], preferredId?: string): LayoutItem[] {
  const next = items.map(clampItem)
  const limit = next.length * 80 + 20
  for (let spin = 0; spin < limit; spin++) {
    let found = false
    for (let i = 0; i < next.length; i++) {
      for (let j = i + 1; j < next.length; j++) {
        const left = next[i]
        const right = next[j]
        if (!left || !right || !overlaps(left, right)) {
          continue
        }
        found = true
        const move = indexToMove(next, i, j, preferredId)
        const current = next[move]
        if (current) {
          next[move] = { ...current, y: current.y + 1 }
        }
        break
      }
      if (found) {
        break
      }
    }
    if (!found) {
      return next.map(clampItem)
    }
  }
  return next.map(clampItem)
}

export function placeField(layout: LayoutItem[], fieldId: string, width: number): LayoutItem[] {
  const w = clampInt(width, 1, GRID_COLUMNS)
  for (let y = 0; y < 400; y++) {
    for (let x = 0; x <= GRID_COLUMNS - w; x++) {
      const candidate = { fieldId, x, y, w }
      if (!layout.some(item => overlaps(candidate, item))) {
        return [...layout, candidate]
      }
    }
  }
  return [...layout, { fieldId, x: 0, y: layout.length, w }]
}

function placeAtEnd(layout: LayoutItem[], fieldId: string, width: number): LayoutItem[] {
  const w = clampInt(width, 1, GRID_COLUMNS)
  const last = readingOrder(layout).at(-1)
  if (!last) {
    return [{ fieldId, x: 0, y: 0, w }]
  }
  const besideX = last.x + last.w
  if (besideX + w <= GRID_COLUMNS) {
    const beside = { fieldId, x: besideX, y: last.y, w }
    if (!layout.some(item => overlaps(beside, item))) {
      return [...layout, beside]
    }
  }
  return [...layout, { fieldId, x: 0, y: last.y + 1, w }]
}

/** Puts `fieldId` immediately before `anchor` in reading order. */
function placeBeforeItem(layout: LayoutItem[], anchor: LayoutItem | undefined, fieldId: string, width: number): LayoutItem[] {
  const w = clampInt(width, 1, GRID_COLUMNS)
  if (anchor && layout.length === 1) {
    return [
      { fieldId, x: 0, y: anchor.y, w },
      { ...anchor, y: anchor.y + 1 },
    ]
  }
  if (!anchor) {
    return placeAtEnd(layout, fieldId, w)
  }
  const gapStart = layout
    .filter(item => item.y === anchor.y && item.x + item.w <= anchor.x)
    .reduce((end, item) => Math.max(end, item.x + item.w), 0)
  if (anchor.x - gapStart >= w) {
    return [...layout, { fieldId, x: anchor.x - w, y: anchor.y, w }]
  }
  const shifted = layout.map(item => item.fieldId === anchor.fieldId || item.y > anchor.y
    ? { ...item, y: item.y + 1 }
    : item)
  if (GRID_COLUMNS - gapStart >= w) {
    return [...shifted, { fieldId, x: gapStart, y: anchor.y, w }]
  }
  const moved = shifted.find(item => item.fieldId === anchor.fieldId)
  const again = shifted.map(item => item.fieldId === anchor.fieldId || (moved && item.y > moved.y)
    ? { ...item, y: item.y + 1 }
    : item)
  return [...again, { fieldId, x: 0, y: moved?.y ?? anchor.y + 1, w }]
}

function placeAfter(layout: LayoutItem[], source: LayoutItem | undefined, fieldId: string, width: number): LayoutItem[] {
  const w = clampInt(width, 1, GRID_COLUMNS)
  if (!source) {
    return placeField(layout, fieldId, w)
  }
  const besideX = source.x + source.w
  if (besideX + w <= GRID_COLUMNS) {
    const beside = { fieldId, x: besideX, y: source.y, w }
    if (!layout.some(item => overlaps(beside, item))) {
      return [...layout, beside]
    }
  }
  const shifted = layout.map(item => item.y > source.y ? { ...item, y: item.y + 1 } : item)
  const x = source.x + w <= GRID_COLUMNS ? source.x : 0
  return [...shifted, { fieldId, x, y: source.y + 1, w }]
}

export function defaultWidth(type: FieldType, breakpoint: Breakpoint): number {
  if (breakpoint === baseBreakpoint() && type === 'button') {
    return 15
  }
  return GRID_COLUMNS
}

export function createEmptyContent(): FormContent {
  const layouts = {} as FormContent['layouts']
  for (const name of formBreakpoints()) {
    layouts[name] = []
  }
  return addField({
    steps: [createStep(1)],
    stepHeader: defaultStepHeader(),
    fields: [],
    layouts,
    validateOnBlur: true,
    preventEmptySubmit: true,
    emptySubmitMessage: EMPTY_SUBMIT_MESSAGE,
    notification: defaultNotification(),
    confirmation: defaultConfirmation(),
    conditions: [],
  }, 'button')
}

export function addStep(content: FormContent): FormContent {
  const steps = content.steps.length ? content.steps : [createStep(1)]
  if (steps.length >= MAX_STEPS) {
    return { ...content, steps }
  }
  return {
    ...content,
    steps: [...steps, createStep(steps.length + 1)],
  }
}

const AUTO_STEP_LABEL = /^Step \d+$/

function renumberAutoStepLabels(steps: FormStep[]): FormStep[] {
  return steps.map((step, index) => (
    AUTO_STEP_LABEL.test(step.label) ? { ...step, label: `Step ${index + 1}` } : step
  ))
}

export function reorderSteps(content: FormContent, from: number, insertAt: number): FormContent {
  const length = content.steps.length
  if (
    from < 0 || from >= length
    || insertAt < 0 || insertAt > length
    || insertAt === from || insertAt === from + 1
  ) {
    return content
  }
  const steps = [...content.steps]
  const [moved] = steps.splice(from, 1)
  if (!moved) {
    return content
  }
  const target = from < insertAt ? insertAt - 1 : insertAt
  steps.splice(target, 0, moved)
  return {
    ...content,
    steps: renumberAutoStepLabels(steps),
  }
}

export function cloneStep(content: FormContent, stepId: string): FormContent {
  const index = content.steps.findIndex(step => step.id === stepId)
  const source = index < 0 ? undefined : content.steps[index]
  const sourceFields = content.fields.filter(field => field.stepId === stepId)
  if (!source || content.steps.length >= MAX_STEPS || content.fields.length + sourceFields.length > MAX_FIELDS) {
    return content
  }
  const nextStep: FormStep = {
    ...source,
    id: `s_${crypto.randomUUID()}`,
  }
  const existing = [...content.fields]
  const idMap = new Map<string, string>()
  const clonedFields = sourceFields.map((field) => {
    const id = `f_${crypto.randomUUID()}`
    idMap.set(field.id, id)
    const copy: FormField = JSON.parse(JSON.stringify(field)) as FormField
    copy.id = id
    copy.stepId = nextStep.id
    copy.key = uniqueKey(field.type, existing)
    copy.locked = undefined
    if (copy.type === 'button' && copy.text?.buttonType === 'submit' && copy.text) {
      copy.text = { ...copy.text, buttonType: 'button' }
    }
    copy.options = field.options.map(option => ({ ...option }))
    existing.push(copy)
    return copy
  })
  const layouts = { ...content.layouts }
  for (const breakpoint of formBreakpoints()) {
    const copies = (content.layouts[breakpoint] ?? []).flatMap((item) => {
      const fieldId = idMap.get(item.fieldId)
      return fieldId ? [{ ...item, fieldId }] : []
    })
    layouts[breakpoint] = [...(content.layouts[breakpoint] ?? []), ...copies]
  }
  const steps = [...content.steps]
  steps.splice(index + 1, 0, nextStep)
  return {
    ...content,
    steps: renumberAutoStepLabels(steps),
    fields: [...content.fields, ...clonedFields],
    layouts,
  }
}

export function deleteStep(content: FormContent, stepId: string): FormContent {
  if (content.steps.length < 2 || !content.steps.some(step => step.id === stepId)) {
    return content
  }
  if (content.fields.some(field => field.stepId === stepId && field.locked)) {
    return content
  }
  const removeIds = new Set(content.fields.filter(field => field.stepId === stepId).map(field => field.id))
  const layouts = { ...content.layouts }
  for (const breakpoint of formBreakpoints()) {
    layouts[breakpoint] = (content.layouts[breakpoint] ?? []).filter(item => !removeIds.has(item.fieldId))
  }
  return {
    ...content,
    steps: renumberAutoStepLabels(content.steps.filter(step => step.id !== stepId)),
    fields: content.fields.filter(field => field.stepId !== stepId),
    layouts,
  }
}

export function updateStep(content: FormContent, stepId: string, partial: Partial<FormStep>): FormContent {
  return {
    ...content,
    steps: content.steps.map(step => step.id === stepId ? { ...step, ...partial, id: step.id } : step),
  }
}

export function updateStepHeader(content: FormContent, partial: Partial<FormStepHeader>): FormContent {
  return {
    ...content,
    stepHeader: { ...content.stepHeader, ...partial },
  }
}

export function addField(content: FormContent, type: FieldType, stepId?: string): FormContent {
  const steps = content.steps.length ? content.steps : [createStep(1)]
  const target = stepId && steps.some(step => step.id === stepId) ? stepId : steps[0]!.id
  if (content.fields.length >= MAX_FIELDS) {
    return { ...content, steps }
  }
  const field = createField(type, content.fields, target)
  const submit = content.fields.find(item => item.stepId === target && isSubmitButton(item))
  const fields = submit ? insertBefore(content.fields, submit.id, field) : [...content.fields, field]
  const layouts = { ...content.layouts }
  for (const breakpoint of formBreakpoints()) {
    const current = content.layouts[breakpoint] ?? []
    const sameStep = current.filter(item => topLevelOnStep(content, item.fieldId, target))
    const otherSteps = current.filter(item => !topLevelOnStep(content, item.fieldId, target))
    const anchor = submit ? sameStep.find(item => item.fieldId === submit.id) : undefined
    const width = field.locked ? GRID_COLUMNS : defaultWidth(type, breakpoint)
    layouts[breakpoint] = [...otherSteps, ...readingOrder(placeBeforeItem(sameStep, anchor, field.id, width))]
  }
  return { ...content, steps, fields, layouts }
}

export function cloneField(content: FormContent, fieldId: string): FormContent {
  const source = content.fields.find(field => field.id === fieldId)
  if (!source || source.locked || content.fields.length >= MAX_FIELDS) {
    return content
  }
  const copy = clonedField(source, content.fields)
  const index = content.fields.findIndex(field => field.id === fieldId)
  let fields = [
    ...content.fields.slice(0, index + 1),
    copy,
    ...content.fields.slice(index + 1),
  ]
  const copiedChildren: { from: string, to: string }[] = []
  if (source.type === 'repeater') {
    for (const child of content.fields.filter(field => field.parentId === source.id)) {
      if (fields.length >= MAX_FIELDS) {
        break
      }
      const childCopy = clonedField(child, fields)
      childCopy.parentId = copy.id
      copiedChildren.push({ from: child.id, to: childCopy.id })
      const childIndex = fields.findIndex(field => field.id === copy.id)
      fields = [
        ...fields.slice(0, childIndex + 1),
        childCopy,
        ...fields.slice(childIndex + 1),
      ]
    }
  }
  const layouts = { ...content.layouts }
  for (const breakpoint of formBreakpoints()) {
    const current = content.layouts[breakpoint] ?? []
    const sourceItem = current.find(item => item.fieldId === fieldId)
    const width = sourceItem?.w ?? defaultWidth(source.type, breakpoint)
    const grouped = { ...content, fields }
    const sameGroup = current.filter(item => sameLayoutGroup(grouped, fieldId, item.fieldId))
    const otherGroups = current.filter(item => !sameLayoutGroup(grouped, fieldId, item.fieldId))
    const placed = placeAfter(sameGroup, sourceItem, copy.id, width)
    for (const child of copiedChildren) {
      const childItem = current.find(item => item.fieldId === child.from)
      if (childItem) {
        placed.push({ ...childItem, fieldId: child.to })
      }
    }
    layouts[breakpoint] = [...otherGroups, ...placed]
  }
  return { ...content, fields, layouts }
}

function clonedField(source: FormField, existing: FormField[]): FormField {
  const copy = JSON.parse(JSON.stringify(source)) as FormField
  copy.id = `f_${crypto.randomUUID()}`
  copy.locked = undefined
  copy.key = uniqueKey(source.type, existing)
  if (copy.type === 'button' && copy.text?.buttonType === 'submit' && copy.text) {
    copy.text = { ...copy.text, buttonType: 'button' }
  }
  return copy
}

export function moveFieldToStep(content: FormContent, fieldId: string, stepId: string): FormContent {
  const source = content.fields.find(field => field.id === fieldId)
  if (!source || !content.steps.some(step => step.id === stepId)) {
    return content
  }
  if (source.stepId === stepId && !source.parentId) {
    return content
  }
  const fields = content.fields.map(field => {
    if (field.id === fieldId) {
      return { ...field, stepId, parentId: undefined }
    }
    if (field.parentId === fieldId) {
      return { ...field, stepId }
    }
    return field
  })
  let next: FormContent = { ...content, fields }
  for (const breakpoint of formBreakpoints()) {
    const current = (next.layouts[breakpoint] ?? []).filter(item => item.fieldId !== fieldId)
    const anchorId = next.fields.find(field => field.stepId === stepId && isSubmitButton(field) && !field.parentId)?.id
    const sameStep = current.filter(item => topLevelOnStep(next, item.fieldId, stepId))
    const otherSteps = current.filter(item => !topLevelOnStep(next, item.fieldId, stepId))
    const anchor = anchorId ? sameStep.find(item => item.fieldId === anchorId) : undefined
    next = {
      ...next,
      layouts: {
        ...next.layouts,
        [breakpoint]: [...otherSteps, ...readingOrder(placeBeforeItem(sameStep, anchor, fieldId, defaultWidth(source.type, breakpoint)))],
      },
    }
  }
  return next
}

export function moveFieldToRepeater(content: FormContent, fieldId: string, repeaterId: string): FormContent {
  const source = content.fields.find(field => field.id === fieldId)
  const repeater = content.fields.find(field => field.id === repeaterId && field.type === 'repeater')
  if (!source || !repeater || source.id === repeater.id || source.parentId === repeater.id) {
    return content
  }
  if (source.locked || source.type === 'repeater' || isSubmitButton(source)) {
    return content
  }
  const fields = content.fields.map(field => field.id === fieldId ? { ...field, parentId: repeater.id, stepId: repeater.stepId } : field)
  let next: FormContent = { ...content, fields }
  for (const breakpoint of formBreakpoints()) {
    const current = next.layouts[breakpoint] ?? []
    const previous = current.find(item => item.fieldId === fieldId)
    const without = current.filter(item => item.fieldId !== fieldId)
    const siblings = without.filter(item => next.fields.find(field => field.id === item.fieldId)?.parentId === repeater.id)
    const rest = without.filter(item => next.fields.find(field => field.id === item.fieldId)?.parentId !== repeater.id)
    next = {
      ...next,
      layouts: {
        ...next.layouts,
        [breakpoint]: [...rest, ...placeAtEnd(siblings, fieldId, previous?.w ?? defaultWidth(source.type, breakpoint))],
      },
    }
  }
  return next
}

function topLevelOnStep(content: FormContent, fieldId: string, stepId: string): boolean {
  const field = content.fields.find(item => item.id === fieldId)
  return !!field && !field.parentId && field.stepId === stepId
}

export function removeField(content: FormContent, fieldId: string): FormContent {
  if (content.fields.some(field => field.id === fieldId && field.locked)) {
    return content
  }
  const source = content.fields.find(field => field.id === fieldId)
  let next = content
  if (source?.type === 'repeater') {
    for (const child of content.fields.filter(field => field.parentId === fieldId)) {
      next = moveFieldToStep(next, child.id, source.stepId)
    }
  }
  return {
    ...next,
    fields: next.fields.filter(field => field.id !== fieldId),
    conditions: (next.conditions ?? []).flatMap((condition) => {
      const kept = conditionWithoutField(condition, fieldId)
      return kept ? [kept] : []
    }),
    layouts: Object.fromEntries(formBreakpoints().map(name => [
      name,
      (next.layouts[name] ?? []).filter(item => item.fieldId !== fieldId),
    ])),
  }
}

export function replaceField(content: FormContent, field: FormField): FormContent {
  let next = field
  if (isSubmitButton(next) && content.fields.some(item => item.id !== next.id && isSubmitButton(item))) {
    next = {
      ...next,
      text: next.text ? { ...next.text, buttonType: 'button' } : next.text,
    }
  }
  return {
    ...content,
    fields: content.fields.map(current => current.id === next.id ? next : current),
  }
}

export function hasSubmitButton(content: FormContent): boolean {
  return content.fields.some(isSubmitButton)
}

export function isSubmitButton(field: FormField): boolean {
  return field.type === 'button' && field.text?.buttonType === 'submit'
}

export function setLayoutItem(content: FormContent, breakpoint: Breakpoint, item: LayoutItem, resolve = true): FormContent {
  const all = content.layouts[breakpoint] ?? []
  const sameGroup = all.filter(entry => entry.fieldId === item.fieldId || sameLayoutGroup(content, item.fieldId, entry.fieldId))
  const otherGroups = all.filter(entry => entry.fieldId !== item.fieldId && !sameLayoutGroup(content, item.fieldId, entry.fieldId))
  const nextSame = sameGroup.map(current => current.fieldId === item.fieldId ? clampItem(item) : current)
  return {
    ...content,
    layouts: {
      ...content.layouts,
      [breakpoint]: [...otherGroups, ...(resolve ? resolveLayout(nextSame, item.fieldId) : nextSame)],
    },
  }
}

function sameLayoutGroup(content: FormContent, fieldId: string, otherId: string): boolean {
  const parent = content.fields.find(field => field.id === fieldId)?.parentId || ''
  const otherParent = content.fields.find(field => field.id === otherId)?.parentId || ''
  if (parent || otherParent) {
    return parent !== '' && parent === otherParent
  }
  return stepIdOf(content, fieldId) === stepIdOf(content, otherId)
}

function layoutGroups(content: FormContent): Set<string>[] {
  const groups: Set<string>[] = []
  for (const step of content.steps) {
    groups.push(new Set(content.fields.filter(field => field.stepId === step.id && !field.parentId).map(field => field.id)))
  }
  for (const repeater of content.fields.filter(field => field.type === 'repeater')) {
    groups.push(new Set(content.fields.filter(field => field.parentId === repeater.id).map(field => field.id)))
  }
  return groups
}

function readingOrder(items: LayoutItem[]): LayoutItem[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x || a.fieldId.localeCompare(b.fieldId))
}

/** Keeps each item’s width and spacer height, and places them in `order`. */
function flowInOrder(items: LayoutItem[], order: string[]): LayoutItem[] {
  const byId = new Map(items.map(item => [item.fieldId, item]))
  const ordered = order.map(id => byId.get(id)).filter((item): item is LayoutItem => !!item)
  for (const item of items) {
    if (!order.includes(item.fieldId)) {
      ordered.push(item)
    }
  }
  const placed: LayoutItem[] = []
  let x = 0
  let y = 0
  for (const item of ordered) {
    const w = clampInt(item.w, 1, GRID_COLUMNS)
    if (x > 0 && x + w > GRID_COLUMNS) {
      y += 1
      x = 0
    }
    const next: LayoutItem = { ...item, x, y, w }
    placed.push(next)
    x += w
    if (x >= GRID_COLUMNS) {
      y += 1
      x = 0
    }
  }
  return placed
}

/** Copies the source breakpoint’s field order onto every other layout. */
export function syncFieldOrderLayouts(content: FormContent, source: Breakpoint): FormContent {
  const sourceItems = content.layouts[source] ?? []
  const layouts = { ...content.layouts }
  for (const name of formBreakpoints()) {
    if (name === source) {
      continue
    }
    const target = content.layouts[name] ?? []
    const next: LayoutItem[] = []
    for (const group of layoutGroups(content)) {
      const sourceStep = readingOrder(sourceItems.filter(item => group.has(item.fieldId)))
      const targetStep = target.filter(item => group.has(item.fieldId))
      next.push(...flowInOrder(targetStep, sourceStep.map(item => item.fieldId)))
    }
    layouts[name] = next
  }
  return { ...content, layouts }
}

export function copyDesktopLayout(content: FormContent, breakpoint: Breakpoint): FormContent {
  const source = baseBreakpoint()
  if (breakpoint === source) {
    return content
  }
  const copied = (content.layouts[source] ?? []).map(item => ({ ...item }))
  const next: LayoutItem[] = []
  for (const group of layoutGroups(content)) {
    next.push(...resolveLayout(copied.filter(item => group.has(item.fieldId))))
  }
  return {
    ...content,
    layouts: {
      ...content.layouts,
      [breakpoint]: next,
    },
  }
}

export function normalizeFormContent(input: unknown): FormContent {
  const source = isRecord(input) ? input : {}
  const steps = normalizeSteps(source.steps)
  const stepIds = new Set(steps.map(step => step.id))
  const fallbackStepId = steps[0]!.id
  const rawFields = Array.isArray(source.fields) ? source.fields : []
  const fields: FormField[] = []
  for (const raw of rawFields.slice(0, MAX_FIELDS)) {
    const field = normalizeField(raw, fields, stepIds, fallbackStepId)
    if (field) {
      fields.push(field)
    }
  }
  fields.splice(0, fields.length, ...lockInitialSubmit(fields))
  const repeaterIds = new Set(fields.filter(field => field.type === 'repeater').map(field => field.id))
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]!
    const parent = field.parentId ? fields.find(item => item.id === field.parentId) : undefined
    if (!field.parentId) {
      continue
    }
    if (!parent || parent.type !== 'repeater' || field.type === 'repeater' || field.locked || isSubmitButton(field) || !repeaterIds.has(field.parentId)) {
      fields[index] = { ...field, parentId: undefined }
      continue
    }
    if (field.stepId !== parent.stepId) {
      fields[index] = { ...field, stepId: parent.stepId }
    }
  }
  const rawLayouts = isRecord(source.layouts) ? source.layouts : {}
  const layouts = {} as FormContent['layouts']
  for (const breakpoint of formBreakpoints()) {
    const rawItems = Array.isArray(rawLayouts[breakpoint]) ? rawLayouts[breakpoint] : []
    const next: LayoutItem[] = []
    for (const step of steps) {
      let placed: LayoutItem[] = []
      for (const field of fields.filter(entry => entry.stepId === step.id && !entry.parentId)) {
        const raw = rawItems.find(item => isRecord(item) && item.fieldId === field.id)
        if (raw && Number.isFinite(Number(raw.x)) && Number.isFinite(Number(raw.y)) && Number.isFinite(Number(raw.w))) {
          placed = resolveLayout([
            ...placed,
            clampItem({
              fieldId: field.id,
              x: Number(raw.x),
              y: Number(raw.y),
              w: Number(raw.w),
              h: Number.isFinite(Number(raw.h)) ? Number(raw.h) : undefined,
            }),
          ], field.id)
        }
        else {
          placed = placeField(placed, field.id, defaultWidth(field.type, breakpoint))
        }
      }
      next.push(...placed)
    }
    for (const repeater of fields.filter(field => field.type === 'repeater')) {
      let placed: LayoutItem[] = []
      for (const field of fields.filter(entry => entry.parentId === repeater.id)) {
        const raw = rawItems.find(item => isRecord(item) && item.fieldId === field.id)
        if (raw && Number.isFinite(Number(raw.x)) && Number.isFinite(Number(raw.y)) && Number.isFinite(Number(raw.w))) {
          placed = resolveLayout([
            ...placed,
            clampItem({
              fieldId: field.id,
              x: Number(raw.x),
              y: Number(raw.y),
              w: Number(raw.w),
              h: Number.isFinite(Number(raw.h)) ? Number(raw.h) : undefined,
            }),
          ], field.id)
        }
        else {
          placed = placeField(placed, field.id, defaultWidth(field.type, breakpoint))
        }
      }
      next.push(...placed)
    }
    layouts[breakpoint] = next
  }
  return {
    syncFieldOrder: source.syncFieldOrder === true,
    validateOnBlur: source.validateOnBlur !== false,
    preventEmptySubmit: source.preventEmptySubmit !== false,
    emptySubmitMessage: clip(source.emptySubmitMessage, 400).trim() || EMPTY_SUBMIT_MESSAGE,
    notification: normalizeNotification(source.notification),
    confirmation: normalizeConfirmation(source.confirmation),
    conditions: normalizeConditions(source.conditions, fields),
    steps,
    stepHeader: normalizeStepHeader(source.stepHeader),
    fields,
    layouts,
  }
}

export function parseContent(value: unknown): FormContent {
  if (typeof value === 'string') {
    try {
      return normalizeFormContent(JSON.parse(value))
    }
    catch {
      return createEmptyContent()
    }
  }
  return normalizeFormContent(value)
}

export interface UploadedFile {
  name: string
  type: string
  size: number
}

export function fieldSubmissionError(
  field: FormField,
  input: Record<string, unknown>,
  file: UploadedFile | UploadedFile[] | null,
  maxFileBytes: number,
): string | null {
  const message = fieldError(field, input[field.key], file, maxFileBytes)
  if (message) {
    return message
  }
  if (field.text?.confirm.enabled) {
    const rawEntered = input[field.key]
    const rawConfirm = input[`${field.key}__confirm`]
    const entered = cleanText(typeof rawEntered === 'string' ? rawEntered : rawEntered == null ? '' : String(rawEntered)).trim()
    const confirm = cleanText(typeof rawConfirm === 'string' ? rawConfirm : '').trim()
    if (entered !== confirm) {
      return 'The values do not match.'
    }
  }
  return null
}

export function submissionErrors(
  content: FormContent,
  input: Record<string, unknown>,
  files: Record<string, UploadedFile | UploadedFile[] | null>,
  maxFileBytes: number,
): Record<string, string> {
  const states = fieldConditionStates(content, conditionInputValues(content, input))
  const errors: Record<string, string> = {}
  for (const field of content.fields) {
    const state = states[field.id]
    if (state?.hidden || state?.disabled) {
      continue
    }
    const message = fieldSubmissionError(fieldForCondition(field, state), input, files[field.key] ?? null, maxFileBytes)
    if (message) {
      errors[field.key] = message
    }
  }
  return errors
}

export function conditionInputValues(content: FormContent, input: Record<string, unknown>): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {}
  for (const field of content.fields) {
    values[field.id] = conditionStoredValue(field, input[field.key])
  }
  return values
}

export function fieldConditionStates(content: FormContent, values: Record<string, string | string[]>): Record<string, FormFieldConditionState> {
  const conditions = acyclicConditions(content.conditions ?? [])
  const states: Record<string, FormFieldConditionState> = {}
  for (const field of content.fields) {
    const targeted = (action: FormConditionAction) => conditions.some(condition => condition.enabled && conditionBranches(condition).some(branch => branch.action === action && branch.targetFieldIds.includes(field.id)))
    states[field.id] = {
      hidden: field.text?.hidden === true || targeted('show'),
      disabled: field.text?.disabled === true || targeted('enable'),
      readonly: field.text?.readOnly === true || targeted('writable'),
      required: targeted('required') ? false : field.required || field.text?.required.enabled === true,
    }
  }
  for (const condition of conditions) {
    if (!condition.enabled) {
      continue
    }
    const branch = conditionBranches(condition).find(item => item.kind === 'else' || branchMatches(content, item, values))
    if (!branch) {
      continue
    }
    for (const targetId of branch.targetFieldIds) {
      const state = states[targetId]
      if (!state) {
        continue
      }
      if (branch.action === 'show') state.hidden = false
      if (branch.action === 'hide') state.hidden = true
      if (branch.action === 'enable') state.disabled = false
      if (branch.action === 'disable') state.disabled = true
      if (branch.action === 'writable') state.readonly = false
      if (branch.action === 'readonly') state.readonly = true
      if (branch.action === 'required') state.required = true
    }
  }
  return states
}

export function fieldForCondition(field: FormField, state: FormFieldConditionState | undefined): FormField {
  const required = state?.required ?? (field.required || field.text?.required.enabled === true)
  if (!field.text) {
    return { ...field, required }
  }
  return {
    ...field,
    required,
    text: {
      ...field.text,
      required: { ...field.text.required, enabled: required },
    },
  }
}

function conditionStoredValue(field: FormField, raw: unknown): string | string[] {
  if (isConditionMulti(field)) {
    if (Array.isArray(raw)) {
      return raw.map(item => String(item).trim()).filter(Boolean)
    }
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(',').map(item => item.trim()).filter(Boolean)
    }
    return []
  }
  if (Array.isArray(raw)) {
    return raw[0] == null ? '' : String(raw[0])
  }
  return raw == null ? '' : String(raw)
}

function isConditionMulti(field: FormField): boolean {
  return field.type === 'checkbox'
    || (field.type === 'image_select' && field.text?.allowMultiple === true)
    || (field.type === 'select' && field.text?.selectMultiple.enabled === true)
}

function branchMatches(content: FormContent, branch: FormConditionBranch, values: Record<string, string | string[]>): boolean {
  if (branch.kind === 'else' || !branch.groups.length) {
    return false
  }
  return branch.groups.every(group => groupMatches(content, branch.fieldId, values, group))
}

function groupMatches(content: FormContent, fallbackFieldId: string, values: Record<string, string | string[]>, group: FormConditionGroup): boolean {
  if (!group.rules.length) {
    return false
  }
  const checks = group.rules.map((rule) => {
    const field = content.fields.find(item => item.id === (rule.fieldId || fallbackFieldId))
    if (!field) {
      return false
    }
    return ruleMatches(field, values[field.id] ?? (isConditionMulti(field) ? [] : ''), rule)
  })
  return group.match === 'any' ? checks.some(Boolean) : checks.every(Boolean)
}

function ruleMatches(field: FormField, raw: string | string[], rule: FormConditionRule): boolean {
  const empty = isConditionMulti(field) ? (Array.isArray(raw) ? raw.length === 0 : !raw) : String(raw).trim() === ''
  if (rule.logic === 'null') {
    return empty
  }
  if (rule.logic === 'not_null') {
    return !empty
  }
  if (isConditionMulti(field)) {
    const selected = Array.isArray(raw) ? raw : []
    const expected = rule.value.split(',').map(item => item.trim()).filter(Boolean)
    if (rule.logic === 'equal') {
      return sameMembers(selected, expected)
    }
    if (rule.logic === 'not_equal') {
      return !sameMembers(selected, expected)
    }
    if (rule.logic === 'contain') {
      return expected.some(item => selected.includes(item))
    }
    if (rule.logic === 'contain_all') {
      return expected.length > 0 && expected.every(item => selected.includes(item))
    }
    if (rule.logic === 'not_contain') {
      return expected.every(item => !selected.includes(item))
    }
  }
  const value = Array.isArray(raw) ? raw.join(',') : raw
  const expected = rule.value
  if (rule.logic === 'equal') {
    return value === expected
  }
  if (rule.logic === 'not_equal') {
    return value !== expected
  }
  if (rule.logic === 'contain') {
    return expected !== '' && value.toLowerCase().includes(expected.toLowerCase())
  }
  if (rule.logic === 'not_contain') {
    return expected === '' || !value.toLowerCase().includes(expected.toLowerCase())
  }
  if (rule.logic === 'contain_all') {
    const parts = expected.split(',').map(item => item.trim()).filter(Boolean)
    return parts.length > 0 && parts.every(item => value.toLowerCase().includes(item.toLowerCase()))
  }
  if (rule.logic === 'start_with') {
    return expected !== '' && value.toLowerCase().startsWith(expected.toLowerCase())
  }
  if (rule.logic === 'end_with') {
    return expected !== '' && value.toLowerCase().endsWith(expected.toLowerCase())
  }
  if (rule.logic === 'between') {
    return betweenMatch(value, expected)
  }
  const order = compareCondition(value, expected)
  if (rule.logic === 'greater') return order > 0
  if (rule.logic === 'less') return order < 0
  if (rule.logic === 'greater_or_equal') return order >= 0
  if (rule.logic === 'less_or_equal') return order <= 0
  return false
}

function sameMembers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }
  const pending = [...right]
  return left.every((item) => {
    const index = pending.indexOf(item)
    if (index < 0) {
      return false
    }
    pending.splice(index, 1)
    return true
  })
}

function betweenMatch(value: string, raw: string): boolean {
  let min = ''
  let max = ''
  try {
    const parsed = JSON.parse(raw) as { min?: unknown, max?: unknown }
    min = parsed.min == null ? '' : String(parsed.min)
    max = parsed.max == null ? '' : String(parsed.max)
  }
  catch {
    return false
  }
  if (min !== '' && compareCondition(value, min) < 0) {
    return false
  }
  if (max !== '' && compareCondition(value, max) > 0) {
    return false
  }
  return min !== '' || max !== ''
}

function compareCondition(left: string, right: string): number {
  const leftNumber = Number(left)
  const rightNumber = Number(right)
  if (left.trim() !== '' && right.trim() !== '' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber
  }
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function acyclicConditions(conditions: FormCondition[]): FormCondition[] {
  const edges = new Map<string, Set<string>>()
  const kept: FormCondition[] = []
  for (const condition of conditions) {
    if (!condition.enabled) {
      kept.push(condition)
      continue
    }
    const branches: FormConditionBranch[] = []
    const ifSources = watchedFieldIds(conditionBranches(condition).find(branch => branch.kind === 'if'))
    for (const branch of conditionBranches(condition)) {
      const sources = branch.kind === 'else' ? ifSources : watchedFieldIds(branch)
      const showHide = branch.action === 'show' || branch.action === 'hide'
      if (showHide && sources.some(source => branch.targetFieldIds.some(target => target === source || reaches(edges, target, source)))) {
        continue
      }
      branches.push(branch)
      if (!showHide) {
        continue
      }
      for (const source of sources) {
        const next = edges.get(source) ?? new Set<string>()
        for (const target of branch.targetFieldIds) {
          next.add(target)
        }
        edges.set(source, next)
      }
    }
    if (branches.some(branch => branch.kind === 'if')) {
      kept.push({ ...condition, branches })
    }
  }
  return kept
}

function watchedFieldIds(branch: FormConditionBranch | undefined): string[] {
  if (!branch || branch.kind === 'else') {
    return []
  }
  const ids = new Set<string>()
  if (branch.fieldId) {
    ids.add(branch.fieldId)
  }
  for (const group of branch.groups) {
    for (const rule of group.rules) {
      if (rule.fieldId) {
        ids.add(rule.fieldId)
      }
    }
  }
  return [...ids]
}

export function conditionBranches(condition: FormCondition): FormConditionBranch[] {
  if (condition.branches?.length) {
    return condition.branches
  }
  const legacy = condition as FormCondition & {
    fieldId?: string
    groups?: FormConditionGroup[]
    action?: FormConditionAction
    targetFieldIds?: string[]
  }
  if (!legacy.fieldId || !legacy.action || !legacy.groups?.length || !legacy.targetFieldIds?.length) {
    return []
  }
  return [{
    id: `${condition.id || 'c'}-if`,
    kind: 'if',
    fieldId: legacy.fieldId,
    groups: legacy.groups,
    action: legacy.action,
    targetFieldIds: legacy.targetFieldIds,
  }]
}

function conditionWithoutField(condition: FormCondition, fieldId: string): FormCondition | null {
  const branches = conditionBranches(condition).flatMap((branch) => {
    const groups = branch.kind === 'else'
      ? []
      : branch.groups
          .map(group => ({ ...group, rules: group.rules.filter(rule => rule.fieldId !== fieldId) }))
          .filter(group => group.rules.length)
    const stillWatchesRemoved = branch.kind !== 'else' && branch.fieldId === fieldId && groups.every(group => group.rules.every(rule => !rule.fieldId))
    if (stillWatchesRemoved || (branch.kind !== 'else' && !groups.length)) {
      return []
    }
    const targetFieldIds = branch.targetFieldIds.filter(id => id !== fieldId)
    if (!targetFieldIds.length) {
      return []
    }
    const nextFieldId = branch.fieldId === fieldId ? (groups[0]?.rules.find(rule => rule.fieldId)?.fieldId || '') : branch.fieldId
    return [{ ...branch, fieldId: nextFieldId, groups, targetFieldIds }]
  })
  if (!branches.some(branch => branch.kind === 'if')) {
    return null
  }
  return { ...condition, branches }
}

function reaches(edges: Map<string, Set<string>>, from: string, target: string): boolean {
  const seen = new Set<string>()
  const stack = [from]
  while (stack.length) {
    const current = stack.pop()!
    if (current === target) {
      return true
    }
    if (seen.has(current)) {
      continue
    }
    seen.add(current)
    for (const next of edges.get(current) ?? []) {
      stack.push(next)
    }
  }
  return false
}

function normalizeConditions(raw: unknown, fields: FormField[]): FormCondition[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const ids = new Set(fields.map(field => field.id))
  const conditions: FormCondition[] = []
  for (const item of raw.slice(0, 100)) {
    if (!isRecord(item)) {
      continue
    }
    const branches = normalizeBranches(item, ids)
    if (!branches.some(branch => branch.kind === 'if')) {
      continue
    }
    conditions.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 80) : `c_${crypto.randomUUID()}`,
      enabled: item.enabled === true,
      title: clip(item.title, 80) || 'Condition',
      branches,
    })
  }
  return conditions
}

function normalizeBranches(item: Record<string, unknown>, ids: Set<string>): FormConditionBranch[] {
  const rawBranches = Array.isArray(item.branches) ? item.branches : [item]
  const ifs: FormConditionBranch[] = []
  const elseIfs: FormConditionBranch[] = []
  const elses: FormConditionBranch[] = []
  for (const raw of rawBranches.slice(0, 20)) {
    if (!isRecord(raw)) {
      continue
    }
    const kind = raw.kind === 'else' || raw.kind === 'else_if' ? raw.kind : 'if'
    const action = FORM_CONDITION_ACTIONS.includes(raw.action as FormConditionAction) ? raw.action as FormConditionAction : null
    if (!action) {
      continue
    }
    const groups = kind === 'else' ? [] : normalizeConditionGroups(raw.groups, ids)
    const fieldId = kind === 'else'
      ? ''
      : (typeof raw.fieldId === 'string' && ids.has(raw.fieldId) ? raw.fieldId : groups.flatMap(group => group.rules).find(rule => rule.fieldId)?.fieldId || '')
    const watched = new Set(kind === 'else' ? [] : [fieldId, ...groups.flatMap(group => group.rules.map(rule => rule.fieldId || fieldId))])
    const targetFieldIds = Array.isArray(raw.targetFieldIds)
      ? raw.targetFieldIds.filter((id): id is string => typeof id === 'string' && ids.has(id) && !watched.has(id))
      : []
    if (!targetFieldIds.length || (kind !== 'else' && (!fieldId || !groups.length))) {
      continue
    }
    const branch: FormConditionBranch = {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 80) : `b_${crypto.randomUUID()}`,
      kind,
      fieldId,
      groups,
      action,
      targetFieldIds,
    }
    if (kind === 'else') elses.push(branch)
    else if (kind === 'else_if') elseIfs.push(branch)
    else ifs.push(branch)
  }
  const branches = [...ifs, ...elseIfs]
  const fallback = elses[0]
  if (fallback) {
    branches.push(fallback)
  }
  if (branches[0] && branches[0].kind !== 'if') {
    branches[0] = { ...branches[0], kind: 'if' }
  }
  return branches
}

function normalizeConditionGroups(raw: unknown, ids: Set<string>): FormConditionGroup[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const groups: FormConditionGroup[] = []
  for (const item of raw.slice(0, 10)) {
    if (!isRecord(item) || !Array.isArray(item.rules)) {
      continue
    }
    const rules: FormConditionRule[] = []
    for (const rule of item.rules.slice(0, 20)) {
      if (!isRecord(rule) || !FORM_CONDITION_LOGICS.includes(rule.logic as FormConditionLogic)) {
        continue
      }
      const fieldId = typeof rule.fieldId === 'string' && ids.has(rule.fieldId) ? rule.fieldId : ''
      rules.push({
        id: typeof rule.id === 'string' && rule.id.trim() ? rule.id.trim().slice(0, 80) : `r_${crypto.randomUUID()}`,
        ...(fieldId ? { fieldId } : {}),
        logic: rule.logic as FormConditionLogic,
        value: clip(rule.value, 500),
      })
    }
    if (!rules.length) {
      continue
    }
    groups.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 80) : `g_${crypto.randomUUID()}`,
      match: item.match === 'any' ? 'any' : 'all',
      rules,
    })
  }
  return groups
}

export function emptySubmissionError(
  content: FormContent,
  input: Record<string, unknown>,
  files: Record<string, UploadedFile | UploadedFile[] | null>,
): string | null {
  if (content.preventEmptySubmit === false) {
    return null
  }
  for (const field of content.fields) {
    if (!storesValue(field) || field.type === 'hidden') {
      continue
    }
    if (fieldHasVisitorValue(field, input[field.key], files[field.key] ?? null)) {
      return null
    }
    const rawConfirm = input[`${field.key}__confirm`]
    if (field.text?.confirm.enabled && cleanText(typeof rawConfirm === 'string' ? rawConfirm : '').trim()) {
      return null
    }
  }
  return content.emptySubmitMessage?.trim() || EMPTY_SUBMIT_MESSAGE
}

function fieldHasVisitorValue(field: FormField, raw: unknown, file: UploadedFile | UploadedFile[] | null): boolean {
  if (field.type === 'file') {
    return fileList(file).length > 0
  }
  if (field.type === 'checkbox' || (field.type === 'image_select' && field.text?.allowMultiple) || (field.type === 'select' && field.text?.selectMultiple.enabled)) {
    return asList(raw).length > 0
  }
  return cleanText(typeof raw === 'string' ? raw : raw == null ? '' : String(raw)).trim().length > 0
}

export function textStoredValue(field: FormField, input: unknown): string {
  if (field.type === 'hidden') {
    return field.value
  }
  if (field.type === 'checkbox') {
    return JSON.stringify(allowedChoices(field, asList(input)))
  }
  if (field.type === 'number') {
    return cleanText(typeof input === 'string' ? input : input == null ? '' : String(input)).trim()
  }
  return cleanText(typeof input === 'string' ? input : input == null ? '' : String(input)).trim()
}

export function storesValue(field: FormField): boolean {
  return field.type !== 'html' && field.type !== 'button' && field.type !== 'title' && field.type !== 'image' && field.type !== 'divider' && field.type !== 'spacer' && field.type !== 'repeater'
}

function defaultNotification(): FormNotification {
  return {
    to: '',
    fromMail: '',
    fromName: '',
    cc: '',
    bcc: '',
    replyTo: '',
  }
}

function defaultConfirmation(): FormConfirmation {
  return {
    successMessage: '',
    redirectPage: '',
  }
}

const NOTIFICATION_MAIL_FIELDS = ['to', 'fromMail', 'cc', 'bcc', 'replyTo'] as const
const NOTIFICATION_LIST_FIELDS = new Set<string>(['to', 'cc', 'bcc'])

/** Field-key errors for notification addresses. Empty values are allowed. */
export function notificationFieldErrors(notification: FormNotification | undefined): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!notification) {
    return errors
  }
  for (const key of NOTIFICATION_MAIL_FIELDS) {
    const message = notificationMailError(notification[key], NOTIFICATION_LIST_FIELDS.has(key))
    if (message) {
      errors[`notify-${key}`] = message
    }
  }
  return errors
}

function notificationMailError(value: string, multiple: boolean): string | null {
  const text = value.trim()
  if (!text) {
    return null
  }
  const parts = multiple
    ? text.split(',').map(item => item.trim()).filter(Boolean)
    : [text]
  if (!parts.length || parts.some(part => !EMAIL_PATTERN.test(part))) {
    return multiple
      ? 'Enter valid email addresses, separated by commas.'
      : 'Enter a valid email address.'
  }
  return null
}

function normalizeNotification(raw: unknown): FormNotification {
  const source = isRecord(raw) ? raw : {}
  return {
    to: clip(source.to, 500),
    fromMail: clip(source.fromMail, 200),
    fromName: clip(source.fromName, 200),
    cc: clip(source.cc, 500),
    bcc: clip(source.bcc, 500),
    replyTo: clip(source.replyTo, 200),
  }
}

function normalizeConfirmation(raw: unknown): FormConfirmation {
  const source = isRecord(raw) ? raw : {}
  return {
    successMessage: sanitizeHtml(clip(source.successMessage, 50000)),
    redirectPage: clip(source.redirectPage, 2000).trim(),
  }
}

/** A same-site path or an http(s) URL. Anything else is ignored. */
export function confirmationTarget(value: string): string {
  const text = value.trim()
  if (text.startsWith('/') && !text.startsWith('//') && !text.includes('\\')) {
    return text
  }
  try {
    const url = new URL(text)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href
    }
  }
  catch {
    return ''
  }
  return ''
}

function defaultStepHeader(): FormStepHeader {
  return {
    show: false,
    showLabel: true,
    showSubtitle: false,
    showIcon: false,
  }
}

function createStep(index: number): FormStep {
  return {
    id: `s_${crypto.randomUUID()}`,
    label: `Step ${index}`,
    subtitle: '',
    icon: '',
    labelPrefix: '',
    labelSuffix: '',
    subtitlePrefix: '',
    subtitleSuffix: '',
  }
}

function normalizeStepHeader(raw: unknown): FormStepHeader {
  const source = isRecord(raw) ? raw : {}
  return {
    show: source.show === true,
    showLabel: source.showLabel !== false,
    showSubtitle: source.showSubtitle === true,
    showIcon: source.showIcon === true,
  }
}

function normalizeSteps(raw: unknown): FormStep[] {
  const steps: FormStep[] = []
  if (Array.isArray(raw)) {
    for (const item of raw.slice(0, MAX_STEPS)) {
      if (!isRecord(item)) {
        continue
      }
      const id = typeof item.id === 'string' && item.id.trim()
        ? item.id.trim().slice(0, 80)
        : `s_${crypto.randomUUID()}`
      if (steps.some(step => step.id === id)) {
        continue
      }
      const base = createStep(steps.length + 1)
      steps.push({
        ...base,
        id,
        label: clip(item.label, 80) || base.label,
        subtitle: clip(item.subtitle, 160),
        icon: clip(item.icon, 40),
        labelPrefix: clip(item.labelPrefix, 40),
        labelSuffix: clip(item.labelSuffix, 40),
        subtitlePrefix: clip(item.subtitlePrefix, 40),
        subtitleSuffix: clip(item.subtitleSuffix, 40),
      })
    }
  }
  if (!steps.length) {
    steps.push(createStep(1))
  }
  return steps
}

function insertBefore(fields: FormField[], beforeId: string, field: FormField): FormField[] {
  const index = fields.findIndex(item => item.id === beforeId)
  if (index < 0) {
    return [...fields, field]
  }
  return [...fields.slice(0, index), field, ...fields.slice(index)]
}

function lockInitialSubmit(fields: FormField[]): FormField[] {
  let submitSeen = false
  const next = fields.map((field) => {
    if (!isSubmitButton(field)) {
      return field
    }
    if (submitSeen) {
      return {
        ...field,
        locked: undefined,
        text: field.text ? { ...field.text, buttonType: 'button' as const } : field.text,
      }
    }
    submitSeen = true
    return field
  })
  if (next.some(field => field.locked)) {
    return next
  }
  const submit = next.find(isSubmitButton)
  if (!submit) {
    return next
  }
  return next.map(field => field.id === submit.id ? { ...field, locked: true } : field)
}

function stepIdOf(content: FormContent, fieldId: string): string {
  return content.fields.find(field => field.id === fieldId)?.stepId || content.steps[0]?.id || ''
}

function createField(type: FieldType, existing: FormField[], stepId: string): FormField {
  const key = uniqueKey(type, existing)
  return {
    id: `f_${crypto.randomUUID()}`,
    type,
    stepId,
    key,
    label: FIELD_LABELS[type],
    placeholder: '',
    help: '',
    required: false,
    options: CHOICE_TYPES.has(type)
      ? [
          { label: 'Option 1', value: 'option_1' },
          { label: 'Option 2', value: 'option_2' },
        ]
      : [],
    html: '',
    value: '',
    buttonLabel: type === 'button' && existing.some(field => field.type === 'button') ? 'Button' : type === 'button' ? 'Submit' : '',
    locked: type === 'button' && !existing.some(field => field.type === 'button') ? true : undefined,
    accept: '',
    rows: 4,
    min: '',
    max: '',
    step: '',
    text: textOptionsFor(type, existing),
  }
}

function textOptionsFor(type: FieldType, existing: FormField[]) {
  if (!isRichFieldType(type)) {
    return undefined
  }
  const text = defaultTextOptions(FIELD_LABELS[type])
  if (type === 'button') {
    const another = existing.some(field => field.type === 'button')
    text.label.enabled = false
    text.buttonText = { enabled: true, text: another ? 'Button' : 'Submit', prefix: null, suffix: null }
    text.buttonType = another ? 'button' : 'submit'
  }
  if (type === 'range') {
    text.valueMin = 0
    text.valueMax = 100
    text.step = 1
    text.defaultValue = '50'
  }
  if (type === 'color') {
    text.defaultValue = '#000000'
  }
  if (type === 'url') {
    text.autocomplete = 'url'
  }
  if (type === 'select' || type === 'radio' || type === 'checkbox' || type === 'image_select') {
    text.choiceOptions = defaultChoiceOptions()
  }
  if (type === 'select') {
    text.choiceEntries = text.choiceOptions.map(option => ({ type: 'option', option }))
  }
  if (type === 'title' || type === 'image' || type === 'divider' || type === 'spacer' || type === 'html') {
    text.label.enabled = false
  }
  return text
}

function normalizeField(raw: unknown, existing: FormField[], stepIds: Set<string>, fallbackStepId: string): FormField | null {
  if (!isRecord(raw) || !isFieldType(raw.type)) {
    return null
  }
  const type = raw.type
  const usedIds = new Set(existing.map(field => field.id))
  const id = typeof raw.id === 'string' && raw.id.trim() && !usedIds.has(raw.id.trim())
    ? raw.id.trim().slice(0, 80)
    : `f_${crypto.randomUUID()}`
  const key = uniqueNormalizedKey(raw.key, type, existing)
  const legacyOptions = CHOICE_TYPES.has(type) ? normalizeOptions(raw.options) : []
  const text = isRichFieldType(type)
    ? normalizeTextOptions(raw.text, {
        label: clip(raw.label, 200) || FIELD_LABELS[type],
        placeholder: clip(raw.placeholder, 200),
        help: clip(raw.help, 400),
        required: raw.required === true,
        value: clip(raw.value, 20000),
        min: clip(raw.min, 40),
        max: clip(raw.max, 40),
        buttonLabel: clip(raw.buttonLabel, 400),
        options: legacyOptions,
      })
    : undefined
  const listed = text ? listedChoiceOptions(text) : []
  const options = listed.length
    ? listed.map(item => ({ label: item.label, value: item.value }))
    : legacyOptions
  return {
    id,
    type,
    stepId: typeof raw.stepId === 'string' && stepIds.has(raw.stepId) ? raw.stepId : fallbackStepId,
    key,
    label: text?.label.text || clip(raw.label, 200) || FIELD_LABELS[type],
    placeholder: text ? text.placeholder : clip(raw.placeholder, 200),
    help: text ? (text.helper.enabled ? text.helper.text : '') : clip(raw.help, 400),
    required: text ? text.required.enabled : type !== 'html' && type !== 'button' && type !== 'hidden' && raw.required === true,
    options,
    html: type === 'html' ? sanitizeHtml(clip(raw.html, 50000)) : '',
    value: type === 'hidden' ? clip(raw.value, 2000) : (text?.defaultValue || ''),
    buttonLabel: type === 'button' ? (text?.buttonText.text || clip(raw.buttonLabel, 400) || 'Submit') : '',
    accept: type === 'file' ? (fileAccept(text?.fileType || '') || clip(raw.accept, 400)) : '',
    rows: type === 'textarea' ? clampInt(Number(raw.rows) || 4, 2, 20) : 4,
    min: isTemporalType(type) ? (text?.rangeMin || '') : text?.valueMin != null ? String(text.valueMin) : (type === 'number' ? clip(raw.min, 40) : ''),
    max: isTemporalType(type) ? (text?.rangeMax || '') : text?.valueMax != null ? String(text.valueMax) : (type === 'number' ? clip(raw.max, 40) : ''),
    step: text?.step != null && (type === 'range' || type === 'number') ? String(text.step) : '',
    text,
    containerClass: clip(raw.containerClass, 400).trim() || undefined,
    parentId: typeof raw.parentId === 'string' && raw.parentId.trim() ? raw.parentId.trim().slice(0, 80) : undefined,
    locked: raw.locked === true ? true : undefined,
  }
}

function normalizeOptions(raw: unknown): FormFieldOption[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const options: FormFieldOption[] = []
  const used = new Set<string>()
  for (const item of raw.slice(0, 100)) {
    if (!isRecord(item)) {
      continue
    }
    const label = clip(item.label, 200)
    let value = clip(item.value, 80)
    if (!value) {
      value = slugify(label).replace(/-/g, '_')
    }
    if (!value || used.has(value)) {
      continue
    }
    used.add(value)
    options.push({ label: label || value, value })
  }
  return options
}

function uniqueNormalizedKey(raw: unknown, type: FieldType, existing: FormField[]): string {
  const used = new Set(existing.map(field => field.key))
  const candidate = typeof raw === 'string' ? raw.trim() : ''
  if (KEY_PATTERN.test(candidate) && !used.has(candidate)) {
    return candidate
  }
  return uniqueKey(type, existing)
}

function uniqueKey(type: FieldType, existing: FormField[]): string {
  const base = type === 'textarea' ? 'message' : type
  const used = new Set(existing.map(field => field.key))
  if (!used.has(base)) {
    return base
  }
  let n = 2
  while (used.has(`${base}_${n}`)) {
    n++
  }
  return `${base}_${n}`
}

function fieldError(field: FormField, raw: unknown, file: UploadedFile | UploadedFile[] | null, maxFileBytes: number): string | null {
  if (field.type === 'html' || field.type === 'button' || field.type === 'hidden' || field.type === 'title' || field.type === 'image' || field.type === 'divider' || field.type === 'spacer') {
    return null
  }
  if (field.type === 'file') {
    return fileFieldError(field, file, maxFileBytes)
  }
  if (field.type === 'checkbox' || field.type === 'image_select' || field.type === 'select' || field.type === 'radio') {
    return choiceFieldError(field, raw)
  }
  const value = cleanText(typeof raw === 'string' ? raw : raw == null ? '' : String(raw)).trim()
  if (!value) {
    if (!field.required) {
      return null
    }
    return customErrorText(field.text) || 'This field is required.'
  }
  if (field.text && isRichFieldType(field.type)) {
    const constraint = textConstraintError(field.text, value)
    if (constraint) {
      return invalidErrorText(field.text) || customErrorText(field.text) || constraint
    }
  }
  if (field.type === 'email' && !EMAIL_PATTERN.test(value)) {
    return invalidErrorText(field.text) || 'Enter a valid email address.'
  }
  if (field.type === 'password' && field.text && passwordRuleStates(field.text, value).some(rule => !rule.ok)) {
    return invalidErrorText(field.text) || 'Password does not meet the requirements.'
  }
  if (field.type === 'phone' && !PHONE_PATTERN.test(value)) {
    return 'Enter a valid phone number.'
  }
  if (isTemporalType(field.type) && !isTemporalValue(field.type, value)) {
    return 'Enter a valid value.'
  }
  if (isTemporalType(field.type)) {
    const min = field.text?.rangeMin || field.min
    const max = field.text?.rangeMax || field.max
    if ((min && value < min) || (max && value > max)) {
      return 'Enter a value in the allowed range.'
    }
  }
  if (field.type === 'number' || field.type === 'range') {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      return 'Enter a valid number.'
    }
    const min = field.min.trim() === '' ? null : Number(field.min)
    const max = field.max.trim() === '' ? null : Number(field.max)
    if ((min != null && Number.isFinite(min) && numeric < min) || (max != null && Number.isFinite(max) && numeric > max)) {
      return invalidErrorText(field.text) || 'Enter a number in the allowed range.'
    }
  }
  if (field.type === 'url') {
    try {
      const url = new URL(value)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return invalidErrorText(field.text) || 'Enter a valid URL.'
      }
    }
    catch {
      return invalidErrorText(field.text) || 'Enter a valid URL.'
    }
  }
  if (field.type === 'color' && !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return invalidErrorText(field.text) || 'Choose a color.'
  }
  if (field.type === 'rating') {
    const allowed = new Set(field.text?.ratingOptions.map(item => item.value) ?? [])
    if (allowed.size > 0 && !allowed.has(value)) {
      return invalidErrorText(field.text) || 'Choose a rating.'
    }
  }
  return null
}

function choiceFieldError(field: FormField, raw: unknown): string | null {
  const listed = field.text ? listedChoiceOptions(field.text) : []
  const options = listed.length
    ? listed
    : field.options.map(item => ({
        id: item.value,
        image: null,
        label: item.label,
        value: item.value,
        checked: false,
        required: false,
        disabled: false,
      }))
  const allowed = new Set(options.filter(item => !item.disabled).map(item => item.value))
  const submitted = asList(raw)
  if (submitted.some(value => !allowed.has(value))) {
    return 'Choose a valid option.'
  }
  const multiple = field.type === 'checkbox'
    || (field.type === 'image_select' && field.text?.allowMultiple)
    || (field.type === 'select' && field.text?.selectMultiple.enabled)
  if (!multiple && submitted.length > 1) {
    return 'Choose a valid option.'
  }
  for (const option of options) {
    if (option.required && !submitted.includes(option.value)) {
      return customErrorText(field.text) || 'This field is required.'
    }
  }
  if ((field.required || field.text?.required.enabled) && submitted.length === 0) {
    return customErrorText(field.text) || 'This field is required.'
  }
  if (field.type === 'select' && field.text?.selectMultiple.enabled) {
    const minimum = field.text.selectMultiple.minimum
    const maximum = field.text.selectMultiple.maximum
    if (minimum.value != null && minimum.value > 0 && submitted.length < minimum.value) {
      return selectLimitMessage(minimum, '${minimum}', minimum.value, 'Select at least ${minimum} option(s)')
    }
    if (maximum.value != null && maximum.value > 0 && submitted.length > maximum.value) {
      return selectLimitMessage(maximum, '${maximum}', maximum.value, 'Select at least ${maximum} option(s)')
    }
  }
  if (field.type === 'image_select' && field.text?.allowMultiple) {
    const min = field.text.choiceMin
    const max = field.text.choiceMax
    if (min != null && submitted.length < min) {
      return `Select at least ${min} option(s).`
    }
    if (max != null && submitted.length > max) {
      return `Select at most ${max} option(s).`
    }
  }
  if (field.type === 'checkbox' && field.text) {
    const minimum = field.text.choiceMinimum
    const maximum = field.text.choiceMaximum
    if (minimum.value != null && minimum.value > 0 && submitted.length < minimum.value) {
      return boundMessage(minimum, minimum.value, 'minimum')
    }
    if (maximum.value != null && maximum.value > 0 && submitted.length > maximum.value) {
      return boundMessage(maximum, maximum.value, 'maximum')
    }
  }
  return null
}

function boundMessage(limit: { showError: boolean, customError: boolean, errorText: string }, count: number, key: 'minimum' | 'maximum'): string {
  if (limit.showError && limit.customError && limit.errorText.trim()) {
    return limit.errorText
      .replaceAll('${minimum}', String(count))
      .replaceAll('${field.maximum}', String(count))
  }
  return key === 'minimum'
    ? `Select at least ${count} option(s).`
    : `Please, select no more than ${count} option(s).`
}

function allowedChoices(field: FormField, values: string[]): string[] {
  const allowed = new Set(field.options.map(option => option.value))
  return values.filter(value => allowed.has(value))
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }
  return []
}

function fileList(file: UploadedFile | UploadedFile[] | null): UploadedFile[] {
  if (!file) {
    return []
  }
  const list = Array.isArray(file) ? file : [file]
  return list.filter(item => item && item.size > 0)
}

function fileFieldError(field: FormField, file: UploadedFile | UploadedFile[] | null, maxFileBytes: number): string | null {
  const list = fileList(file)
  const options = field.text
  const required = options ? options.required.enabled : field.required
  if (!list.length) {
    return required ? (customErrorText(options) || 'Choose a file.') : null
  }
  if (options?.fileMultiple.enabled) {
    const minimum = options.fileMultiple.minimum
    const maximum = options.fileMultiple.maximum
    if (minimum.value != null && list.length < minimum.value) {
      return limitMessage(minimum, `Select at least ${minimum.value} files.`)
    }
    if (maximum.value != null && list.length > maximum.value) {
      return limitMessage(maximum, `Select at most ${maximum.value} files.`)
    }
  }
  else if (list.length > 1) {
    return options?.fileExistMessage || 'A file already exists'
  }
  const accept = fileAccept(options?.fileType || '') || field.accept
  if (accept && list.some(item => !extensionAllowed(item.name, accept))) {
    return 'This file type is not allowed.'
  }
  const limitMb = options?.maxUpload.enabled ? options.maxUpload.size : null
  const limitBytes = limitMb != null && Number.isFinite(limitMb) ? limitMb * 1024 * 1024 : null
  const total = list.reduce((sum, item) => sum + item.size, 0)
  const overField = limitBytes != null && (options?.maxUpload.total ? total > limitBytes : list.some(item => item.size > limitBytes))
  const overServer = list.some(item => item.size > maxFileBytes)
  if (overField || overServer) {
    return uploadSizeMessage(options, limitMb)
  }
  return null
}

function selectLimitMessage(limit: { showError: boolean, customError: boolean, errorText: string }, token: string, count: number, fallback: string): string {
  const template = limit.showError && limit.customError && limit.errorText.trim() ? limit.errorText : fallback
  return template.replaceAll(token, String(count))
}

function limitMessage(limit: { showError: boolean, customError: boolean, errorText: string }, fallback: string): string {
  if (limit.showError && limit.customError && limit.errorText.trim()) {
    return limit.errorText.trim()
  }
  return fallback
}

function uploadSizeMessage(options: FormField['text'], sizeMb: number | null): string {
  const size = sizeMb == null ? '' : String(sizeMb)
  const fallback = size ? `Maximum file size exceeded. (Max: ${size}MB)` : 'File is too large.'
  if (options?.maxUpload.showError && options.maxUpload.customError && options.maxUpload.errorText.trim()) {
    return options.maxUpload.errorText.replaceAll('${maximum_size}', size)
  }
  return fallback
}

function extensionAllowed(name: string, accept: string): boolean {
  const ext = name.includes('.') ? `.${name.split('.').pop()!.toLowerCase()}` : ''
  const allowed = accept.split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
  return !!ext && allowed.includes(ext)
}

function isTemporalValue(type: string, value: string): boolean {
  if (type === 'date') {
    return isValidDate(value)
  }
  if (type === 'time') {
    return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)
  }
  if (type === 'datetime') {
    const [date, time] = value.split('T')
    return !!date && !!time && isValidDate(date) && /^([01]\d|2[0-3]):[0-5]\d/.test(time)
  }
  if (type === 'week') {
    return /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(value)
  }
  if (type === 'month') {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
  }
  return true
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return false
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function sanitizeHtml(html: string): string {
  return stripScripts(html)
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

function stripScripts(html: string): string {
  const lower = html.toLowerCase()
  let result = ''
  let index = 0
  while (index < html.length) {
    const start = lower.indexOf('<script', index)
    if (start < 0) {
      return result + html.slice(index)
    }
    const end = lower.indexOf('</script>', start + 7)
    result += html.slice(index, start)
    if (end < 0) {
      return result + html.slice(start)
    }
    index = end + '</script>'.length
  }
  return result
}

function cleanText(value: string): string {
  return value.replace(/\0/g, '').slice(0, MAX_TEXT)
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\0/g, '').slice(0, max) : ''
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, Math.round(value)))
}

function indexToMove(items: LayoutItem[], i: number, j: number, preferredId?: string): number {
  if (items[i]?.fieldId === preferredId) {
    return j
  }
  if (items[j]?.fieldId === preferredId) {
    return i
  }
  const a = items[i]
  const b = items[j]
  if (!a || !b) {
    return j
  }
  if (a.y !== b.y) {
    return a.y > b.y ? i : j
  }
  return a.x >= b.x ? i : j
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
