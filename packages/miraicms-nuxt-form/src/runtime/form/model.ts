import type { FormTextOptions } from './text-options.ts'
import { customErrorText, defaultTextOptions, normalizeTextOptions, textConstraintError } from './text-options.ts'

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
  'select',
  'radio',
  'checkbox',
  'date',
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
  select: 'Select',
  radio: 'Radio',
  checkbox: 'Checkbox',
  date: 'Date',
  file: 'File',
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

const CHOICE_TYPES = new Set<FieldType>(['select', 'radio', 'checkbox'])
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
  return { fieldId: item.fieldId, x, y, w }
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

export function defaultWidth(type: FieldType, breakpoint: Breakpoint): number {
  if (breakpoint !== baseBreakpoint()) {
    return GRID_COLUMNS
  }
  if (type === 'button') {
    return 15
  }
  if (type === 'html' || type === 'textarea' || type === 'checkbox' || type === 'radio') {
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
    const copy: FormField = structuredClone(field)
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
  files: Record<string, UploadedFile | null>,
  maxFileBytes: number,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of content.fields) {
    const message = fieldError(field, input[field.key], files[field.key] ?? null, maxFileBytes)
    if (message) {
      errors[field.key] = message
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
  return field.type !== 'html' && field.type !== 'button'
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
    buttonLabel: type === 'button' ? 'Submit' : '',
    accept: '',
    rows: 4,
    min: '',
    max: '',
    step: '',
    text: type === 'text' || type === 'textarea' ? defaultTextOptions(FIELD_LABELS[type]) : undefined,
  }
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
  const options = CHOICE_TYPES.has(type) ? normalizeOptions(raw.options) : []
  const text = type === 'text' || type === 'textarea'
    ? normalizeTextOptions(raw.text, {
        label: clip(raw.label, 200) || FIELD_LABELS[type],
        placeholder: clip(raw.placeholder, 200),
        help: clip(raw.help, 400),
        required: raw.required === true,
        value: clip(raw.value, 20000),
      })
    : undefined
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
    buttonLabel: type === 'button' ? (clip(raw.buttonLabel, 80) || 'Submit') : '',
    accept: type === 'file' ? clip(raw.accept, 200) : '',
    rows: type === 'textarea' ? clampInt(Number(raw.rows) || 4, 2, 20) : 4,
    min: type === 'number' ? clip(raw.min, 40) : '',
    max: type === 'number' ? clip(raw.max, 40) : '',
    step: type === 'number' ? clip(raw.step, 40) : '',
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

function fieldError(field: FormField, raw: unknown, file: UploadedFile | null, maxFileBytes: number): string | null {
  if (field.type === 'html' || field.type === 'button' || field.type === 'hidden') {
    return null
  }
  if (field.type === 'file') {
    if (!file || file.size < 1) {
      return field.required ? 'Choose a file.' : null
    }
    if (file.size > maxFileBytes) {
      return 'File is too large.'
    }
    return null
  }
  if (field.type === 'checkbox') {
    const selected = allowedChoices(field, asList(raw))
    const submitted = asList(raw)
    if (submitted.length !== selected.length) {
      return 'Choose a valid option.'
    }
    if (field.required && selected.length === 0) {
      return 'This field is required.'
    }
    return null
  }
  const value = cleanText(typeof raw === 'string' ? raw : raw == null ? '' : String(raw)).trim()
  if (!value) {
    if (!field.required) {
      return null
    }
    return customErrorText(field.text) || 'This field is required.'
  }
  if (field.text && (field.type === 'text' || field.type === 'textarea')) {
    const constraint = textConstraintError(field.text, value)
    if (constraint) {
      return customErrorText(field.text) || constraint
    }
  }
  if (field.type === 'email' && !EMAIL_PATTERN.test(value)) {
    return 'Enter a valid email address.'
  }
  if (field.type === 'phone' && !PHONE_PATTERN.test(value)) {
    return 'Enter a valid phone number.'
  }
  if (field.type === 'date' && !isValidDate(value)) {
    return 'Enter a valid date.'
  }
  if (field.type === 'number') {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      return 'Enter a valid number.'
    }
    const min = field.min.trim() === '' ? null : Number(field.min)
    const max = field.max.trim() === '' ? null : Number(field.max)
    if ((min != null && Number.isFinite(min) && numeric < min) || (max != null && Number.isFinite(max) && numeric > max)) {
      return 'Enter a number in the allowed range.'
    }
  }
  if ((field.type === 'select' || field.type === 'radio') && !field.options.some(option => option.value === value)) {
    return 'Choose a valid option.'
  }
  return null
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
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
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
