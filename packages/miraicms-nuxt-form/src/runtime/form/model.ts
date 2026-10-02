export const GRID_COLUMNS = 60
export const ROW_HEIGHT = 72
export const MAX_FIELDS = 200
export const MAX_TEXT = 20000

export const BREAKPOINTS = ['desktop', 'tablet', 'phone'] as const
export type Breakpoint = typeof BREAKPOINTS[number]

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
  textarea: 'Textarea',
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

export interface FormField {
  id: string
  type: FieldType
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
}

export interface LayoutItem {
  fieldId: string
  x: number
  y: number
  w: number
}

export interface FormContent {
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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
    .replace(/[\u0300-\u036f]/g, '')
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
  if (breakpoint !== 'desktop') {
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
  return addField({
    fields: [],
    layouts: { desktop: [], tablet: [], phone: [] },
  }, 'button')
}

export function addField(content: FormContent, type: FieldType): FormContent {
  if (content.fields.length >= MAX_FIELDS) {
    return content
  }
  const field = createField(type, content.fields)
  const layouts = { ...content.layouts }
  for (const breakpoint of BREAKPOINTS) {
    layouts[breakpoint] = placeField(content.layouts[breakpoint], field.id, defaultWidth(type, breakpoint))
  }
  return { fields: [...content.fields, field], layouts }
}

export function removeField(content: FormContent, fieldId: string): FormContent {
  return {
    fields: content.fields.filter(field => field.id !== fieldId),
    layouts: {
      desktop: content.layouts.desktop.filter(item => item.fieldId !== fieldId),
      tablet: content.layouts.tablet.filter(item => item.fieldId !== fieldId),
      phone: content.layouts.phone.filter(item => item.fieldId !== fieldId),
    },
  }
}

export function replaceField(content: FormContent, field: FormField): FormContent {
  return {
    ...content,
    fields: content.fields.map(current => current.id === field.id ? field : current),
  }
}

export function setLayoutItem(content: FormContent, breakpoint: Breakpoint, item: LayoutItem, resolve = true): FormContent {
  const items = content.layouts[breakpoint].map(current => current.fieldId === item.fieldId ? clampItem(item) : current)
  return {
    ...content,
    layouts: {
      ...content.layouts,
      [breakpoint]: resolve ? resolveLayout(items, item.fieldId) : items,
    },
  }
}

export function copyDesktopLayout(content: FormContent, breakpoint: Breakpoint): FormContent {
  if (breakpoint === 'desktop') {
    return content
  }
  return {
    ...content,
    layouts: {
      ...content.layouts,
      [breakpoint]: resolveLayout(content.layouts.desktop.map(item => ({ ...item }))),
    },
  }
}

export function normalizeFormContent(input: unknown): FormContent {
  const source = isRecord(input) ? input : {}
  const rawFields = Array.isArray(source.fields) ? source.fields : []
  const fields: FormField[] = []
  for (const raw of rawFields.slice(0, MAX_FIELDS)) {
    const field = normalizeField(raw, fields)
    if (field) {
      fields.push(field)
    }
  }
  const rawLayouts = isRecord(source.layouts) ? source.layouts : {}
  const layouts = {} as FormContent['layouts']
  for (const breakpoint of BREAKPOINTS) {
    const rawItems = Array.isArray(rawLayouts[breakpoint]) ? rawLayouts[breakpoint] : []
    let placed: LayoutItem[] = []
    for (const field of fields) {
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
    layouts[breakpoint] = placed
  }
  return { fields, layouts }
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

function createField(type: FieldType, existing: FormField[]): FormField {
  const key = uniqueKey(type, existing)
  return {
    id: `f_${crypto.randomUUID()}`,
    type,
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
  }
}

function normalizeField(raw: unknown, existing: FormField[]): FormField | null {
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
  return {
    id,
    type,
    key,
    label: clip(raw.label, 200) || FIELD_LABELS[type],
    placeholder: clip(raw.placeholder, 200),
    help: clip(raw.help, 400),
    required: type !== 'html' && type !== 'button' && type !== 'hidden' && raw.required === true,
    options,
    html: type === 'html' ? sanitizeHtml(clip(raw.html, 50000)) : '',
    value: type === 'hidden' ? clip(raw.value, 2000) : '',
    buttonLabel: type === 'button' ? (clip(raw.buttonLabel, 80) || 'Submit') : '',
    accept: type === 'file' ? clip(raw.accept, 200) : '',
    rows: type === 'textarea' ? clampInt(Number(raw.rows) || 4, 2, 20) : 4,
    min: type === 'number' ? clip(raw.min, 40) : '',
    max: type === 'number' ? clip(raw.max, 40) : '',
    step: type === 'number' ? clip(raw.step, 40) : '',
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
    return field.required ? 'This field is required.' : null
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
  return value.replace(/\u0000/g, '').slice(0, MAX_TEXT)
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\u0000/g, '').slice(0, max) : ''
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
