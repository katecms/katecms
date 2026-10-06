import type { MediaItem } from '../../media'
import type { ConditionalLogic } from './conditional-logic'

/** Choice map: { value: label } */
export type ChoiceMap = Record<string, string>

export interface ImageChoice {
  label: string
  image: string
}

export type ImageChoiceMap = Record<string, ImageChoice>

/** How choice fields serialize the selected key. */
export type ChoiceReturnFormat = 'value' | 'label' | 'array'

/** `returnFormat: 'array'` payload for choice fields. */
export interface ChoiceArrayValue {
  value: string
  label: string
}

/** Stored choice (single item). Arrays of this are used by checkbox / multi-select. */
export type ChoiceStoredValue = string | ChoiceArrayValue

/** Select choice value */
export type SelectChoiceValue = string | number

/** Single select choice */
export interface SelectChoiceItem {
  val?: SelectChoiceValue
  lbl: string
  img?: string
  disabled?: boolean
  check?: boolean
}

/** Select choice group */
export interface SelectChoiceGroup {
  type: 'group'
  title: string
  disabled?: boolean
  childs: SelectChoiceItem[]
}

/** Choice or group for a select field */
export type SelectChoice = SelectChoiceItem | SelectChoiceGroup

/** Select field value */
export type SelectModelValue = SelectChoiceValue | SelectChoiceValue[] | '' | null

/** Base properties shared by all fields. `label` is required. */
interface BaseField {
  label?: string
  instructions?: string
  required?: boolean
  conditionalLogic?: ConditionalLogic
  position?: 'main' | 'sidebar' // default: 'main'
  columnWidth?: number
}

/* ============================================================
 * Basic / text
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
  /** Newline handling */
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
 * Content / media
 * ============================================================ */

interface WysiwygField extends BaseField {
  type: 'wysiwyg'
  defaultValue?: string
  tabs?: 'all' | 'visual' | 'text'
  /** `full` (default) — all tools; `basic` — reduced set */
  toolbar?: 'full' | 'basic'
  mediaUpload?: boolean
  /** Custom font sizes (e.g. `['12px','16px','24px']`). Default 8–96px. */
  fontSize?: string[]
  /** Custom text colour palette (hex). */
  colorPalette?: string[]
}

interface OembedField extends BaseField {
  type: 'oembed'
  defaultValue?: string
  width?: number
  height?: number
}

/** Shared constraint settings for media fields */
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
  /** Compact add button: icon only, no “Add Image” label. */
  iconMode?: boolean
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
 * Choice
 * ============================================================ */

export interface SelectField extends BaseField {
  type: 'select'
  choices: SelectChoice[]
  defaultValue?: string | number | Array<string | number>
  allowNull?: boolean
  multiple?: boolean
  placeholder?: string
  returnFormat?: ChoiceReturnFormat
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
  choices: ChoiceMap
  defaultValue?: string | string[]
  layout?: 'vertical' | 'horizontal'
  allowCustomChoices?: boolean
  toggle?: boolean
  returnFormat?: ChoiceReturnFormat
  customChoiceButtonText?: string
}

interface RadioField extends BaseField {
  type: 'radio'
  choices: ChoiceMap
  defaultValue?: string
  layout?: 'vertical' | 'horizontal'
  allowCustomChoices?: boolean
  customChoiceButtonText?: string
  allowNull?: boolean
  returnFormat?: ChoiceReturnFormat
  indexed?: boolean
}

interface ImageSelectField extends BaseField {
  type: 'image_select'
  choices: ImageChoiceMap
  defaultValue?: string | string[]
  layout?: 'vertical' | 'horizontal'
  multiple?: boolean
  allowNull?: boolean
  returnFormat?: ChoiceReturnFormat
  width?: number
  height?: number
}

interface ButtonGroupField extends BaseField {
  type: 'button_group'
  choices: ChoiceMap
  defaultValue?: string
  allowNull?: boolean
  returnFormat?: ChoiceReturnFormat
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
 * Relationships
 * ============================================================ */

/** Stored object for `link` when `returnFormat` is `'array'` (default). */
export interface LinkValue {
  url: string
  title: string
  target: string
}

/** Form value of a `link` field. */
export type LinkFieldValue = LinkValue | string | null

interface LinkField extends BaseField {
  type: 'link'
  returnFormat?: 'array' | 'url'
}

interface PostObjectField extends BaseField {
  type: 'post_object'
  postType?: string[]
  dictionary?: string[]
  allowNull?: boolean
  multiple?: boolean
  returnFormat?: 'object' | 'id'
}

interface PageLinkField extends BaseField {
  type: 'page_link'
  postType?: string[]
  dictionary?: string[]
  allowNull?: boolean
  multiple?: boolean
  allowArchives?: boolean
}

interface RelationshipField extends BaseField {
  type: 'relationship'
  postType?: string[]
  dictionary?: string[]
  min?: number
  max?: number
  filters?: Array<'search' | 'post_type' | 'dictionary'>
  /**
   * Image field keys shown as thumbnails in the picker.
   * There is no built-in featured image — use a collection `image` / `gallery`
   * field, e.g. `['thumbnail']` on `pages`.
   */
  elements?: string[]
  returnFormat?: 'object' | 'id'
}

interface DictionaryField extends BaseField {
  type: 'dictionary'
  dictionary: string
  fieldType?: 'checkbox' | 'multi_select' | 'radio' | 'select'
  multiple?: boolean
  allowNull?: boolean
  returnFormat?: 'object' | 'id'
  addTerm?: boolean
}

interface UserField extends BaseField {
  type: 'user'
  role?: 'all' | string | string[]
  multiple?: boolean
  allowNull?: boolean
  returnFormat?: 'array' | 'id'
}

/**
 * Stored `user` field object when `returnFormat` is `array`.
 * Never includes a password hash.
 */
export interface UserFieldValue {
  id: number
  email: string
  name: string | null
  avatar: MediaItem | null
  role: string
  status: 'active' | 'banned'
  created_at: string
}

/** Stored collection entry for `post_object` / `relationship` when `returnFormat` is `'object'`. */
export interface RelationEntryValue {
  id: number
  type: string
  status: 'published' | 'draft' | 'trash'
  title: string
  slug: string
  slugPath: string
  url: string
  fields: Record<string, unknown>
  parentId: number | null
  menuOrder: number
  authorId: number | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

/** Stored dictionary term for `dictionary` when `returnFormat` is `'object'`. */
export interface RelationTermValue {
  id: number
  type: string
  title: string
  slug: string
  slugPath: string
  fields: Record<string, unknown>
  parentId: number | null
  depth?: number
  createdAt: string
  updatedAt: string
}

/* ============================================================
 * Advanced
 * ============================================================ */

/** Nominatim address parts stored on an OpenStreetMap marker. */
export interface OsmAddress {
  'house_number': string
  'road': string
  'suburb': string
  'city_district': string
  'city': string
  'ISO3166-2-lvl4': string
  'postcode': string
  'country': string
  'country_code': string
  'building': string
  'town': string
  'village': string
  'hamlet': string
  'state': string
}

/** Stored value of one OpenStreetMap marker. */
export interface OsmMarker {
  label: string
  default_label: string
  lat: number
  lng: number
  zoom: number
  address: OsmAddress
  place_id: string
}

/** Form value of an `open_street_map` field. */
export type OsmMarkerValue = OsmMarker | OsmMarker[] | null

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

/** Stored object for `color_picker` when `returnFormat` is `'array'`. */
export interface ColorArrayValue {
  hex: string
  rgba: string
  r: number
  g: number
  b: number
  a: number
}

/** Form value of a `color_picker` field. */
export type ColorPickerValue = string | ColorArrayValue

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
 * Structure / layout (nested fields)
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

/** Flexible content layout. The record key is the layout name. */
export interface FlexibleLayout {
  label: string
  preview?: string // Filename under `previewPath` (`hero.png`) or an absolute / root-relative URL
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

/* ============================================================
 * Presentation (no value)
 * tab / accordion are UI-only: panel subFields are written flat
 * into the parent values, not under the field's own key.
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
 * Union of every field type + the root config type
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
    | DictionaryField
    | UserField
    | OpenStreetMapField
    | DatePickerField
    | DateTimePickerField
    | TimePickerField
    | ColorPickerField
    | GroupField
    | RepeaterField
    | FlexibleContentField
    | AccordionField
    | TabField
    | MessageField
    | SeparatorField

/** Key = field name (instead of `name`). Value = field config. */
export type Fields = Record<string, Field>
