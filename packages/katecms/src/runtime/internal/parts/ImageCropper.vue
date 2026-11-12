<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  src: string
  aspect?: number | null
  mime?: string
}>(), {
  aspect: null,
  mime: 'image/png',
})

const emit = defineEmits<{
  confirm: [blob: Blob | null]
  cancel: []
}>()

const rootClass = 'katecms-image-cropper'

const PAD = 16
const MIN_SIZE = 24

const imgEl = ref<HTMLImageElement>()
const stage = ref<HTMLElement>()
const body = ref<HTMLElement>()

const naturalW = ref(0)
const naturalH = ref(0)
const displayW = ref(0)
const displayH = ref(0)

const rect = ref({ x: 0, y: 0, w: 0, h: 0 })

function initCrop() {
  if (props.aspect) {
    let w = displayW.value
    let h = w / props.aspect
    if (h > displayH.value) {
      h = displayH.value
      w = h * props.aspect
    }
    rect.value = { x: (displayW.value - w) / 2, y: (displayH.value - h) / 2, w, h }
  }
  else {
    rect.value = { x: 0, y: 0, w: displayW.value, h: displayH.value }
  }
}

function fit() {
  const el = body.value
  if (!el || !naturalW.value) {
    return
  }
  const availW = Math.max(1, el.clientWidth - PAD * 2)
  const availH = Math.max(1, el.clientHeight - PAD * 2)
  const ratio = naturalW.value / naturalH.value
  let w = availW
  let h = w / ratio
  if (h > availH) {
    h = availH
    w = h * ratio
  }
  const prevW = displayW.value
  displayW.value = w
  displayH.value = h
  if (prevW && rect.value.w) {
    const k = w / prevW
    rect.value = {
      x: rect.value.x * k,
      y: rect.value.y * k,
      w: rect.value.w * k,
      h: rect.value.h * k,
    }
  }
  else {
    initCrop()
  }
}

function onImgLoad() {
  const el = imgEl.value
  if (!el) {
    return
  }
  naturalW.value = el.naturalWidth
  naturalH.value = el.naturalHeight
  fit()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (body.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => fit())
    resizeObserver.observe(body.value)
  }
})

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

let activeMode: DragMode | null = null
let startPointer = { x: 0, y: 0 }
let startRect = { x: 0, y: 0, w: 0, h: 0 }

function stagePoint(event: PointerEvent) {
  const bounds = stage.value!.getBoundingClientRect()
  return {
    x: Math.min(displayW.value, Math.max(0, event.clientX - bounds.left)),
    y: Math.min(displayH.value, Math.max(0, event.clientY - bounds.top)),
  }
}

function onPointerDown(event: PointerEvent, mode: DragMode) {
  event.preventDefault()
  event.stopPropagation()
  activeMode = mode
  startPointer = stagePoint(event)
  startRect = { ...rect.value }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function resizeFree(px: number, py: number, mode: DragMode) {
  let x1 = startRect.x
  let y1 = startRect.y
  let x2 = startRect.x + startRect.w
  let y2 = startRect.y + startRect.h
  if (mode.includes('e')) {
    x2 = px
  }
  if (mode.includes('w')) {
    x1 = px
  }
  if (mode.includes('s')) {
    y2 = py
  }
  if (mode.includes('n')) {
    y1 = py
  }
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  rect.value = {
    x,
    y,
    w: Math.max(MIN_SIZE, Math.abs(x2 - x1)),
    h: Math.max(MIN_SIZE, Math.abs(y2 - y1)),
  }
}

function resizeAspect(px: number, py: number, mode: DragMode) {
  const aspect = props.aspect
  if (!aspect) {
    return
  }
  const anchorX = mode.includes('w') ? startRect.x + startRect.w : startRect.x
  const anchorY = mode.includes('n') ? startRect.y + startRect.h : startRect.y
  const dirX = mode.includes('w') ? -1 : 1
  const dirY = mode.includes('n') ? -1 : 1

  let w = Math.abs(px - anchorX)
  let h = Math.abs(py - anchorY)
  if (w / h > aspect) {
    h = w / aspect
  }
  else {
    w = h * aspect
  }
  const maxW = dirX === 1 ? displayW.value - anchorX : anchorX
  const maxH = dirY === 1 ? displayH.value - anchorY : anchorY
  if (w > maxW) {
    w = maxW
    h = w / aspect
  }
  if (h > maxH) {
    h = maxH
    w = h * aspect
  }
  if (w < MIN_SIZE) {
    w = MIN_SIZE
    h = w / aspect
  }
  rect.value = {
    x: dirX === 1 ? anchorX : anchorX - w,
    y: dirY === 1 ? anchorY : anchorY - h,
    w,
    h,
  }
}

function onPointerMove(event: PointerEvent) {
  if (!activeMode) {
    return
  }
  const { x: px, y: py } = stagePoint(event)
  if (activeMode === 'move') {
    const dx = px - startPointer.x
    const dy = py - startPointer.y
    rect.value = {
      ...rect.value,
      x: clamp(startRect.x + dx, 0, displayW.value - startRect.w),
      y: clamp(startRect.y + dy, 0, displayH.value - startRect.h),
    }
    return
  }
  if (props.aspect) {
    resizeAspect(px, py, activeMode)
  }
  else {
    resizeFree(px, py, activeMode)
  }
}

function onPointerUp() {
  activeMode = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function apply() {
  const el = imgEl.value
  if (!el || !rect.value.w || !rect.value.h) {
    return
  }
  const scale = naturalW.value / displayW.value
  const sx = rect.value.x * scale
  const sy = rect.value.y * scale
  const sw = rect.value.w * scale
  const sh = rect.value.h * scale

  if (naturalW.value - sw < 1 && naturalH.value - sh < 1) {
    emit('confirm', null)
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw)
  canvas.height = Math.round(sh)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.drawImage(el, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

  const type = props.mime.startsWith('image/') ? props.mime : 'image/png'
  canvas.toBlob(
    (blob) => {
      if (blob) {
        emit('confirm', blob)
      }
    },
    type,
    0.92,
  )
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div :class="rootClass">
    <div
      ref="body"
      :class="`${rootClass}__body`"
    >
      <div
        ref="stage"
        :class="`${rootClass}__stage`"
        :style="{ width: `${displayW}px`, height: `${displayH}px` }"
      >
        <img
          ref="imgEl"
          :src="src"
          crossorigin="anonymous"
          :class="`${rootClass}__img`"
          alt=""
          @load="onImgLoad"
        >

        <div
          :class="`${rootClass}__box`"
          :style="{
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.w}px`,
            height: `${rect.h}px`,
          }"
          @pointerdown="onPointerDown($event, 'move')"
        >
          <span
            :class="[`${rootClass}__handle`, `${rootClass}__handle--nw`]"
            @pointerdown="onPointerDown($event, 'nw')"
          />
          <span
            :class="[`${rootClass}__handle`, `${rootClass}__handle--ne`]"
            @pointerdown="onPointerDown($event, 'ne')"
          />
          <span
            :class="[`${rootClass}__handle`, `${rootClass}__handle--sw`]"
            @pointerdown="onPointerDown($event, 'sw')"
          />
          <span
            :class="[`${rootClass}__handle`, `${rootClass}__handle--se`]"
            @pointerdown="onPointerDown($event, 'se')"
          />
        </div>
      </div>
    </div>

    <div :class="`${rootClass}__footer`">
      <KateCmsUiButton
        tag="button"
        variant="secondary"
        @click="emit('cancel')"
      >
        Cancel
      </KateCmsUiButton>
      <KateCmsUiButton
        tag="button"
        @click="apply"
      >
        Crop
      </KateCmsUiButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-image-cropper';

#{$root} {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: math-rem(16);
    overflow: hidden;
    background-color: $color-ink;
  }

  &__stage {
    position: relative;
    user-select: none;
    touch-action: none;
  }

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  &__box {
    position: absolute;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, .9), 0 0 0 9999px rgba(0, 0, 0, .45);
    cursor: move;
  }

  &__handle {
    position: absolute;
    width: 12px;
    height: 12px;
    background-color: $color-surface;
    border: 1px solid $color-accent;
    border-radius: 50%;

    &--nw {
      top: -6px;
      left: -6px;
      cursor: nwse-resize;
    }

    &--ne {
      top: -6px;
      right: -6px;
      cursor: nesw-resize;
    }

    &--sw {
      bottom: -6px;
      left: -6px;
      cursor: nesw-resize;
    }

    &--se {
      bottom: -6px;
      right: -6px;
      cursor: nwse-resize;
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: math-rem(8);
    padding: math-rem(14) math-rem(16);
    border-top: 1px solid $color-border;
  }
}
</style>
