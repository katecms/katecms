import type { ConditionalLogic } from './conditional-logic'

/** Набор вариантов: { значение: подпись } */
type Choices = Record<string, string>

type ImageChoices = Record<string, {
  label: string
  image: string
}>

/** Значение варианта select */
export type SelectChoiceValue = string | number

/** Обычный вариант select */
export interface SelectChoiceItem {
  val?: SelectChoiceValue
  lbl: string
  img?: string
  disabled?: boolean
  check?: boolean
}

/** Группа вариантов select */
export interface SelectChoiceGroup {
  type: 'group'
  title: string
  disabled?: boolean
  childs: SelectChoiceItem[]
}

/** Вариант или группа для поля select */
export type SelectChoice = SelectChoiceItem | SelectChoiceGroup

/** v-model значение UiSelect / SelectField */
export type SelectModelValue = SelectChoiceValue | SelectChoiceValue[] | '' | null

/** Базовые свойства, общие для всех полей. label обязателен. */
interface BaseField {
  label: string
  instructions?: string
  required?: boolean
  conditionalLogic?: ConditionalLogic
  position?: 'main' | 'sidebar' // default: 'main'
  columnWidth?: number
}

/* ============================================================
 * Базовые / текстовые
 * ============================================================ */

interface TextField extends BaseField {
  type: 'text'
  defaultValue?: string
  maxLength?: number
  placeholder?: string
  prepend?: string
  append?: string
  indexed?: boolean
}

interface TextareaField extends BaseField {
  type: 'textarea'
  defaultValue?: string
  maxLength?: number
  rows?: number
  placeholder?: string
  /** Обработка переносов строк */
  newLines?: 'autop' | 'br' | '' // default: ''
  indexed?: boolean
}

interface NumberField extends BaseField {
  type: 'number'
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  placeholder?: string
  prepend?: string
  append?: string
  indexed?: boolean
}

interface RangeField extends BaseField {
  type: 'range'
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  prepend?: string
  append?: string
  indexed?: boolean
}

interface EmailField extends BaseField {
  type: 'email'
  defaultValue?: string
  placeholder?: string
  prepend?: string
  append?: string
  indexed?: boolean
}

interface UrlField extends BaseField {
  type: 'url'
  defaultValue?: string
  placeholder?: string
  indexed?: boolean
}

interface PasswordField extends BaseField {
  type: 'password'
  placeholder?: string
  prepend?: string
  append?: string
}

/* ============================================================
 * Контент / медиа
 * ============================================================ */

interface WysiwygField extends BaseField {
  type: 'wysiwyg'
  defaultValue?: string
  tabs?: 'all' | 'visual' | 'text'
  /** `full` (default) — все инструменты; `basic` — урезанный набор */
  toolbar?: 'full' | 'basic'
  mediaUpload?: boolean
  /** Кастомные размеры шрифта (например `['12px','16px','24px']`). По умолчанию 8–96px. */
  fontSize?: string[]
  /** Кастомная палитра цветов текста (hex). */
  colorPalette?: string[]
}

interface OembedField extends BaseField {
  type: 'oembed'
  width?: number
  height?: number
}

/** Общие настройки ограничений для медиа-полей */
interface MediaConstraints {
  minSize?: number
  maxSize?: number
  mimeTypes?: string
}

interface ImageDimensions {
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

interface ImageField extends BaseField, MediaConstraints, ImageDimensions {
  type: 'image'
  returnFormat?: 'array' | 'url' | 'id'
  library?: 'all' | 'uploadedTo'
  cropType?: [number, number] | boolean
}

interface FileField extends BaseField, MediaConstraints {
  type: 'file'
  returnFormat?: 'array' | 'url' | 'id'
  library?: 'all' | 'uploadedTo'
}

interface GalleryField extends BaseField, MediaConstraints, ImageDimensions {
  type: 'gallery'
  returnFormat?: 'array' | 'url' | 'id'
  previewSize?: string
  insert?: 'append' | 'prepend'
  library?: 'all' | 'uploadedTo'
  min?: number
  max?: number
}

/* ============================================================
 * Выбор
 * ============================================================ */

export interface SelectField extends BaseField {
  type: 'select'
  choices: SelectChoice[]
  defaultValue?: string | number | Array<string | number>
  allowNull?: boolean
  multiple?: boolean
  placeholder?: string
  returnFormat?: 'value' | 'label' | 'array'
  allowCustomChoices?: boolean
  customChoiceButtonText?: string
  min?: number
  max?: number
  search?: boolean
  searchPlaceholder?: string
  clearable?: boolean
  indexed?: boolean
}

interface CheckboxField extends BaseField {
  type: 'checkbox'
  choices: Choices
  defaultValue?: string | string[]
  layout?: 'vertical' | 'horizontal'
  allowCustomChoices?: boolean
  toggle?: boolean
  returnFormat?: 'value' | 'label' | 'array'
  customChoiceButtonText?: string
}

interface RadioField extends BaseField {
  type: 'radio'
  choices: Choices
  defaultValue?: string
  layout?: 'vertical' | 'horizontal'
  allowCustomChoices?: boolean
  allowNull?: boolean
  returnFormat?: 'value' | 'label' | 'array'
  indexed?: boolean
}

interface ImageSelectField extends BaseField {
  type: 'image_select'
  choices: ImageChoices
  defaultValue?: string | string[]
  layout?: 'vertical' | 'horizontal'
  multiple?: boolean
  allowNull?: boolean
  returnFormat?: 'value' | 'label' | 'array'
  width?: number
  height?: number
}

interface ButtonGroupField extends BaseField {
  type: 'button_group'
  choices: Choices
  defaultValue?: string
  allowNull?: boolean
  returnFormat?: 'value' | 'label' | 'array'
  layout?: 'horizontal' | 'vertical'
  indexed?: boolean
}

interface TrueFalseField extends BaseField {
  type: 'true_false'
  defaultValue?: boolean
  message?: string
  ui?: boolean
  uiOnText?: string
  uiOffText?: string
  indexed?: boolean
}

/* ============================================================
 * Связи
 * ============================================================ */

interface LinkField extends BaseField {
  type: 'link'
  returnFormat?: 'array' | 'url'
}

interface PostObjectField extends BaseField {
  type: 'post_object'
  postType?: string[]
  taxonomy?: string[]
  allowNull?: boolean
  multiple?: boolean
  returnFormat?: 'object' | 'id'
  ui?: boolean
  bidirectionalTarget?: string[]
}

interface PageLinkField extends BaseField {
  type: 'page_link'
  postType?: string[]
  taxonomy?: string[]
  allowNull?: boolean
  multiple?: boolean
  allowArchives?: boolean
}

interface RelationshipField extends BaseField {
  type: 'relationship'
  postType?: string[]
  taxonomy?: string[]
  min?: number
  max?: number
  filters?: Array<'search' | 'post_type' | 'taxonomy'>
  elements?: Array<'featured_image'>
  returnFormat?: 'object' | 'id'
  bidirectionalTarget?: string[]
}

interface TaxonomyField extends BaseField {
  type: 'taxonomy'
  taxonomy: string
  fieldType?: 'checkbox' | 'multi_select' | 'radio' | 'select'
  multiple?: boolean
  allowNull?: boolean
  returnFormat?: 'object' | 'id'
  addTerm?: boolean
  loadTerms?: boolean
  saveTerms?: boolean
  bidirectionalTarget?: string[]
}

interface UserField extends BaseField {
  type: 'user'
  role?: 'all' | string | string[]
  multiple?: boolean
  allowNull?: boolean
  returnFormat?: 'array' | 'id'
}

/* ============================================================
 * Продвинутые
 * ============================================================ */

interface OpenStreetMapField extends BaseField {
  type: 'open_street_map'
  height?: number
  centerLat?: string
  centerLng?: string
  zoom?: number
  multiple?: boolean
}

interface DatePickerField extends BaseField {
  type: 'date_picker'
  displayFormat?: string
  returnFormat?: string
  firstDay?: number
  defaultToCurrentDate?: boolean
  indexed?: boolean
}

interface DateTimePickerField extends BaseField {
  type: 'date_time_picker'
  displayFormat?: string
  returnFormat?: string
  firstDay?: number
  defaultToCurrentDate?: boolean
  indexed?: boolean
}

interface TimePickerField extends BaseField {
  type: 'time_picker'
  displayFormat?: string
  returnFormat?: string
  indexed?: boolean
}

interface ColorPickerField extends BaseField {
  type: 'color_picker'
  defaultValue?: string
  enableOpacity?: boolean
  returnFormat?: 'string' | 'array'
  paletteColors?: string[]
  showColorWheel?: boolean
  rgba?: boolean
  hsla?: boolean
  indexed?: boolean
}

/* ============================================================
 * Структура / вёрстка (с вложенными полями)
 * ============================================================ */

interface GroupField extends BaseField {
  type: 'group'
  subFields: Fields
}

interface RepeaterField extends BaseField {
  type: 'repeater'
  min?: number
  max?: number
  buttonLabel?: string
  collapsed?: string
  subFields: Fields
}

/** Макет блока flexible content. Ключ записи = имя макета. */
export interface FlexibleLayout {
  label: string
  preview?: string // Preview image (Example: img_block.png)
  /** Soft limit — future save validation only (no auto-add / no block remove in UI). */
  min?: number
  max?: number // Maximum number of block additions
  subFields: Fields
}

interface FlexibleContentField extends BaseField {
  type: 'flexible_content'
  /** Soft limit — future save validation only (does not auto-add rows in UI). */
  min?: number
  max?: number // Maximum number of blocks
  buttonLabel?: string
  previewPath?: string // path to the folder with preview images, relative to the "public" folder (Example: /preview-flexible-content)
  layouts: Record<string, FlexibleLayout>
}

interface CloneField extends BaseField {
  type: 'clone'
  /** Ключи клонируемых полей / групп полей */
  clone: string[]
  display?: 'seamless' | 'group'
  layout?: 'block' | 'table' | 'row'
  prefixLabel?: boolean
  prefixName?: boolean
}

/* ============================================================
 * Оформление (без значения)
 * tab / accordion — только UI: subFields панелей пишутся плоско
 * в родительский values, без объекта под ключом самого поля.
 * ============================================================ */

interface Panel {
  label: string
  subFields: Fields
}

interface AccordionField extends Pick<BaseField, 'position' | 'columnWidth' | 'conditionalLogic'> {
  type: 'accordion'
  open?: number // index of the open tab (starting from "0")
  multiExpand?: boolean
  panels: Panel[]
}

interface TabField extends Pick<BaseField, 'position' | 'columnWidth' | 'conditionalLogic'> {
  type: 'tab'
  placement?: 'top' | 'left'
  panels: Panel[]
}

interface MessageField extends BaseField {
  type: 'message'
  message?: string
  escHtml?: boolean
  newLines?: 'autop' | 'br' | ''
}

interface SeparatorField extends Omit<BaseField, 'label'> {
  type: 'separator'
  label?: string
}

/* ============================================================
 * Объединение всех типов + корневой тип конфига
 * ============================================================ */

export type Field
  = | TextField
    | TextareaField
    | NumberField
    | RangeField
    | EmailField
    | UrlField
    | PasswordField
    | WysiwygField
    | OembedField
    | ImageField
    | FileField
    | GalleryField
    | SelectField
    | CheckboxField
    | RadioField
    | ImageSelectField
    | ButtonGroupField
    | TrueFalseField
    | LinkField
    | PostObjectField
    | PageLinkField
    | RelationshipField
    | TaxonomyField
    | UserField
    | OpenStreetMapField
    | DatePickerField
    | DateTimePickerField
    | TimePickerField
    | ColorPickerField
    | GroupField
    | RepeaterField
    | FlexibleContentField
    | CloneField
    | AccordionField
    | TabField
    | MessageField
    | SeparatorField

/** Ключ = имя поля (вместо name). Значение = конфиг поля. */
export type Fields = Record<string, Field>
