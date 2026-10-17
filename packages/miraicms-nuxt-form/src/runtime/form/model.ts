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
}

export interface LayoutItem {
  fieldId: string
  x: number
  y: number
  w: number
  h?: number
}

export interface FormContent {
  steps: FormStep[]
  stepHeader: FormStepHeader
  fields: FormField[]
  layouts: Record<Breakpoint, LayoutItem[]>
}

export type FormStatus = 'draft' | 'published'

export interface FormRecord {
  id: number
  name: string
  slug: string
  status: FormStatus
  content: FormContent
  createdAt: string
  updatedAt: string
}

export interface FormListItem {
  id: number
  name: string
  slug: string
  status: FormStatus
  fieldCount: number
  updatedAt: string
}

export interface PublicForm {
  name: string
  slug: string
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
const SLUG_PATTERN = /^[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+().\-\s]{3,40}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && (FIELD_TYPES as readonly string[]).includes(value)
}

export function isSlug(value: string): boolean {
  return value.length > 0 && value.length <= 80 && SLUG_PATTERN.test(value)
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
  if (breakpoint !== baseBreakpoint()) {
    return GRID_COLUMNS
  }
  if (type === 'button') {
    return 15
  }
  if (type === 'html' || type === 'textarea' || type === 'checkbox' || type === 'radio' || type === 'title' || type === 'divider' || type === 'spacer') {
    return GRID_COLUMNS
  }
  return 30
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
  const layouts = { ...content.layouts }
  for (const breakpoint of formBreakpoints()) {
    const current = content.layouts[breakpoint] ?? []
    const sameStep = current.filter(item => stepIdOf(content, item.fieldId) === target)
    const otherSteps = current.filter(item => stepIdOf(content, item.fieldId) !== target)
    layouts[breakpoint] = [...otherSteps, ...placeField(sameStep, field.id, defaultWidth(type, breakpoint))]
  }
  return { ...content, steps, fields: [...content.fields, field], layouts }
}

export function cloneField(content: FormContent, fieldId: string): FormContent {
  const source = content.fields.find(field => field.id === fieldId)
  if (!source || content.fields.length >= MAX_FIELDS) {
    return content
  }
  const copy = JSON.parse(JSON.stringify(source)) as FormField
  copy.id = `f_${crypto.randomUUID()}`
  copy.key = uniqueKey(source.type, content.fields)
  const index = content.fields.findIndex(field => field.id === fieldId)
  const fields = [
    ...content.fields.slice(0, index + 1),
    copy,
    ...content.fields.slice(index + 1),
  ]
  const layouts = { ...content.layouts }
  for (const breakpoint of formBreakpoints()) {
    const current = content.layouts[breakpoint] ?? []
    const sourceItem = current.find(item => item.fieldId === fieldId)
    const width = sourceItem?.w ?? defaultWidth(source.type, breakpoint)
    const sameStep = current.filter(item => stepIdOf(content, item.fieldId) === source.stepId)
    const otherSteps = current.filter(item => stepIdOf(content, item.fieldId) !== source.stepId)
    layouts[breakpoint] = [...otherSteps, ...placeAfter(sameStep, sourceItem, copy.id, width)]
  }
  return { ...content, fields, layouts }
}

export function moveFieldToStep(content: FormContent, fieldId: string, stepId: string): FormContent {
  const source = content.fields.find(field => field.id === fieldId)
  if (!source || source.stepId === stepId || !content.steps.some(step => step.id === stepId)) {
    return content
  }
  let next: FormContent = {
    ...content,
    fields: content.fields.map(field => field.id === fieldId ? { ...field, stepId } : field),
  }
  for (const breakpoint of formBreakpoints()) {
    const item = next.layouts[breakpoint]?.find(entry => entry.fieldId === fieldId)
    if (item) {
      next = setLayoutItem(next, breakpoint, item, true)
    }
  }
  return next
}

export function removeField(content: FormContent, fieldId: string): FormContent {
  return {
    ...content,
    fields: content.fields.filter(field => field.id !== fieldId),
    layouts: Object.fromEntries(formBreakpoints().map(name => [
      name,
      (content.layouts[name] ?? []).filter(item => item.fieldId !== fieldId),
    ])),
  }
}

export function replaceField(content: FormContent, field: FormField): FormContent {
  return {
    ...content,
    fields: content.fields.map(current => current.id === field.id ? field : current),
  }
}

export function setLayoutItem(content: FormContent, breakpoint: Breakpoint, item: LayoutItem, resolve = true): FormContent {
  const stepId = stepIdOf(content, item.fieldId)
  const all = content.layouts[breakpoint] ?? []
  const sameStep = all.filter(entry => entry.fieldId === item.fieldId || stepIdOf(content, entry.fieldId) === stepId)
  const otherSteps = all.filter(entry => entry.fieldId !== item.fieldId && stepIdOf(content, entry.fieldId) !== stepId)
  const nextSame = sameStep.map(current => current.fieldId === item.fieldId ? clampItem(item) : current)
  return {
    ...content,
    layouts: {
      ...content.layouts,
      [breakpoint]: [...otherSteps, ...(resolve ? resolveLayout(nextSame, item.fieldId) : nextSame)],
    },
  }
}

export function copyDesktopLayout(content: FormContent, breakpoint: Breakpoint): FormContent {
  const source = baseBreakpoint()
  if (breakpoint === source) {
    return content
  }
  const copied = (content.layouts[source] ?? []).map(item => ({ ...item }))
  const next: LayoutItem[] = []
  for (const step of content.steps) {
    next.push(...resolveLayout(copied.filter(item => stepIdOf(content, item.fieldId) === step.id)))
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
  const rawLayouts = isRecord(source.layouts) ? source.layouts : {}
  const layouts = {} as FormContent['layouts']
  for (const breakpoint of formBreakpoints()) {
    const rawItems = Array.isArray(rawLayouts[breakpoint]) ? rawLayouts[breakpoint] : []
    const next: LayoutItem[] = []
    for (const step of steps) {
      let placed: LayoutItem[] = []
      for (const field of fields.filter(entry => entry.stepId === step.id)) {
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
  return { steps, stepHeader: normalizeStepHeader(source.stepHeader), fields, layouts }
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

export function submissionErrors(
  content: FormContent,
  input: Record<string, unknown>,
  files: Record<string, UploadedFile | UploadedFile[] | null>,
  maxFileBytes: number,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of content.fields) {
    const message = fieldError(field, input[field.key], files[field.key] ?? null, maxFileBytes)
    if (message) {
      errors[field.key] = message
      continue
    }
    if (field.text?.confirm.enabled) {
      const rawEntered = input[field.key]
      const rawConfirm = input[`${field.key}__confirm`]
      const entered = cleanText(typeof rawEntered === 'string' ? rawEntered : rawEntered == null ? '' : String(rawEntered)).trim()
      const confirm = cleanText(typeof rawConfirm === 'string' ? rawConfirm : '').trim()
      if (entered !== confirm) {
        errors[field.key] = 'The values do not match.'
      }
    }
  }
  return errors
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
  return field.type !== 'html' && field.type !== 'button' && field.type !== 'title' && field.type !== 'image' && field.type !== 'divider' && field.type !== 'spacer'
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
  if ((field.type === 'select' || field.type === 'radio') && !field.options.some(option => option.value === value)) {
    return 'Choose a valid option.'
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
