import type { SelectChoice } from '@miraicms/core'

export type AsteriskPosition = 'left' | 'before' | 'after' | 'right'
export type FormInputMode = '' | 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'

export interface FormIcon {
  url: string
  id?: number
  alt?: string
}

export interface FormMarkedText {
  enabled: boolean
  text: string
  prefix: FormIcon | null
  suffix: FormIcon | null
}

export interface FormRequiredOptions {
  enabled: boolean
  showError: boolean
  customError: boolean
  errorText: string
  errorPrefix: FormIcon | null
  errorSuffix: FormIcon | null
  showAsterisk: boolean
  asteriskPosition: AsteriskPosition
}

export interface FormSuggestion {
  id: string
  label: string
  value: string
}

export interface FormInvalidError {
  enabled: boolean
  showError: boolean
  customError: boolean
  errorText: string
  errorPrefix: FormIcon | null
  errorSuffix: FormIcon | null
}

export interface FormConfirmField {
  enabled: boolean
  label: FormMarkedText
  placeholder: string
  helper: FormMarkedText
  placement: 'below' | 'inline'
}

export interface FormPasswordRules {
  digit: boolean
  lowercase: boolean
  uppercase: boolean
  special: boolean
  limitLength: boolean
  min: number | null
  max: number | null
}

export interface FormTextOptions {
  label: FormMarkedText
  required: FormRequiredOptions
  subtitle: FormMarkedText
  placeholder: string
  defaultValue: string
  prefix: FormIcon | null
  suffix: FormIcon | null
  helper: FormMarkedText
  minLength: number | null
  maxLength: number | null
  minWords: number | null
  maxWords: number | null
  suggestions: FormSuggestion[]
  autocomplete: string
  inputMode: FormInputMode
  mask: string
  pattern: string
  patternFlags: string
  readOnly: boolean
  hidden: boolean
  disabled: boolean
  confirm: FormConfirmField
  invalid: FormInvalidError
  valueMin: number | null
  valueMax: number | null
  showPassword: boolean
  passwordRules: FormPasswordRules
}

export interface PatternPreset {
  id: string
  label: string
  expression: string
}

export const PATTERN_PRESETS: PatternPreset[] = [
  { id: 'characters', label: 'Only Characters', expression: '^[a-zA-Z]+$' },
  { id: 'digits', label: 'Only Digits', expression: '^[0-9]+(^[.])?$' },
  { id: 'name', label: 'Name', expression: '^[a-zA-Z .]+$' },
  { id: 'username', label: 'Username', expression: '^[a-z0-9_.]+$' },
  { id: 'characters-limit', label: 'Character Limit', expression: '^.{0,100}$' },
  { id: 'words-limit', label: 'Word Limit', expression: '^(?:\\b\\w+\\b[\\s\\r\\n]*){1,30}$' },
  { id: 'gmail', label: 'Only Gmail', expression: '^[a-z0-9](\\.?[a-z0-9]){0,}@(gmail)\\.com$' },
]

export const AUTOCOMPLETE_CHOICES: SelectChoice[] = [
  { val: 'off', lbl: 'Off' },
  { val: 'on', lbl: 'On' },
  {
    type: 'group',
    title: 'Name',
    childs: [
      { val: 'name', lbl: 'Name' },
      { val: 'honorific-prefix', lbl: 'Honorific prefix' },
      { val: 'given-name', lbl: 'Given name' },
      { val: 'additional-name', lbl: 'Additional name' },
      { val: 'family-name', lbl: 'Family name' },
      { val: 'honorific-suffix', lbl: 'Honorific suffix' },
      { val: 'nickname', lbl: 'Nickname' },
      { val: 'email', lbl: 'Email' },
      { val: 'username', lbl: 'Username' },
      { val: 'new-password', lbl: 'New password' },
      { val: 'current-password', lbl: 'Current password' },
      { val: 'one-time-code', lbl: 'One time code' },
      { val: 'organization-title', lbl: 'Organization title' },
      { val: 'organization', lbl: 'Organization' },
      { val: 'street-address', lbl: 'Street address' },
      { val: 'address-line1', lbl: 'Address line 1' },
      { val: 'country', lbl: 'Country' },
      { val: 'country-name', lbl: 'Country name' },
      { val: 'postal-code', lbl: 'Postal code' },
      { val: 'cc-name', lbl: 'Cc name' },
      { val: 'cc-given-name', lbl: 'Cc given name' },
      { val: 'cc-additional-name', lbl: 'Cc additional name' },
      { val: 'cc-family-name', lbl: 'Cc family name' },
      { val: 'cc-number', lbl: 'Cc number' },
      { val: 'cc-exp', lbl: 'Cc exp' },
      { val: 'cc-exp-month', lbl: 'Cc exp month' },
      { val: 'cc-exp-year', lbl: 'Cc exp year' },
      { val: 'cc-csc', lbl: 'Cc csc' },
      { val: 'cc-type', lbl: 'Cc type' },
      { val: 'transaction-currency', lbl: 'Transaction currency' },
      { val: 'transaction-amount', lbl: 'Transaction account' },
      { val: 'language', lbl: 'Language' },
    ],
  },
  {
    type: 'group',
    title: 'Birth date',
    childs: [
      { val: 'bday', lbl: 'Birth day' },
      { val: 'bday-day', lbl: 'Bday day' },
      { val: 'bday-month', lbl: 'Bday month' },
      { val: 'bday-year', lbl: 'Bday year' },
      { val: 'sex', lbl: 'Sex' },
    ],
  },
  {
    type: 'group',
    title: 'Telephone',
    childs: [
      { val: 'tel', lbl: 'Telephone' },
      { val: 'tel-national', lbl: 'Tel national' },
      { val: 'tel-country-code', lbl: 'Tel country code' },
      { val: 'tel-area-code', lbl: 'Tel area code' },
      { val: 'tel-local', lbl: 'Tel local' },
      { val: 'tel-extension', lbl: 'Tel extension' },
      { val: 'impp', lbl: 'Impp' },
      { val: 'url', lbl: 'URL' },
      { val: 'photo', lbl: 'Photo' },
    ],
  },
]

export const INPUT_MODE_CHOICES: SelectChoice[] = [
  { val: 'none', lbl: 'none' },
  { val: 'text', lbl: 'text' },
  { val: 'decimal', lbl: 'decimal' },
  { val: 'numeric', lbl: 'numeric' },
  { val: 'tel', lbl: 'tel' },
  { val: 'search', lbl: 'search' },
  { val: 'email', lbl: 'email' },
  { val: 'url', lbl: 'url' },
]

const ASTERISK_POSITIONS = new Set<AsteriskPosition>(['left', 'before', 'after', 'right'])
const INPUT_MODES = new Set<FormInputMode>(['', 'none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'])

export function emptyMarkedText(text = ''): FormMarkedText {
  return { enabled: false, text, prefix: null, suffix: null }
}

export function defaultTextOptions(label = ''): FormTextOptions {
  return {
    label: { enabled: true, text: label, prefix: null, suffix: null },
    required: {
      enabled: false,
      showError: true,
      customError: false,
      errorText: '',
      errorPrefix: null,
      errorSuffix: null,
      showAsterisk: true,
      asteriskPosition: 'after',
    },
    subtitle: emptyMarkedText(),
    placeholder: '',
    defaultValue: '',
    prefix: null,
    suffix: null,
    helper: emptyMarkedText(),
    minLength: null,
    maxLength: null,
    minWords: null,
    maxWords: null,
    suggestions: [],
    autocomplete: 'off',
    inputMode: 'text',
    mask: '',
    pattern: '',
    patternFlags: '',
    readOnly: false,
    hidden: false,
    disabled: false,
    confirm: defaultConfirmField(),
    invalid: defaultInvalidError(),
    valueMin: null,
    valueMax: null,
    showPassword: false,
    passwordRules: {
      digit: false,
      lowercase: false,
      uppercase: false,
      special: false,
      limitLength: false,
      min: 8,
      max: 32,
    },
  }
}

function defaultConfirmField(): FormConfirmField {
  return {
    enabled: false,
    label: emptyMarkedText(),
    placeholder: '',
    helper: emptyMarkedText(),
    placement: 'below',
  }
}

function defaultInvalidError(): FormInvalidError {
  return {
    enabled: false,
    showError: true,
    customError: false,
    errorText: '',
    errorPrefix: null,
    errorSuffix: null,
  }
}

const RICH_FIELD_TYPES = new Set(['text', 'textarea', 'email', 'number', 'password'])

const FIELD_OPTIONS: Record<string, number[]> = {
  text: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  textarea: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  email: [1, 2, 3, 4, 5, 6, 7, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20],
  number: [1, 2, 3, 4, 5, 6, 7, 9, 10, 13, 14, 15, 16, 17, 18, 20, 21],
  password: [1, 2, 3, 4, 6, 7, 13, 14, 15, 16, 17, 18, 22, 23, 24],
}

export function isRichFieldType(type: string): boolean {
  return RICH_FIELD_TYPES.has(type)
}

export function fieldHasOption(type: string, id: number): boolean {
  return FIELD_OPTIONS[type]?.includes(id) ?? false
}

export function iconUrl(icon: FormIcon | null | undefined): string {
  return icon?.url?.trim() || ''
}

export function applyInputMask(value: string, mask: string): string {
  if (!mask) {
    return value
  }
  let output = ''
  let index = 0
  for (const token of mask) {
    if (index >= value.length) {
      break
    }
    if (token === '9' || token === 'a' || token === '*') {
      const char = value[index] ?? ''
      const ok = token === '*'
        || (token === '9' && /\d/.test(char))
        || (token === 'a' && /[a-z]/i.test(char))
      if (!ok) {
        index += 1
        continue
      }
      output += char
      index += 1
      continue
    }
    output += token
    if (value[index] === token) {
      index += 1
    }
  }
  return output
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function optionalCount(value: unknown): number | null {
  const number = optionalNumber(value)
  if (number == null || number < 0) {
    return null
  }
  return Math.min(100000, Math.floor(number))
}

export function normalizeIcon(raw: unknown): FormIcon | null {
  if (!isRecord(raw)) {
    return null
  }
  const url = clip(raw.url, 2000)
  if (!url) {
    return null
  }
  const icon: FormIcon = { url }
  if (typeof raw.id === 'number' && Number.isFinite(raw.id)) {
    icon.id = raw.id
  }
  const alt = clip(raw.alt, 200)
  if (alt) {
    icon.alt = alt
  }
  return icon
}

function normalizeMarked(raw: unknown, fallbackText = ''): FormMarkedText {
  const source = isRecord(raw) ? raw : {}
  return {
    enabled: source.enabled === true,
    text: clip(source.text, 400) || fallbackText,
    prefix: normalizeIcon(source.prefix),
    suffix: normalizeIcon(source.suffix),
  }
}

export function normalizeTextOptions(raw: unknown, fallback: { label?: string, placeholder?: string, help?: string, required?: boolean, value?: string, min?: string, max?: string } = {}): FormTextOptions {
  if (!isRecord(raw)) {
    const options = defaultTextOptions(fallback.label || '')
    options.placeholder = clip(fallback.placeholder, 200)
    options.defaultValue = clip(fallback.value, 20000)
    options.required.enabled = fallback.required === true
    if (fallback.help) {
      options.helper = { enabled: true, text: clip(fallback.help, 400), prefix: null, suffix: null }
    }
    return options
  }
  const source = raw
  const defaults = defaultTextOptions(fallback.label || '')
  const required = isRecord(source.required) ? source.required : {}
  const position = required.asteriskPosition
  const inputMode = source.inputMode
  return {
    label: normalizeMarked(source.label, fallback.label || ''),
    required: {
      enabled: required.enabled === true,
      showError: required.showError !== false,
      customError: required.customError === true,
      errorText: clip(required.errorText, 400),
      errorPrefix: normalizeIcon(required.errorPrefix),
      errorSuffix: normalizeIcon(required.errorSuffix),
      showAsterisk: required.showAsterisk !== false,
      asteriskPosition: typeof position === 'string' && ASTERISK_POSITIONS.has(position as AsteriskPosition)
        ? position as AsteriskPosition
        : 'after',
    },
    subtitle: normalizeMarked(source.subtitle),
    placeholder: source.placeholder == null ? clip(fallback.placeholder, 200) : clip(source.placeholder, 200),
    defaultValue: source.defaultValue == null ? clip(fallback.value, 20000) : clip(source.defaultValue, 20000),
    prefix: normalizeIcon(source.prefix),
    suffix: normalizeIcon(source.suffix),
    helper: normalizeMarked(source.helper, fallback.help || ''),
    minLength: optionalCount(source.minLength),
    maxLength: optionalCount(source.maxLength),
    minWords: optionalCount(source.minWords),
    maxWords: optionalCount(source.maxWords),
    suggestions: normalizeSuggestions(source.suggestions),
    autocomplete: clip(source.autocomplete, 40) || defaults.autocomplete,
    inputMode: typeof inputMode === 'string' && INPUT_MODES.has(inputMode as FormInputMode) ? inputMode as FormInputMode : defaults.inputMode,
    mask: clip(source.mask, 200),
    pattern: clip(source.pattern, 500),
    patternFlags: clip(source.patternFlags, 12).replace(/[^gimsuy]/g, ''),
    readOnly: source.readOnly === true,
    hidden: source.hidden === true,
    disabled: source.disabled === true,
    confirm: normalizeConfirm(source.confirm),
    invalid: normalizeInvalid(source.invalid),
    valueMin: source.valueMin == null ? optionalNumber(fallback.min) : optionalNumber(source.valueMin),
    valueMax: source.valueMax == null ? optionalNumber(fallback.max) : optionalNumber(source.valueMax),
    showPassword: source.showPassword === true,
    passwordRules: normalizePasswordRules(source.passwordRules),
  }
}

function normalizeConfirm(raw: unknown): FormConfirmField {
  const source = isRecord(raw) ? raw : {}
  const placement = source.placement === 'inline' ? 'inline' : 'below'
  return {
    enabled: source.enabled === true,
    label: normalizeMarked(source.label),
    placeholder: clip(source.placeholder, 200),
    helper: normalizeMarked(source.helper),
    placement,
  }
}

function normalizeInvalid(raw: unknown): FormInvalidError {
  const source = isRecord(raw) ? raw : {}
  return {
    enabled: source.enabled === true,
    showError: source.showError !== false,
    customError: source.customError === true,
    errorText: clip(source.errorText, 400),
    errorPrefix: normalizeIcon(source.errorPrefix),
    errorSuffix: normalizeIcon(source.errorSuffix),
  }
}

function normalizePasswordRules(raw: unknown): FormPasswordRules {
  const source = isRecord(raw) ? raw : {}
  return {
    digit: source.digit === true,
    lowercase: source.lowercase === true,
    uppercase: source.uppercase === true,
    special: source.special === true,
    limitLength: source.limitLength === true,
    min: optionalCount(source.min) ?? 8,
    max: optionalCount(source.max) ?? 32,
  }
}

const PASSWORD_SPECIAL = /[~!@#$%^&*(){}[\]<>+\-_=\\/|;:,.]/

export interface PasswordRuleState {
  ok: boolean
  label: string
}

export function passwordRuleStates(options: FormTextOptions, value: string): PasswordRuleState[] {
  const rules = options.passwordRules
  const states: PasswordRuleState[] = []
  if (rules.digit) {
    states.push({ ok: /[0-9]/.test(value), label: 'One number' })
  }
  if (rules.lowercase) {
    states.push({ ok: /[a-z]/.test(value), label: 'One lowercase character' })
  }
  if (rules.uppercase) {
    states.push({ ok: /[A-Z]/.test(value), label: 'One uppercase character' })
  }
  if (rules.special) {
    states.push({ ok: PASSWORD_SPECIAL.test(value), label: 'One special character' })
  }
  if (rules.limitLength) {
    const min = rules.min ?? 8
    const max = rules.max ?? 32
    states.push({
      ok: value.length >= min && value.length <= max,
      label: `${min} to ${max} characters`,
    })
  }
  return states
}

export function invalidErrorText(options: FormTextOptions | undefined): string {
  if (options?.invalid.enabled && options.invalid.showError && options.invalid.customError && options.invalid.errorText.trim()) {
    return options.invalid.errorText.trim()
  }
  return ''
}

function normalizeSuggestions(raw: unknown): FormSuggestion[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const suggestions: FormSuggestion[] = []
  for (const item of raw.slice(0, 100)) {
    if (!isRecord(item)) {
      continue
    }
    const label = clip(item.label, 200)
    const value = clip(item.value, 200)
    if (!label && !value) {
      continue
    }
    suggestions.push({
      id: clip(item.id, 80) || `sg_${crypto.randomUUID()}`,
      label,
      value,
    })
  }
  return suggestions
}

function wordCount(value: string): number {
  const words = value.trim().match(/\S+/g)
  return words?.length ?? 0
}

export function textConstraintError(options: FormTextOptions, value: string): string | null {
  if (options.minLength != null && value.length < options.minLength) {
    return `Enter at least ${options.minLength} characters.`
  }
  if (options.maxLength != null && value.length > options.maxLength) {
    return `Enter at most ${options.maxLength} characters.`
  }
  const words = wordCount(value)
  if (options.minWords != null && words < options.minWords) {
    return `Enter at least ${options.minWords} words.`
  }
  if (options.maxWords != null && words > options.maxWords) {
    return `Enter at most ${options.maxWords} words.`
  }
  if (options.pattern) {
    try {
      const expression = new RegExp(options.pattern, options.patternFlags)
      if (!expression.test(value)) {
        return 'Enter a value in the required format.'
      }
    }
    catch {
      return null
    }
  }
  return null
}

export function customErrorText(options: FormTextOptions | undefined): string {
  if (options?.required.customError && options.required.errorText.trim()) {
    return options.required.errorText.trim()
  }
  return ''
}
