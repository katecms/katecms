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

export type RatingPosition = 'left' | 'center' | 'right'
export type ButtonAlign = 'left' | 'center' | 'right'
export type ButtonKind = 'submit' | 'button' | 'reset'
export type FileKind = '' | 'image' | 'audio' | 'video' | 'document' | 'zip' | 'presentation' | 'spreadsheet' | 'database'
export type TemporalType = 'date' | 'time' | 'datetime' | 'week' | 'month'

export type CheckPosition = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right'
export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span' | 'p'
export type LayoutAlign = 'left' | 'center' | 'right'
export type LayoutDirection = 'vertical' | 'vertical-reverse' | 'horizontal' | 'horizontal-reverse'

export interface FormHeading {
  enabled: boolean
  text: string
  tag: HeadingTag
  prefix: FormIcon | null
  suffix: FormIcon | null
}

export interface FormChoiceOption {
  id: string
  image: FormIcon | null
  label: string
  value: string
  checked: boolean
  required: boolean
  disabled: boolean
}

export interface FormChoiceGroup {
  id: string
  label: string
  options: FormChoiceOption[]
}

/** One step in a select option list. Options and groups stay in the order they were added. */
export type FormChoiceEntry =
  | { type: 'option', option: FormChoiceOption }
  | { type: 'group', group: FormChoiceGroup }

export interface FormSelectMultiple {
  enabled: boolean
  minimum: FormFileLimit
  maximum: FormFileLimit
}

export interface FormBoundError {
  value: number | null
  showError: boolean
  customError: boolean
  errorText: string
  errorPrefix: FormIcon | null
  errorSuffix: FormIcon | null
}

export type RepeatButtonPosition = 'top' | 'bottom' | 'left' | 'right'
export type RepeatButtonAlign = 'start' | 'center' | 'end'
export type RepeatButtonView = 'vertical' | 'vertical-reverse' | 'horizontal' | 'horizontal-reverse'

export interface FormRatingOption {
  id: string
  icon: FormIcon | null
  label: string
  value: string
  checked: boolean
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

export interface FormFileLimit {
  value: number | null
  showError: boolean
  customError: boolean
  errorText: string
}

export interface FormFileMultiple {
  enabled: boolean
  minimum: FormFileLimit
  maximum: FormFileLimit
}

export interface FormMaxUpload {
  enabled: boolean
  size: number | null
  total: boolean
  showError: boolean
  customError: boolean
  errorText: string
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
  step: number | null
  ratingIcon: FormIcon | null
  ratingOptions: FormRatingOption[]
  ratingPosition: RatingPosition
  ratingHoverMessage: boolean
  ratingSelectedMessage: boolean
  buttonText: FormMarkedText
  buttonType: ButtonKind
  fullWidth: boolean
  buttonAlign: ButtonAlign
  fileMultiple: FormFileMultiple
  fileType: FileKind
  uploadButtonText: string
  fileSelectStatus: string
  showMaximumSize: string
  maxUpload: FormMaxUpload
  showFilePreview: boolean
  showFileSize: boolean
  fileExistMessage: string
  rangeMin: string
  rangeMax: string
  choiceOptions: FormChoiceOption[]
  allowMultiple: boolean
  choiceMin: number | null
  choiceMax: number | null
  itemSize: number | null
  checkPosition: CheckPosition
  hideImageLabel: boolean
  optionsColumn: number | null
  choiceMinimum: FormBoundError
  choiceMaximum: FormBoundError
  optionIcon: boolean
  choiceGroups: FormChoiceGroup[]
  /** Options shown after every group when `choiceEntries` is not set. */
  choiceAfter: FormChoiceOption[]
  /**
   * Ordered select options and groups.
   * `null` means the list is still `choiceOptions`, then `choiceGroups`, then `choiceAfter`.
   */
  choiceEntries: FormChoiceEntry[] | null
  selectMultiple: FormSelectMultiple
  showSearch: boolean
  searchPlaceholder: string
  searchClearable: boolean
  selectedClearable: boolean
  heading: FormHeading
  subheading: FormHeading
  layoutAlign: LayoutAlign
  layoutDirection: LayoutDirection
  elementImage: FormIcon | null
  imageWidth: number | null
  imageHeight: number | null
  imageAlt: string
  spacerHeight: number | null
  repeatDefault: number | null
  repeatMinimum: FormBoundError
  repeatMaximum: FormBoundError
  repeatButtonPosition: RepeatButtonPosition
  repeatButtonAlign: RepeatButtonAlign
  repeatButtonView: RepeatButtonView
  repeatAdd: FormMarkedText
  repeatRemove: FormMarkedText
  repeatAddEnd: FormMarkedText
  repeatAddEndAlign: RepeatButtonAlign
  decisionLabel: string
  decisionChecked: boolean
  decisionCheckedValue: string
  decisionUncheckedValue: string
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
    step: 1,
    ratingIcon: null,
    ratingOptions: defaultRatingOptions(),
    ratingPosition: 'left',
    ratingHoverMessage: false,
    ratingSelectedMessage: false,
    buttonText: { enabled: true, text: 'Submit', prefix: null, suffix: null },
    buttonType: 'submit',
    fullWidth: false,
    buttonAlign: 'left',
    fileMultiple: {
      enabled: false,
      minimum: emptyFileLimit(),
      maximum: emptyFileLimit(),
    },
    fileType: '',
    uploadButtonText: 'Attach File',
    fileSelectStatus: 'No File Selected',
    showMaximumSize: '',
    maxUpload: {
      enabled: false,
      size: 20,
      total: false,
      showError: true,
      customError: false,
      errorText: 'Maximum file size exceeded. (Max: ${maximum_size}MB)',
    },
    showFilePreview: false,
    showFileSize: false,
    fileExistMessage: 'A file already exists',
    rangeMin: '',
    rangeMax: '',
    choiceOptions: [],
    allowMultiple: false,
    choiceMin: null,
    choiceMax: null,
    itemSize: 200,
    checkPosition: 'top-left',
    hideImageLabel: false,
    optionsColumn: 1,
    choiceMinimum: defaultBoundError('Select at least ${minimum} option(s)'),
    choiceMaximum: defaultBoundError('Please, select no more than ${field.maximum} option(s)'),
    optionIcon: false,
    choiceGroups: [],
    choiceAfter: [],
    choiceEntries: null,
    selectMultiple: {
      enabled: false,
      minimum: { value: null, showError: true, customError: false, errorText: 'Select at least ${minimum} option(s)' },
      maximum: { value: null, showError: true, customError: false, errorText: 'Select at least ${maximum} option(s)' },
    },
    showSearch: false,
    searchPlaceholder: '',
    searchClearable: false,
    selectedClearable: false,
    heading: defaultHeading('Title', 'h2', true),
    subheading: defaultHeading('', 'p', false),
    layoutAlign: 'left',
    layoutDirection: 'vertical',
    elementImage: null,
    imageWidth: null,
    imageHeight: null,
    imageAlt: '',
    spacerHeight: 40,
    repeatDefault: 1,
    repeatMinimum: emptyBoundError(1, 'Add at least ${minimum} row(s)'),
    repeatMaximum: emptyBoundError(null, 'Please add no more than ${maximum} row(s)'),
    repeatButtonPosition: 'bottom',
    repeatButtonAlign: 'start',
    repeatButtonView: 'horizontal',
    repeatAdd: { enabled: true, text: 'Add', prefix: null, suffix: null },
    repeatRemove: { enabled: true, text: 'Remove', prefix: null, suffix: null },
    repeatAddEnd: emptyMarkedText('Add to end'),
    repeatAddEndAlign: 'start',
    decisionLabel: '<p>Decision Box</p>',
    decisionChecked: false,
    decisionCheckedValue: 'Accepted',
    decisionUncheckedValue: 'Rejected',
  }
}

function emptyBoundError(value: number | null, errorText: string): FormBoundError {
  return {
    value,
    showError: true,
    customError: false,
    errorText,
    errorPrefix: null,
    errorSuffix: null,
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

function emptyFileLimit(): FormFileLimit {
  return { value: null, showError: true, customError: false, errorText: '' }
}

function defaultBoundError(errorText: string): FormBoundError {
  return {
    value: null,
    showError: true,
    customError: false,
    errorText,
    errorPrefix: null,
    errorSuffix: null,
  }
}

function defaultHeading(text: string, tag: HeadingTag, enabled: boolean): FormHeading {
  return { enabled, text, tag, prefix: null, suffix: null }
}

export function defaultChoiceOptions(): FormChoiceOption[] {
  return [1, 2].map(index => ({
    id: `opt_${index}`,
    image: null,
    label: `Option ${index}`,
    value: `option_${index}`,
    checked: false,
    required: false,
    disabled: false,
  }))
}

const RICH_FIELD_TYPES = new Set(['text', 'textarea', 'email', 'phone', 'number', 'password', 'range', 'url', 'color', 'rating', 'button', 'file', 'date', 'time', 'datetime', 'week', 'month', 'image_select', 'select', 'radio', 'checkbox', 'decision_box', 'title', 'image', 'divider', 'html', 'spacer', 'repeater', 'section'])

const FIELD_OPTIONS: Record<string, number[]> = {
  text: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  textarea: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  email: [1, 2, 3, 4, 5, 6, 7, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20],
  phone: [1, 2, 3, 4, 5, 7, 13, 20, 14, 15, 17, 18],
  number: [1, 2, 3, 4, 5, 6, 7, 9, 10, 13, 14, 15, 16, 17, 18, 20, 21],
  password: [1, 2, 3, 4, 6, 7, 13, 14, 15, 16, 17, 18, 22, 23, 24],
  range: [1, 2, 3, 21, 25, 5, 7, 15, 17, 16, 18],
  url: [1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 13, 20, 14, 15, 16, 17, 18],
  color: [1, 2, 3, 5, 6, 7, 14, 15, 16, 17, 18],
  rating: [1, 2, 3, 26, 27, 28, 29, 30, 7, 15, 17, 18],
  button: [31, 32, 33, 34, 7, 15, 17, 18],
  file: [1, 2, 3, 35, 36, 37, 6, 7, 38, 39, 40, 41, 42, 15, 17, 18],
  date: [1, 2, 3, 5, 6, 7, 43, 14, 15, 16, 17, 18],
  time: [1, 2, 3, 5, 6, 7, 43, 14, 15, 16, 17, 18],
  datetime: [1, 2, 3, 5, 6, 7, 43, 14, 15, 16, 17, 18],
  week: [1, 2, 3, 5, 6, 7, 43, 14, 15, 16, 17, 18],
  month: [1, 2, 3, 5, 6, 7, 43, 14, 15, 16, 17, 18],
  image_select: [1, 2, 3, 44, 45, 46, 7, 47, 48, 49, 15, 17, 18],
  select: [1, 2, 3, 4, 61, 44, 54, 7, 55, 56, 57, 58, 14, 15, 17, 18],
  radio: [1, 2, 3, 44, 7, 51, 15, 17, 18],
  checkbox: [1, 2, 3, 44, 7, 51, 52, 53, 15, 17, 18],
  decision_box: [76, 2, 77, 78, 79, 15, 17, 18],
  title: [62, 63, 65, 66, 16],
  image: [67, 68, 69, 16],
  divider: [16],
  html: [15],
  spacer: [16],
  repeater: [1, 3, 70, 71, 72, 73, 74, 7, 15, 18],
  section: [1, 3, 7, 16, 15, 18],
}

export const FILE_TYPE_ACCEPT: Record<Exclude<FileKind, ''>, { label: string, accept: string }> = {
  image: { label: 'Images', accept: '.xbm,.tif,.pjp,.pjpeg,.svgz,.jpg,.jpeg,.ico,.tiff,.gif,.svg,.bmp,.png,.jfif,.webp' },
  audio: { label: 'Audios', accept: '.opus,.flac,.webm,.weba,.wav,.ogg,.m4a,.mp3,.oga,.mid,.amr,.aiff,.wma,.au,.acc,.wpl' },
  video: { label: 'Videos', accept: '.ogm,.wmv,.mpg,.webm,.ogv,.mov,.asx,.mpeg,.mp4,.m4v,.avi,.3g2,.3gp,.flv,.mkv,.swf' },
  document: { label: 'Documents', accept: '.doc,.docx,.odt,.pdf,.rtf,.tex,.txt,.wks,.wps,.wpd' },
  zip: { label: 'Zip', accept: '.7z,.arj,.deb,.pkg,.rar,.rpm,.gz,.z,.zip' },
  presentation: { label: 'Presentation', accept: '.key,.odp,.pps,.ppt,.pptx' },
  spreadsheet: { label: 'Spreadsheet', accept: '.ods,.xlr,.xls,.xlsx' },
  database: { label: 'Databases', accept: '.csv,.dat,.db,.dbf,.log,.mdb,.sav,.sql,.tar,.sqlite,.xml' },
}

const FILE_KINDS = new Set<FileKind>(['', 'image', 'audio', 'video', 'document', 'zip', 'presentation', 'spreadsheet', 'database'])

export function fileAccept(kind: string): string {
  if (!kind || kind === '' || !FILE_KINDS.has(kind as FileKind) || kind === '') {
    return ''
  }
  return FILE_TYPE_ACCEPT[kind as Exclude<FileKind, ''>].accept
}

export function isTemporalType(type: string): type is TemporalType {
  return type === 'date' || type === 'time' || type === 'datetime' || type === 'week' || type === 'month'
}

export function temporalInputType(type: string): string {
  if (type === 'datetime') {
    return 'datetime-local'
  }
  if (isTemporalType(type)) {
    return type
  }
  return 'text'
}

export function headingTag(tag: string): HeadingTag {
  const allowed = new Set<HeadingTag>(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'p'])
  return allowed.has(tag as HeadingTag) ? tag as HeadingTag : 'div'
}

export function layoutFlexStyle(direction: LayoutDirection, align: LayoutAlign): Record<string, string> {
  const horizontal = direction === 'horizontal' || direction === 'horizontal-reverse'
  const cross = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
  const flexDirection = direction === 'vertical-reverse'
    ? 'column-reverse'
    : direction === 'horizontal'
      ? 'row'
      : direction === 'horizontal-reverse'
        ? 'row-reverse'
        : 'column'
  return {
    display: 'flex',
    flexDirection,
    alignItems: horizontal ? 'center' : cross,
    justifyContent: horizontal ? cross : 'flex-start',
    textAlign: align,
    width: '100%',
    gap: '8px',
  }
}

export function checkPositionStyle(position: CheckPosition): Record<string, string> {
  if (position === 'top-right') {
    return { position: 'absolute', top: '4px', right: '4px' }
  }
  if (position === 'bottom-left') {
    return { position: 'absolute', bottom: '4px', left: '4px' }
  }
  if (position === 'bottom-right') {
    return { position: 'absolute', bottom: '4px', right: '4px' }
  }
  if (position === 'center') {
    return { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
  return { position: 'absolute', top: '4px', left: '4px' }
}

export function isRichFieldType(type: string): boolean {
  return RICH_FIELD_TYPES.has(type)
}

export function fieldHasOption(type: string, id: number): boolean {
  return FIELD_OPTIONS[type]?.includes(id) ?? false
}

export function fieldOptionBefore(type: string, id: number, other: number): boolean {
  const list = FIELD_OPTIONS[type] ?? []
  const left = list.indexOf(id)
  const right = list.indexOf(other)
  return left !== -1 && right !== -1 && left < right
}

export const DEFAULT_RATING_ICON = new URL('../assets/img/star.svg', import.meta.url).href

export const RATING_FILTER_OFF = 'invert(95%) sepia(12%) saturate(155%) hue-rotate(6deg) brightness(85%) contrast(84%)'
export const RATING_FILTER_ON = 'invert(73%) sepia(30%) saturate(3712%) hue-rotate(3deg) brightness(108%) contrast(96%)'

export function ratingIconSrc(optionIcon: FormIcon | null | undefined, fallbackIcon: FormIcon | null | undefined): string {
  return iconUrl(optionIcon) || iconUrl(fallbackIcon) || DEFAULT_RATING_ICON
}

export function ratingSelectedIndex(options: FormRatingOption[], value: string): number {
  return options.findIndex(item => item.value === value)
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

export function normalizeTextOptions(raw: unknown, fallback: { label?: string, placeholder?: string, help?: string, required?: boolean, value?: string, min?: string, max?: string, buttonLabel?: string, options?: { label: string, value: string }[] } = {}): FormTextOptions {
  if (!isRecord(raw)) {
    const options = defaultTextOptions(fallback.label || '')
    options.placeholder = clip(fallback.placeholder, 200)
    options.defaultValue = clip(fallback.value, 20000)
    options.required.enabled = fallback.required === true
    if (fallback.buttonLabel) {
      options.buttonText = { enabled: true, text: clip(fallback.buttonLabel, 400), prefix: null, suffix: null }
    }
    if (fallback.help) {
      options.helper = { enabled: true, text: clip(fallback.help, 400), prefix: null, suffix: null }
    }
    if (fallback.options?.length) {
      options.choiceOptions = normalizeChoiceOptions(fallback.options, undefined)
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
    step: optionalNumber(source.step) ?? 1,
    ratingIcon: normalizeIcon(source.ratingIcon),
    ratingOptions: normalizeRatingOptions(source.ratingOptions),
    ratingPosition: source.ratingPosition === 'center' || source.ratingPosition === 'right' ? source.ratingPosition : 'left',
    ratingHoverMessage: source.ratingHoverMessage === true,
    ratingSelectedMessage: source.ratingSelectedMessage === true,
    buttonText: normalizeMarked(source.buttonText, clip(fallback.buttonLabel, 400) || 'Submit'),
    buttonType: source.buttonType === 'button' || source.buttonType === 'reset' ? source.buttonType : 'submit',
    fullWidth: source.fullWidth === true,
    buttonAlign: source.buttonAlign === 'center' || source.buttonAlign === 'right' ? source.buttonAlign : 'left',
    fileMultiple: normalizeFileMultiple(source.fileMultiple),
    fileType: typeof source.fileType === 'string' && FILE_KINDS.has(source.fileType as FileKind) ? source.fileType as FileKind : '',
    uploadButtonText: clip(source.uploadButtonText, 80) || 'Attach File',
    fileSelectStatus: clip(source.fileSelectStatus, 120) || 'No File Selected',
    showMaximumSize: clip(source.showMaximumSize, 120),
    maxUpload: normalizeMaxUpload(source.maxUpload),
    showFilePreview: source.showFilePreview === true,
    showFileSize: source.showFileSize === true,
    fileExistMessage: clip(source.fileExistMessage, 200) || 'A file already exists',
    rangeMin: source.rangeMin == null ? clip(fallback.min, 40) : clip(source.rangeMin, 40),
    rangeMax: source.rangeMax == null ? clip(fallback.max, 40) : clip(source.rangeMax, 40),
    choiceOptions: normalizeChoiceOptions(source.choiceOptions, fallback.options),
    allowMultiple: source.allowMultiple === true,
    choiceMin: optionalCount(source.choiceMin),
    choiceMax: optionalCount(source.choiceMax),
    itemSize: optionalCount(source.itemSize) ?? 200,
    checkPosition: isCheckPosition(source.checkPosition) ? source.checkPosition : 'top-left',
    hideImageLabel: source.hideImageLabel === true,
    optionsColumn: optionalCount(source.optionsColumn) ?? 1,
    choiceMinimum: normalizeBoundError(source.choiceMinimum, 'Select at least ${minimum} option(s)'),
    choiceMaximum: normalizeBoundError(source.choiceMaximum, 'Please, select no more than ${field.maximum} option(s)'),
    optionIcon: source.optionIcon === true,
    choiceGroups: normalizeChoiceGroups(source.choiceGroups),
    choiceAfter: normalizeChoiceOptions(source.choiceAfter, undefined),
    choiceEntries: normalizeChoiceEntries(source.choiceEntries),
    selectMultiple: normalizeSelectMultiple(source.selectMultiple),
    showSearch: source.showSearch === true,
    searchPlaceholder: clip(source.searchPlaceholder, 200),
    searchClearable: source.searchClearable === true,
    selectedClearable: source.selectedClearable === true,
    heading: normalizeHeading(source.heading, 'Title', 'h2', true),
    subheading: normalizeHeading(source.subheading, '', 'p', false),
    layoutAlign: source.layoutAlign === 'center' || source.layoutAlign === 'right' ? source.layoutAlign : 'left',
    layoutDirection: isLayoutDirection(source.layoutDirection) ? source.layoutDirection : 'vertical',
    elementImage: normalizeIcon(source.elementImage),
    imageWidth: optionalCount(source.imageWidth),
    imageHeight: optionalCount(source.imageHeight),
    imageAlt: clip(source.imageAlt, 200),
    spacerHeight: optionalCount(source.spacerHeight) ?? 40,
    ...normalizeRepeat(source, defaults),
    decisionLabel: clip(source.decisionLabel, 50000) || '<p>Decision Box</p>',
    decisionChecked: source.decisionChecked === true,
    decisionCheckedValue: clip(source.decisionCheckedValue, 200).trim() || 'Accepted',
    decisionUncheckedValue: clip(source.decisionUncheckedValue, 200).trim() || 'Rejected',
  }
}

function normalizeRepeat(source: Record<string, unknown>, defaults: FormTextOptions): Pick<FormTextOptions, 'repeatDefault' | 'repeatMinimum' | 'repeatMaximum' | 'repeatButtonPosition' | 'repeatButtonAlign' | 'repeatButtonView' | 'repeatAdd' | 'repeatRemove' | 'repeatAddEnd' | 'repeatAddEndAlign'> {
  const minimum = normalizeBoundError(source.repeatMinimum, defaults.repeatMinimum.errorText)
  const maximum = normalizeBoundError(source.repeatMaximum, defaults.repeatMaximum.errorText)
  if (minimum.value != null && maximum.value != null && maximum.value < minimum.value) {
    maximum.value = minimum.value
  }
  let repeatDefault = optionalCount(source.repeatDefault)
  if (repeatDefault == null) {
    repeatDefault = defaults.repeatDefault
  }
  if (repeatDefault != null && minimum.value != null && repeatDefault < minimum.value) {
    repeatDefault = minimum.value
  }
  if (repeatDefault != null && maximum.value != null && repeatDefault > maximum.value) {
    repeatDefault = maximum.value
  }
  const position = source.repeatButtonPosition
  const align = source.repeatButtonAlign
  const view = source.repeatButtonView
  const endAlign = source.repeatAddEndAlign
  return {
    repeatDefault,
    repeatMinimum: minimum,
    repeatMaximum: maximum,
    repeatButtonPosition: position === 'top' || position === 'left' || position === 'right' ? position : 'bottom',
    repeatButtonAlign: align === 'center' || align === 'end' ? align : 'start',
    repeatButtonView: view === 'vertical' || view === 'vertical-reverse' || view === 'horizontal-reverse' ? view : 'horizontal',
    repeatAdd: normalizeMarked(source.repeatAdd, 'Add'),
    repeatRemove: { ...normalizeMarked(source.repeatRemove, 'Remove'), enabled: true },
    repeatAddEnd: normalizeMarked(source.repeatAddEnd, 'Add to end'),
    repeatAddEndAlign: endAlign === 'center' || endAlign === 'end' ? endAlign : 'start',
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

const CHECK_POSITIONS = new Set<CheckPosition>(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'])

function isCheckPosition(value: unknown): value is CheckPosition {
  return typeof value === 'string' && CHECK_POSITIONS.has(value as CheckPosition)
}

function normalizeHeading(raw: unknown, text: string, tag: HeadingTag, enabled: boolean): FormHeading {
  const source = isRecord(raw) ? raw : {}
  return {
    enabled: source.enabled == null ? enabled : source.enabled === true,
    text: source.text == null ? text : clip(source.text, 2000),
    tag: headingTag(typeof source.tag === 'string' ? source.tag : tag),
    prefix: normalizeIcon(source.prefix),
    suffix: normalizeIcon(source.suffix),
  }
}

function isLayoutDirection(value: unknown): value is LayoutDirection {
  return value === 'vertical' || value === 'vertical-reverse' || value === 'horizontal' || value === 'horizontal-reverse'
}

function normalizeBoundError(raw: unknown, errorText: string): FormBoundError {
  const source = isRecord(raw) ? raw : {}
  return {
    value: optionalCount(source.value),
    showError: source.showError !== false,
    customError: source.customError === true,
    errorText: clip(source.errorText, 400) || errorText,
    errorPrefix: normalizeIcon(source.errorPrefix),
    errorSuffix: normalizeIcon(source.errorSuffix),
  }
}

function normalizeChoiceOptions(raw: unknown, fallback: { label: string, value: string }[] | undefined): FormChoiceOption[] {
  const source = Array.isArray(raw) && raw.length ? raw : fallback
  if (!source?.length) {
    return []
  }
  const options: FormChoiceOption[] = []
  for (const item of source.slice(0, 100)) {
    if (!isRecord(item) && !('label' in (item as object))) {
      continue
    }
    const record = item as Record<string, unknown>
    const label = clip(record.label, 200)
    const value = clip(record.value, 80) || label
    if (!label && !value) {
      continue
    }
    options.push({
      id: clip(record.id, 80) || `opt_${crypto.randomUUID()}`,
      image: normalizeIcon(record.image),
      label: label || value,
      value: value || label,
      checked: record.checked === true,
      required: record.required === true,
      disabled: record.disabled === true,
    })
  }
  return options
}

function normalizeChoiceEntries(raw: unknown): FormChoiceEntry[] | null {
  if (!Array.isArray(raw)) {
    return null
  }
  const entries: FormChoiceEntry[] = []
  for (const item of raw.slice(0, 150)) {
    if (!isRecord(item)) {
      continue
    }
    if (item.type === 'group') {
      const group = normalizeChoiceGroups([item.group])[0]
      if (group) {
        entries.push({ type: 'group', group })
      }
      continue
    }
    const option = normalizeChoiceOptions([item.option], undefined)[0]
    if (option) {
      entries.push({ type: 'option', option })
    }
  }
  return entries
}

function normalizeChoiceGroups(raw: unknown): FormChoiceGroup[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const groups: FormChoiceGroup[] = []
  for (const item of raw.slice(0, 50)) {
    if (!isRecord(item)) {
      continue
    }
    groups.push({
      id: clip(item.id, 80) || `grp_${crypto.randomUUID()}`,
      label: clip(item.label, 200) || 'Group',
      options: normalizeChoiceOptions(item.options, undefined),
    })
  }
  return groups
}

function normalizeSelectMultiple(raw: unknown): FormSelectMultiple {
  const source = isRecord(raw) ? raw : {}
  const minimum = isRecord(source.minimum) ? source.minimum : {}
  const maximum = isRecord(source.maximum) ? source.maximum : {}
  return {
    enabled: source.enabled === true,
    minimum: {
      value: optionalCount(minimum.value),
      showError: minimum.showError !== false,
      customError: minimum.customError === true,
      errorText: clip(minimum.errorText, 400) || 'Select at least ${minimum} option(s)',
    },
    maximum: {
      value: optionalCount(maximum.value),
      showError: maximum.showError !== false,
      customError: maximum.customError === true,
      errorText: clip(maximum.errorText, 400) || 'Select at least ${maximum} option(s)',
    },
  }
}

export function flatChoiceOptions(options: FormChoiceOption[], groups: FormChoiceGroup[], after?: FormChoiceOption[]): FormChoiceOption[] {
  return [...options, ...groups.flatMap(group => group.options), ...(after ?? [])]
}

/** Select list in display order. An explicit `choiceEntries` array wins over the older split lists. */
export function resolveChoiceEntries(text: Pick<FormTextOptions, 'choiceEntries' | 'choiceOptions' | 'choiceGroups' | 'choiceAfter'>): FormChoiceEntry[] {
  if (Array.isArray(text.choiceEntries)) {
    return text.choiceEntries
  }
  return [
    ...(text.choiceOptions ?? []).map(option => ({ type: 'option' as const, option })),
    ...(text.choiceGroups ?? []).map(group => ({ type: 'group' as const, group })),
    ...(text.choiceAfter ?? []).map(option => ({ type: 'option' as const, option })),
  ]
}

export function listedChoiceOptions(text: Pick<FormTextOptions, 'choiceEntries' | 'choiceOptions' | 'choiceGroups' | 'choiceAfter'>): FormChoiceOption[] {
  return resolveChoiceEntries(text).flatMap(entry => entry.type === 'option' ? [entry.option] : entry.group.options)
}

export function choiceMatches(option: { label: string, value: string }, query: string): boolean {
  const text = query.trim().toLowerCase()
  if (!text) {
    return true
  }
  return option.label.toLowerCase().includes(text) || option.value.toLowerCase().includes(text)
}

function normalizeFileLimit(raw: unknown): FormFileLimit {
  const source = isRecord(raw) ? raw : {}
  return {
    value: optionalCount(source.value),
    showError: source.showError !== false,
    customError: source.customError === true,
    errorText: clip(source.errorText, 400),
  }
}

function normalizeFileMultiple(raw: unknown): FormFileMultiple {
  const source = isRecord(raw) ? raw : {}
  return {
    enabled: source.enabled === true,
    minimum: normalizeFileLimit(source.minimum),
    maximum: normalizeFileLimit(source.maximum),
  }
}

function normalizeMaxUpload(raw: unknown): FormMaxUpload {
  const source = isRecord(raw) ? raw : {}
  const size = optionalNumber(source.size)
  return {
    enabled: source.enabled === true,
    size: size == null ? 20 : Math.max(20, size),
    total: source.total === true,
    showError: source.showError !== false,
    customError: source.customError === true,
    errorText: clip(source.errorText, 400) || 'Maximum file size exceeded. (Max: ${maximum_size}MB)',
  }
}

function defaultRatingOptions(): FormRatingOption[] {
  return [1, 2, 3, 4, 5].map(index => ({
    id: `rt_${index}`,
    icon: null,
    label: String(index),
    value: String(index),
    checked: false,
  }))
}

function normalizeRatingOptions(raw: unknown): FormRatingOption[] {
  if (!Array.isArray(raw) || !raw.length) {
    return defaultRatingOptions()
  }
  const options: FormRatingOption[] = []
  for (const item of raw.slice(0, 20)) {
    if (!isRecord(item)) {
      continue
    }
    const label = clip(item.label, 80)
    const value = clip(item.value, 80) || label
    if (!value) {
      continue
    }
    options.push({
      id: clip(item.id, 80) || `rt_${crypto.randomUUID()}`,
      icon: normalizeIcon(item.icon),
      label,
      value,
      checked: item.checked === true,
    })
  }
  return options.length ? options : defaultRatingOptions()
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
