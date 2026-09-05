<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import type { Field } from '@miraicms/core'

type ColorPickerFieldConfig = Extract<Field, { type: 'color_picker' }>
type ColorFormat = 'hex' | 'rgba' | 'hsla'

type ColorArrayValue = {
  hex: string
  rgba: string
  r: number
  g: number
  b: number
  a: number
}

type Hsva = { h: number, s: number, v: number, a: number }

const props = defineProps({
  fieldKey: {
    type: String,
    required: true,
  },
  field: {
    type: Object as PropType<ColorPickerFieldConfig>,
    default: () => ({}),
  },
})

// string: '#rrggbb' | '#rrggbbaa' | 'rgba(...)' | 'hsla(...)'
// array:  { hex, rgba, r, g, b, a }
const model = defineModel<unknown>()

const rootClass = 'miraicms-color-picker-field'
const rootEl = ref<HTMLElement | null>(null)
const open = ref(false)
const dropUp = ref(false)
const format = ref<ColorFormat>('hex')
const inputText = ref('')
const hasValue = ref(false)
const hsva = ref<Hsva>({ h: 210, s: 0.75, v: 0.98, a: 1 })

let syncingFromModel = false
let dragging: 'palette' | 'hue' | 'alpha' | null = null
let dragEl: HTMLElement | null = null
let dragRect: DOMRect | null = null
let dragPointerId: number | null = null

const enableOpacity = computed(() => !!props.field?.enableOpacity)
const returnFormat = computed(() => props.field?.returnFormat || 'string')
const showColorWheel = computed(() => props.field?.showColorWheel !== false)
const showRgba = computed(() => !!props.field?.rgba)
const showHsla = computed(() => !!props.field?.hsla)
const palette = computed(() => props.field?.paletteColors ?? [])

const formatButtons = computed(() => {
  const buttons: { id: ColorFormat, label: string }[] = [
    { id: 'hex', label: enableOpacity.value ? 'HEXA' : 'HEX' },
  ]
  if (showRgba.value) buttons.push({ id: 'rgba', label: enableOpacity.value ? 'RGBA' : 'RGB' })
  if (showHsla.value) buttons.push({ id: 'hsla', label: enableOpacity.value ? 'HSLA' : 'HSL' })
  return buttons
})

const rgb = computed(() => hsvaToRgb(hsva.value.h, hsva.value.s, hsva.value.v))
const payload = computed<ColorArrayValue>(() => {
  const { r, g, b } = rgb.value
  const a = enableOpacity.value ? Number(hsva.value.a.toFixed(2)) : 1
  return {
    hex: toHex(r, g, b, enableOpacity.value ? a : 1),
    rgba: `rgba(${r}, ${g}, ${b}, ${a})`,
    r,
    g,
    b,
    a,
  }
})

const previewColor = computed(() => {
  if (!hasValue.value) return 'transparent'
  return payload.value.rgba
})

const displayText = computed(() => {
  if (!hasValue.value) return 'Выберите цвет'
  return formatColorString(format.value)
})

const hueColor = computed(() => {
  const { r, g, b } = hsvaToRgb(hsva.value.h, 1, 1)
  return `rgb(${r}, ${g}, ${b})`
})

const paletteHueStyle = computed(() => ({
  backgroundColor: hueColor.value,
}))

const paletteLayersStyle = computed(() => ({
  opacity: enableOpacity.value ? hsva.value.a : 1,
}))

const pickerStyle = computed(() => ({
  left: `${hsva.value.s * 100}%`,
  top: `${(1 - hsva.value.v) * 100}%`,
  backgroundColor: payload.value.rgba,
}))

const hueStyle = computed(() => ({
  left: `${(hsva.value.h / 360) * 100}%`,
  backgroundColor: hueColor.value,
}))

const alphaKnobStyle = computed(() => ({
  left: `${hsva.value.a * 100}%`,
  backgroundColor: payload.value.rgba,
}))

const alphaTrackStyle = computed(() => {
  const { r, g, b } = rgb.value
  return {
    backgroundImage: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0), rgba(${r}, ${g}, ${b}, 1)), url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'><path fill='white' d='M1,0H2V1H1V0ZM0,1H1V2H0V1Z'/><path fill='gray' d='M0,0H1V1H0V0ZM1,1H2V2H1V1Z'/></svg>")`,
    backgroundSize: '100%, 8px',
  }
})

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function toHex(r: number, g: number, b: number, a = 1): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  const base = `#${h(r)}${h(g)}${h(b)}`
  if (!enableOpacity.value || a >= 1) return base
  return `${base}${h(a * 255)}`
}

function hsvaToRgb(h: number, s: number, v: number) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

function rgbToHsva(r: number, g: number, b: number, a = 1): Hsva {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max, a: clamp(a, 0, 1) }
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: h * 360, s, l }
}

function hslToRgb(h: number, s: number, l: number) {
  const hh = ((h % 360) + 360) % 360 / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hue2rgb(p, q, hh + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hh) * 255),
    b: Math.round(hue2rgb(p, q, hh - 1 / 3) * 255),
  }
}

function parseColor(value: unknown): Hsva | null {
  if (!value) return null

  if (typeof value === 'object') {
    const obj = value as Partial<ColorArrayValue>
    if (typeof obj.r === 'number' && typeof obj.g === 'number' && typeof obj.b === 'number') {
      return rgbToHsva(obj.r, obj.g, obj.b, typeof obj.a === 'number' ? obj.a : 1)
    }
    if (typeof obj.hex === 'string') return parseColor(obj.hex)
    if (typeof obj.rgba === 'string') return parseColor(obj.rgba)
    return null
  }

  if (typeof value !== 'string') return null
  const str = value.trim()
  if (!str) return null

  if (str.startsWith('#')) {
    let hex = str.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map(ch => ch + ch).join('')
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16)
      const g = Number.parseInt(hex.slice(2, 4), 16)
      const b = Number.parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1
      if ([r, g, b].every(n => Number.isFinite(n))) {
        return rgbToHsva(r, g, b, a)
      }
    }
    return null
  }

  const rgbaMatch = str.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i)
  if (rgbaMatch) {
    return rgbToHsva(
      Number(rgbaMatch[1]),
      Number(rgbaMatch[2]),
      Number(rgbaMatch[3]),
      rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    )
  }

  const hslaMatch = str.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/i)
  if (hslaMatch) {
    const rgbVal = hslToRgb(Number(hslaMatch[1]), Number(hslaMatch[2]) / 100, Number(hslaMatch[3]) / 100)
    return rgbToHsva(
      rgbVal.r,
      rgbVal.g,
      rgbVal.b,
      hslaMatch[4] !== undefined ? Number(hslaMatch[4]) : 1,
    )
  }

  return null
}

function formatColorString(fmt: ColorFormat): string {
  const { r, g, b, a, hex, rgba } = payload.value
  if (fmt === 'rgba') {
    if (!enableOpacity.value) return `rgb(${r}, ${g}, ${b})`
    return rgba
  }
  if (fmt === 'hsla') {
    const hsl = rgbToHsl(r, g, b)
    const h = Math.round(hsl.h)
    const s = Math.round(hsl.s * 100)
    const l = Math.round(hsl.l * 100)
    if (!enableOpacity.value) return `hsl(${h}, ${s}%, ${l}%)`
    return `hsla(${h}, ${s}%, ${l}%, ${a})`
  }
  return hex
}

function isSameArrayValue(value: unknown, next: ColorArrayValue): boolean {
  if (!value || typeof value !== 'object') return false
  const cur = value as Partial<ColorArrayValue>
  return cur.hex === next.hex
    && cur.rgba === next.rgba
    && cur.r === next.r
    && cur.g === next.g
    && cur.b === next.b
    && cur.a === next.a
}

function writeModel(next: unknown) {
  if (Object.is(model.value, next)) return
  if (typeof next === 'string' && model.value === next) return
  if (next && typeof next === 'object' && isSameArrayValue(model.value, next as ColorArrayValue)) return

  syncingFromModel = true
  model.value = next
  // Parent может обновить model асинхронно — держим флаг до nextTick.
  queueMicrotask(() => {
    syncingFromModel = false
  })
}

function commit(options: { syncInput?: boolean } = {}) {
  const syncInput = options.syncInput !== false
  hasValue.value = true
  if (syncInput) {
    inputText.value = formatColorString(format.value)
  }
  if (returnFormat.value === 'array') {
    writeModel({ ...payload.value })
  }
  else {
    writeModel(formatColorString(format.value))
  }
}

function clearValue() {
  hasValue.value = false
  inputText.value = ''
  writeModel(returnFormat.value === 'array' ? undefined : '')
}

function applyParsed(next: Hsva) {
  hsva.value = {
    h: next.h,
    s: next.s,
    v: next.v,
    a: enableOpacity.value ? next.a : 1,
  }
  commit()
}

function colorsMatchRgb(
  a: { r: number, g: number, b: number, a?: number },
  b: { r: number, g: number, b: number, a?: number },
) {
  return a.r === b.r
    && a.g === b.g
    && a.b === b.b
    && Number((a.a ?? 1).toFixed(2)) === Number((b.a ?? 1).toFixed(2))
}

function syncFromModel() {
  const parsed = parseColor(model.value)
  if (!parsed) {
    hasValue.value = false
    inputText.value = ''
    return
  }

  const nextA = enableOpacity.value ? parsed.a : 1
  const nextRgb = hsvaToRgb(parsed.h, parsed.s, parsed.v)
  const curRgb = hsvaToRgb(hsva.value.h, hsva.value.s, hsva.value.v)

  // RGB→HSV на чёрном/белом теряет hue — не перетираем локальный HSV, если цвет тот же.
  if (
    hasValue.value
    && colorsMatchRgb(
      { ...curRgb, a: hsva.value.a },
      { ...nextRgb, a: nextA },
    )
  ) {
    if (typeof model.value === 'string') {
      inputText.value = model.value
    }
    return
  }

  hsva.value = {
    h: parsed.h,
    s: parsed.s,
    v: parsed.v,
    a: nextA,
  }
  hasValue.value = true
  if (typeof model.value === 'string') {
    inputText.value = model.value
  }
  else {
    inputText.value = formatColorString(format.value)
  }
}

function setFormat(next: ColorFormat) {
  format.value = next
  if (hasValue.value) {
    inputText.value = formatColorString(next)
    if (returnFormat.value === 'string') {
      writeModel(formatColorString(next))
    }
  }
}

function onInputApply() {
  const parsed = parseColor(inputText.value)
  if (!parsed) {
    inputText.value = hasValue.value ? formatColorString(format.value) : ''
    return
  }
  applyParsed(parsed)
}

function selectSwatch(color: string) {
  const parsed = parseColor(color)
  if (!parsed) return
  applyParsed(parsed)
}

function updateDropDirection() {
  if (!rootEl.value || typeof window === 'undefined') return
  const rect = rootEl.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  dropUp.value = spaceBelow < 320 && rect.top > spaceBelow
}

function toggle() {
  if (open.value) {
    open.value = false
    return
  }
  syncFromModel()
  updateDropDirection()
  open.value = true
}

function onDocPointerDown(event: PointerEvent) {
  if (!open.value || !rootEl.value) return
  if (!rootEl.value.contains(event.target as Node)) {
    open.value = false
  }
}

function onDocKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

function pointerRatio(event: PointerEvent, rect: DOMRect, vertical = false) {
  if (vertical) {
    return clamp((event.clientY - rect.top) / rect.height, 0, 1)
  }
  return clamp((event.clientX - rect.left) / rect.width, 0, 1)
}

function onPalettePointer(event: PointerEvent, rect: DOMRect) {
  // Только локальный HSV — без записи в model (иначе RGB→HSV сбивает hue).
  hsva.value = {
    ...hsva.value,
    s: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    v: 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1),
  }
  hasValue.value = true
}

function onHuePointer(event: PointerEvent, rect: DOMRect) {
  hsva.value = {
    ...hsva.value,
    h: pointerRatio(event, rect) * 360,
  }
  hasValue.value = true
}

function onAlphaPointer(event: PointerEvent, rect: DOMRect) {
  hsva.value = {
    ...hsva.value,
    a: pointerRatio(event, rect),
  }
  hasValue.value = true
}

function applyDragPointer(event: PointerEvent) {
  if (!dragging || !dragRect) return
  if (dragging === 'palette') onPalettePointer(event, dragRect)
  else if (dragging === 'hue') onHuePointer(event, dragRect)
  else onAlphaPointer(event, dragRect)
}

function onWindowPointerMove(event: PointerEvent) {
  if (!dragging || dragPointerId !== event.pointerId) return
  event.preventDefault()
  applyDragPointer(event)
}

function onWindowPointerUp(event: PointerEvent) {
  if (dragPointerId !== null && event.pointerId !== dragPointerId) return
  endDrag()
}

function startDrag(kind: 'palette' | 'hue' | 'alpha', event: PointerEvent) {
  const el = event.currentTarget as HTMLElement | null
  if (!el) return
  event.preventDefault()
  event.stopPropagation()

  dragging = kind
  dragEl = el
  dragRect = el.getBoundingClientRect()
  dragPointerId = event.pointerId
  el.setPointerCapture?.(event.pointerId)

  window.addEventListener('pointermove', onWindowPointerMove, { passive: false })
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointercancel', onWindowPointerUp)

  applyDragPointer(event)
}

function endDrag() {
  if (!dragging) return

  if (dragEl && dragPointerId !== null) {
    try {
      dragEl.releasePointerCapture?.(dragPointerId)
    }
    catch {
      // ignore
    }
  }

  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
  window.removeEventListener('pointercancel', onWindowPointerUp)

  dragging = null
  dragEl = null
  dragRect = null
  dragPointerId = null

  // Один commit в конце драга — без промежуточных RGB↔HSV циклов.
  commit()
}

onMounted(() => {
  if (!model.value && props.field?.defaultValue) {
    model.value = props.field.defaultValue
  }
  syncFromModel()
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onDocKeydown)
})

onBeforeUnmount(() => {
  endDrag()
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onDocKeydown)
})

watch(model, () => {
  if (syncingFromModel || dragging) return
  syncFromModel()
})

watch(formatButtons, (buttons) => {
  if (!buttons.some(btn => btn.id === format.value)) {
    format.value = 'hex'
  }
})
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div
      ref="rootEl"
      :class="rootClass"
    >
      <button
        :id="fieldKey"
        type="button"
        :class="`${rootClass}__chip`"
        @click="toggle"
      >
        <span :class="[`${rootClass}__swatch`, { 'is-empty': !hasValue }]">
          <span :style="{ backgroundColor: previewColor }" />
        </span>
        <span :class="`${rootClass}__value`">{{ displayText }}</span>
      </button>

      <div
        v-if="open"
        :class="[`${rootClass}__popup`, { 'is-drop-up': dropUp }]"
      >
        <div
          v-if="showColorWheel"
          :class="`${rootClass}__selection`"
        >
          <div
            :class="`${rootClass}__palette`"
            @pointerdown="startDrag('palette', $event)"
          >
            <div
              :class="`${rootClass}__palette-layers`"
              :style="paletteLayersStyle"
            >
              <div
                :class="`${rootClass}__palette-hue`"
                :style="paletteHueStyle"
              />
              <div :class="`${rootClass}__palette-white`" />
              <div :class="`${rootClass}__palette-black`" />
            </div>
            <span
              :class="`${rootClass}__picker`"
              :style="pickerStyle"
            />
          </div>

          <div
            :class="`${rootClass}__slider ${rootClass}__slider--hue`"
            @pointerdown="startDrag('hue', $event)"
          >
            <span
              :class="`${rootClass}__picker ${rootClass}__picker--slider`"
              :style="hueStyle"
            />
          </div>

          <div
            v-if="enableOpacity"
            :class="`${rootClass}__slider ${rootClass}__slider--alpha`"
            :style="alphaTrackStyle"
            @pointerdown="startDrag('alpha', $event)"
          >
            <span
              :class="`${rootClass}__picker ${rootClass}__picker--slider`"
              :style="alphaKnobStyle"
            />
          </div>
        </div>

        <div
          v-if="palette.length"
          :class="`${rootClass}__swatches`"
        >
          <button
            v-for="color in palette"
            :key="color"
            type="button"
            :class="`${rootClass}__swatch-btn`"
            :title="color"
            @click="selectSwatch(color)"
          >
            <span :style="{ backgroundColor: color }" />
          </button>
        </div>

        <div :class="`${rootClass}__interaction`">
          <div
            v-if="formatButtons.length > 1"
            :class="`${rootClass}__formats`"
          >
            <button
              v-for="btn in formatButtons"
              :key="btn.id"
              type="button"
              :class="[`${rootClass}__format`, { 'is-active': format === btn.id }]"
              @click="setFormat(btn.id)"
            >
              {{ btn.label }}
            </button>
          </div>

          <input
            v-model="inputText"
            type="text"
            :class="`${rootClass}__input`"
            spellcheck="false"
            placeholder="#000000"
            @keydown.enter.prevent="onInputApply"
            @blur="onInputApply"
          >

          <button
            type="button"
            :class="`${rootClass}__clear`"
            @click="clearValue"
          >
            Очистить
          </button>
        </div>
      </div>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-color-picker-field';
$checker: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'><path fill='white' d='M1,0H2V1H1V0ZM0,1H1V2H0V1Z'/><path fill='gray' d='M0,0H1V1H0V0ZM1,1H2V2H1V1Z'/></svg>");

#{$root} {
  position: relative;
  width: fit-content;
  max-width: 100%;

  &__chip {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 240px;
    height: 38px;
    padding: 0 8px;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background-color: $color-surface;
    cursor: pointer;
    text-align: left;

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 1px;
    }
  }

  &__swatch {
    position: relative;
    flex: 0 0 auto;
    width: 32px;
    height: 24px;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $checker;
    background-size: 8px;
    overflow: hidden;

    &.is-empty {
      background-image: none;
      background-color: transparent;
    }

    > span {
      position: absolute;
      inset: 0;
    }
  }

  &__value {
    font-size: 14px;
    color: $color-muted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__popup {
    position: absolute;
    z-index: 1000;
    top: calc(100% + 6px);
    left: 0;
    width: 224px;
    padding: 8px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    box-shadow: $shadow-md;

    &.is-drop-up {
      top: auto;
      bottom: calc(100% + 6px);
    }
  }

  &__selection {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
  }

  &__palette {
    position: relative;
    width: 100%;
    height: 130px;
    border-radius: $border-radius-inter;
    cursor: crosshair;
    touch-action: none;
    background: $checker;
    background-size: 8px;

    &-layers,
    &-hue,
    &-white,
    &-black {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    &-white {
      background: linear-gradient(to right, #fff, transparent);
    }

    &-black {
      background: linear-gradient(to top, #000, transparent);
    }
  }

  &__picker {
    position: absolute;
    z-index: 2;
    width: 16px;
    height: 16px;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
    transform: translate(-50%, -50%);
    background-color: transparent;
    //pointer-events: none;

    &--slider {
      top: 50%;
      width: 15px;
      height: 15px;
    }
  }

  &__slider {
    position: relative;
    height: 10px;
    border-radius: 999px;
    cursor: pointer;
    touch-action: none;

    &--hue {
      background: linear-gradient(
        to right,
        #f00 0%,
        #ff0 17%,
        #0f0 33%,
        #0ff 50%,
        #00f 67%,
        #f0f 83%,
        #f00 100%
      );
    }

    &--alpha {
      //box-shadow: inset 0 0 0 1px $color-border;
    }
  }

  &__swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 10px;
  }

  &__swatch-btn {
    position: relative;
    width: 25px;
    height: 25px;
    padding: 0;
    border: 1px solid $color-border;
    border-radius: 4px;
    background: $checker;
    background-size: 8px;
    cursor: pointer;
    overflow: hidden;

    > span {
      position: absolute;
      inset: 0;
    }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 1px;
    }
  }

  &__interaction {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__formats {
    display: flex;
    gap: 4px;
  }

  &__format {
    flex: 1;
    height: 28px;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $color-bg;
    color: $color-muted;
    font-size: 11px;
    cursor: pointer;

    &.is-active {
      border-color: $color-accent;
      color: $color-accent;
      background: $color-accent-wash;
      font-weight: 600;
    }
  }

  &__input {
    width: 100%;
    height: 32px;
    padding: 0 8px;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $color-surface;
    color: $color-ink;
    font-size: 13px;

    &:focus {
      outline: none;
      border-color: $color-accent;
    }
  }

  &__clear {
    height: 30px;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $color-bg;
    color: $color-muted;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      color: $color-danger;
      border-color: $color-danger;
    }
  }
}
</style>
