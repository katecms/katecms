<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue'
import type {
  SelectChoice,
  SelectChoiceItem,
  SelectChoiceValue,
  SelectModelValue,
} from '@katecms/core'
import {
  isSelectChoiceGroup as isGroup,
  selectChoiceValue as getValue,
  walkSelectChoices as walkLeafOptions,
} from '@katecms/core'

interface SelectChip {
  lbl: string
  val: SelectChoiceValue
  img: string
  imgClass: string
}

const rootClass = 'katecms-select'
const EMPTY_IMG = 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\'/>'

const props = withDefaults(defineProps<{
  id?: string
  name?: string
  choices?: SelectChoice[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  selectedOptImage?: boolean
  selectedOptClearable?: boolean
  optionIcon?: boolean
  search?: boolean
  searchClearable?: boolean
  searchPlaceholder?: string
  maxHeight?: number | string
  multiple?: boolean
  min?: number
  max?: number
  allowCustomChoices?: boolean
  ariaLabel?: string
  noResultsText?: string
  addOptionText?: string
}>(), {
  id: '',
  name: '',
  choices: () => [],
  placeholder: '',
  disabled: false,
  required: false,
  selectedOptImage: false,
  selectedOptClearable: false,
  optionIcon: false,
  search: false,
  searchClearable: false,
  searchPlaceholder: '',
  maxHeight: 300,
  multiple: false,
  min: 0,
  max: Infinity,
  allowCustomChoices: false,
  ariaLabel: 'Select',
  noResultsText: 'No Option Found',
  addOptionText: 'Add',
})

const model = defineModel<SelectModelValue>()

const uid = useId()
const listboxId = computed(() => `${rootClass}-listbox-${props.id || uid}`)
const searchId = computed(() => `${rootClass}-search-${props.id || uid}`)

const selectRef = ref<HTMLElement | null>(null)
const selectElement = ref<HTMLSelectElement | null>(null)
const selectionRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const optionsRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const dropdownActive = ref(false)
const positionClass = ref<'below' | 'above'>('below')
const searchTerm = ref('')
const highlightedIndex = ref(-1)
const customOptions = ref<SelectChoiceItem[]>([])
const tabPressed = ref(false)

const isMobileOrTablet = ref(false)
const isIos = ref(false)

function valuesEqual(a: unknown, b: unknown): boolean {
  return String(a ?? '') === String(b ?? '')
}

function flattenOptions(options: SelectChoice[]): SelectChoiceItem[] {
  const result: SelectChoiceItem[] = []
  walkLeafOptions(options, opt => result.push(opt))
  return result
}

const allOptions = computed(() => [
  ...flattenOptions(props.choices),
  ...customOptions.value,
])

function findOption(value: unknown): SelectChoiceItem | undefined {
  return allOptions.value.find(opt => valuesEqual(getValue(opt), value))
}

function findLbl(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  const found = findOption(value)
  if (found) return found.lbl || String(getValue(found))
  return String(value)
}

function findImage(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  return findOption(value)?.img ?? ''
}

function imageSrc(image?: string): string {
  return image || EMPTY_IMG
}

function emptySingle(): '' {
  return ''
}

function emptyMultiple(): SelectChoiceValue[] {
  return []
}

function normalizeModel(value: SelectModelValue | undefined): SelectChoiceValue | SelectChoiceValue[] | '' {
  if (props.multiple) {
    if (Array.isArray(value)) return value
    if (value === null || value === undefined || value === '') return emptyMultiple()
    return [value]
  }
  if (Array.isArray(value)) return value[0] ?? emptySingle()
  if (value === null || value === undefined) return emptySingle()
  return value
}

function findCheckedValue(): SelectChoiceValue | SelectChoiceValue[] | null {
  if (props.multiple) {
    const checked: SelectChoiceValue[] = []
    walkLeafOptions(props.choices, (opt) => {
      if (opt.check === true) checked.push(getValue(opt))
    })
    return checked.length ? checked : null
  }

  let found: SelectChoiceValue | null = null
  walkLeafOptions(props.choices, (opt) => {
    if (found === null && opt.check === true) found = getValue(opt)
  })
  return found
}

function getFirstAvailableOption(): SelectChoiceItem | null {
  for (const opt of flattenOptions(props.choices)) {
    if (!opt.disabled && (opt.val !== undefined || opt.lbl)) {
      return opt
    }
  }
  return null
}

function resolveInitialValue(): SelectChoiceValue | SelectChoiceValue[] | '' {
  const checked = findCheckedValue()
  if (checked !== null) return checked

  if (!props.multiple && !props.placeholder) {
    const first = getFirstAvailableOption()
    if (first) return getValue(first)
  }

  return props.multiple ? emptyMultiple() : emptySingle()
}

const modelWasProvided = model.value !== undefined

function ensureModelSeeded() {
  if (modelWasProvided) return
  model.value = resolveInitialValue()
}

ensureModelSeeded()

const selectedValue = computed({
  get(): SelectChoiceValue | SelectChoiceValue[] | '' {
    return normalizeModel(model.value)
  },
  set(value: SelectChoiceValue | SelectChoiceValue[] | '') {
    model.value = value
  },
})

/** Native <select> always deals in strings. */
const nativeModel = computed({
  get(): string | string[] {
    const value = selectedValue.value
    if (props.multiple) {
      return (Array.isArray(value) ? value : []).map(String)
    }
    return String(value ?? '')
  },
  set(value: string | string[]) {
    if (props.multiple) {
      const next = Array.isArray(value) ? value : []
      // Preserve original types from known options when possible.
      setMultiple(next.map((raw) => {
        const found = findOption(raw)
        return found ? getValue(found) : raw
      }))
      return
    }
    const raw = Array.isArray(value) ? value[0] ?? '' : value
    if (raw === '') {
      setSingle('')
      return
    }
    const found = findOption(raw)
    setSingle(found ? getValue(found) : raw)
  },
})

const selectedArray = computed(() => {
  const value = selectedValue.value
  return Array.isArray(value) ? value : []
})

const hasSelection = computed(() => {
  const value = selectedValue.value
  return Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined
})

const canClearAll = computed(() => {
  if (!props.selectedOptClearable || !hasSelection.value || props.disabled) return false
  if (props.multiple) return selectedArray.value.length > props.min
  return true
})

const isSelected = (optionValue: SelectChoiceValue): boolean => {
  const val = selectedValue.value
  if (Array.isArray(val)) return val.some(v => valuesEqual(v, optionValue))
  return valuesEqual(val, optionValue)
}

const atMax = computed(() =>
  props.multiple && selectedArray.value.length >= props.max,
)

const atMin = computed(() =>
  props.multiple && selectedArray.value.length <= props.min,
)

function isOptionDisabled(opt: SelectChoiceItem): boolean {
  if (opt.disabled) return true
  return props.multiple && atMax.value && !isSelected(getValue(opt))
}

const defaultLabel = computed(() => {
  if (props.placeholder) return props.placeholder

  const first = getFirstAvailableOption()
  return first ? String(getValue(first)) : ''
})

const displayValue = computed<string | SelectChip[]>(() => {
  const value = selectedValue.value

  if (props.multiple) {
    if (Array.isArray(value) && value.length) {
      return value.map((v) => {
        const img = findImage(v)
        return {
          lbl: findLbl(v),
          val: v,
          img: imageSrc(img || undefined),
          imgClass: img ? '' : 'no-img',
        }
      })
    }
    return props.placeholder || ''
  }

  if (value === '' || value === null || value === undefined) {
    return props.placeholder || findLbl(defaultLabel.value)
  }

  return findLbl(value) || props.placeholder || findLbl(defaultLabel.value)
})

const displayImage = computed(() => {
  const value = selectedValue.value
  const empty = value === '' || value === null || value === undefined
  const image = empty
    ? (props.placeholder ? '' : findImage(defaultLabel.value))
    : findImage(value)
  return {
    src: imageSrc(image || undefined),
    class: image ? '' : 'no-img',
  }
})

const isPlaceholderShown = computed(() => {
  const value = selectedValue.value
  const empty = Array.isArray(value) ? value.length === 0 : value === ''
  return empty && !!props.placeholder
})

function filterOptions(options: SelectChoice[], term: string): SelectChoice[] {
  if (!term.trim()) return options
  const lower = term.toLowerCase()

  return options
    .map((opt) => {
      if (isGroup(opt)) {
        const childs = filterOptions(opt.childs ?? [], term) as SelectChoiceItem[]
        return childs.length ? { ...opt, childs } : null
      }
      const lbl = opt.lbl?.toLowerCase() ?? ''
      const val = String(opt.val ?? '').toLowerCase()
      return lbl.includes(lower) || val.includes(lower) ? opt : null
    })
    .filter((opt): opt is SelectChoice => opt !== null)
}

const filteredOptions = computed(() => {
  const base = filterOptions(props.choices, searchTerm.value)
  const term = searchTerm.value.trim().toLowerCase()
  if (!term || !customOptions.value.length) return base

  const matchedCustom = customOptions.value.filter((opt) => {
    const lbl = opt.lbl.toLowerCase()
    const val = String(opt.val ?? '').toLowerCase()
    return lbl.includes(term) || val.includes(term)
  })

  return matchedCustom.length ? [...base, ...matchedCustom] : base
})

const flatFiltered = computed(() => flattenOptions(filteredOptions.value))

const optionIndexMap = computed(() => {
  const map = new Map<SelectChoiceItem, number>()
  flatFiltered.value.forEach((opt, index) => map.set(opt, index))
  return map
})

function optionIndex(opt: SelectChoiceItem): number {
  return optionIndexMap.value.get(opt) ?? -1
}

const canAddCustom = computed(() => {
  if (!props.allowCustomChoices || !props.search) return false
  const term = searchTerm.value.trim()
  if (!term) return false
  return !allOptions.value.some((opt) => {
    const lbl = opt.lbl.toLowerCase()
    const val = String(getValue(opt)).toLowerCase()
    const lower = term.toLowerCase()
    return lbl === lower || val === lower
  })
})

const dropdownMaxHeight = computed(() => {
  const value = props.maxHeight
  return typeof value === 'number' ? `${value}px` : value
})

const useCustomDropdown = computed(() => !isMobileOrTablet.value || isIos.value)

function closeDropdown() {
  dropdownActive.value = false
  highlightedIndex.value = -1
  searchTerm.value = ''
}

function openDropdown() {
  if (props.disabled) return
  dropdownActive.value = true
  nextTick(() => {
    updatePosition()
    if (props.search) searchInputRef.value?.focus()
    scrollHighlightedIntoView()
  })
}

function toggleDropdown(e?: Event) {
  const target = e?.target as HTMLElement | undefined
  if (target?.closest(`.${rootClass}__clear`) || target?.closest(`.${rootClass}__chip-clear`)) {
    return
  }
  if (props.disabled) return

  if (useCustomDropdown.value) {
    if (dropdownActive.value) closeDropdown()
    else openDropdown()
  }
  else if (selectElement.value) {
    selectElement.value.showPicker?.()
  }
}

function setSingle(value: SelectChoiceValue | '') {
  selectedValue.value = value
}

function setMultiple(values: SelectChoiceValue[]) {
  selectedValue.value = values
}

function selectOption(value: SelectChoiceValue) {
  const opt = findOption(value)
  if (opt?.disabled) return

  if (props.multiple) {
    const current = [...selectedArray.value]
    const index = current.findIndex(v => valuesEqual(v, value))

    if (index >= 0) {
      if (current.length <= props.min) return
      current.splice(index, 1)
      setMultiple(current)
      return
    }

    if (current.length >= props.max) return
    setMultiple([...current, value])
    return
  }

  setSingle(value)
  closeDropdown()
}

function clearAll() {
  if (!canClearAll.value) return
  if (props.multiple) {
    if (props.min > 0) {
      setMultiple(selectedArray.value.slice(0, props.min))
    }
    else {
      setMultiple(emptyMultiple())
    }
  }
  else {
    setSingle(emptySingle())
  }
  closeDropdown()
}

function clearChip(value: SelectChoiceValue) {
  if (!props.multiple || props.disabled) return
  if (selectedArray.value.length <= props.min) return
  setMultiple(selectedArray.value.filter(v => !valuesEqual(v, value)))
}

function addCustomOption() {
  if (!canAddCustom.value) return
  const term = searchTerm.value.trim()
  const option: SelectChoiceItem = { val: term, lbl: term }
  customOptions.value = [...customOptions.value, option]

  if (props.multiple) {
    if (selectedArray.value.length >= props.max) return
    setMultiple([...selectedArray.value, term])
  }
  else {
    setSingle(term)
    closeDropdown()
  }
  searchTerm.value = ''
}

function updatePosition() {
  if (!dropdownActive.value || !dropdownRef.value || !selectionRef.value) return

  const triggerRect = selectionRef.value.getBoundingClientRect()
  const elementHeight = dropdownRef.value.offsetHeight
  const viewportHeight = window.innerHeight
  const hasSpaceAbove = triggerRect.top - elementHeight > 0
  const hasSpaceBelow = triggerRect.bottom + elementHeight < viewportHeight

  positionClass.value = hasSpaceBelow || !hasSpaceAbove ? 'below' : 'above'
}

function scrollHighlightedIntoView() {
  const container = optionsRef.value
  if (!container || highlightedIndex.value < 0) return
  const el = container.querySelector<HTMLElement>(
    `[data-option-index="${highlightedIndex.value}"]`,
  )
  el?.scrollIntoView({ block: 'nearest' })
}

function moveHighlight(delta: number) {
  const items = flatFiltered.value
  if (!items.length && !canAddCustom.value) return

  const total = items.length + (canAddCustom.value ? 1 : 0)
  if (!dropdownActive.value) openDropdown()

  let next = highlightedIndex.value
  if (next < 0) next = delta > 0 ? 0 : total - 1
  else next = (next + delta + total) % total

  highlightedIndex.value = next
  nextTick(scrollHighlightedIntoView)
}

function activateHighlighted() {
  const items = flatFiltered.value
  if (highlightedIndex.value < 0) return

  if (highlightedIndex.value >= items.length) {
    addCustomOption()
    return
  }

  const opt = items[highlightedIndex.value]
  if (!opt || isOptionDisabled(opt)) return
  selectOption(getValue(opt))
}

function onSelectionKeydown(e: KeyboardEvent) {
  if (props.disabled) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (!dropdownActive.value) openDropdown()
      else moveHighlight(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      if (!dropdownActive.value) openDropdown()
      else moveHighlight(-1)
      break
    case 'Home':
      if (dropdownActive.value) {
        e.preventDefault()
        highlightedIndex.value = 0
        nextTick(scrollHighlightedIntoView)
      }
      break
    case 'End': {
      if (dropdownActive.value) {
        e.preventDefault()
        const total = flatFiltered.value.length + (canAddCustom.value ? 1 : 0)
        highlightedIndex.value = Math.max(0, total - 1)
        nextTick(scrollHighlightedIntoView)
      }
      break
    }
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (!dropdownActive.value) openDropdown()
      else activateHighlighted()
      break
    case 'Escape':
      if (dropdownActive.value) {
        e.preventDefault()
        closeDropdown()
      }
      break
    case 'Tab':
      tabPressed.value = true
      break
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      moveHighlight(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      moveHighlight(-1)
      break
    case 'Enter':
      e.preventDefault()
      if (canAddCustom.value && (highlightedIndex.value < 0 || highlightedIndex.value >= flatFiltered.value.length)) {
        addCustomOption()
      }
      else {
        activateHighlighted()
      }
      break
    case 'Escape':
      e.preventDefault()
      closeDropdown()
      selectionRef.value?.focus()
      break
  }
}

function onFocusOut(e: FocusEvent) {
  if (
    tabPressed.value
    && !selectRef.value?.contains(e.relatedTarget as Node | null)
  ) {
    closeDropdown()
  }
  tabPressed.value = false
}

function onDocPointerDown(e: PointerEvent) {
  if (!dropdownActive.value || !selectRef.value) return
  if (!selectRef.value.contains(e.target as Node)) closeDropdown()
}

function onViewportChange() {
  if (dropdownActive.value) updatePosition()
}

function detectDevice() {
  if (!import.meta.client) return
  const ua = navigator.userAgent
  isIos.value = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  isMobileOrTablet.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    || ('ontouchstart' in window && window.innerWidth < 1024)
}

watch(dropdownActive, (open) => {
  if (open) {
    highlightedIndex.value = flatFiltered.value.findIndex(opt => isSelected(getValue(opt)))
    nextTick(updatePosition)
  }
})

watch(searchTerm, () => {
  highlightedIndex.value = flatFiltered.value.length || canAddCustom.value ? 0 : -1
})

watch(() => props.choices, () => {
  if (!modelWasProvided && !hasSelection.value) {
    model.value = resolveInitialValue()
  }
})

onMounted(() => {
  detectDevice()
  document.addEventListener('pointerdown', onDocPointerDown)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})

defineExpose({
  selectElement,
  openDropdown,
  closeDropdown,
})
</script>

<template>
  <div
    ref="selectRef"
    :class="[rootClass, positionClass, { [`${rootClass}--disabled`]: disabled, [`${rootClass}--open`]: dropdownActive }]"
    @keydown.tab="tabPressed = true"
    @focusout="onFocusOut"
  >
    <select
      :id="id || undefined"
      ref="selectElement"
      v-model="nativeModel"
      :name="name || undefined"
      :disabled="disabled"
      :required="required"
      :multiple="multiple || undefined"
      aria-hidden="true"
      tabindex="-1"
    >
      <option
        v-if="placeholder"
        value=""
      >
        {{ placeholder }}
      </option>

      <template
        v-for="(opt, i) in choices"
        :key="isGroup(opt) ? `g-${opt.title}-${i}` : `o-${getValue(opt)}-${i}`"
      >
        <optgroup
          v-if="isGroup(opt)"
          :label="opt.title"
          :disabled="opt.disabled"
        >
          <option
            v-for="child in opt.childs"
            :key="String(getValue(child))"
            :value="String(getValue(child))"
            :disabled="child.disabled"
          >
            {{ child.lbl }}
          </option>
        </optgroup>

        <option
          v-else
          :value="String(getValue(opt))"
          :disabled="opt.disabled"
        >
          {{ opt.lbl }}
        </option>
      </template>

      <option
        v-for="opt in customOptions"
        :key="`custom-${getValue(opt)}`"
        :value="String(getValue(opt))"
      >
        {{ opt.lbl }}
      </option>
    </select>

    <div
      ref="selectionRef"
      :class="[`${rootClass}__selection`, { active: dropdownActive }]"
      role="combobox"
      :aria-label="ariaLabel"
      :aria-expanded="dropdownActive"
      :aria-controls="listboxId"
      aria-haspopup="listbox"
      :aria-activedescendant="highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined"
      :aria-disabled="disabled || undefined"
      :tabindex="disabled ? -1 : 0"
      @click="toggleDropdown"
      @keydown="onSelectionKeydown"
    >
      <div
        v-if="selectedOptImage && (!multiple || (multiple && !Array.isArray(displayValue)))"
        :class="[`${rootClass}__image`]"
      >
        <img
          :key="String(selectedValue ?? '')"
          :src="displayImage.src"
          :class="displayImage.class || undefined"
          aria-hidden="true"
          alt=""
        >
      </div>

      <div
        :class="[
          `${rootClass}__text`,
          { [`${rootClass}__text--placeholder`]: isPlaceholderShown },
          { [`${rootClass}__text--multiple`]: Array.isArray(displayValue) },
        ]"
      >
        <template v-if="Array.isArray(displayValue)">
          <div
            v-for="chip in displayValue"
            :key="String(chip.val)"
            :class="[`${rootClass}__chip`]"
          >
            <img
              v-if="selectedOptImage"
              :src="chip.img"
              :class="chip.imgClass || undefined"
              aria-hidden="true"
              alt=""
            >
            {{ chip.lbl }}
            <button
              type="button"
              :class="[`${rootClass}__chip-clear`]"
              :aria-label="`Remove ${chip.lbl}`"
              :disabled="disabled || atMin"
              :tabindex="dropdownActive ? 0 : -1"
              @click.stop="clearChip(chip.val)"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M9.75 3.25L3.25 9.75"
                  stroke="currentColor"
                  stroke-width="1.08333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M3.25 3.25L9.75 9.75"
                  stroke="currentColor"
                  stroke-width="1.08333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </template>
        <template v-else>
          <span>{{ displayValue }}</span>
        </template>
      </div>

      <button
        v-if="canClearAll"
        type="button"
        :class="[`${rootClass}__clear`]"
        aria-label="Clear selected value"
        tabindex="0"
        @click.stop="clearAll"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M9.75 3.25L3.25 9.75"
            stroke="currentColor"
            stroke-width="1.08333"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M3.25 3.25L9.75 9.75"
            stroke="currentColor"
            stroke-width="1.08333"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <div
        :class="[`${rootClass}__arrow`, { active: dropdownActive }]"
        aria-hidden="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.82683 15.181C9.47787 15.832 10.5352 15.832 11.1862 15.181L19.5195 6.84766C20.1706 6.19661 20.1706 5.13932 19.5195 4.48828C18.8685 3.83724 17.8112 3.83724 17.1602 4.48828L10.0039 11.6445L2.84766 4.49349C2.19662 3.84245 1.13932 3.84245 0.488281 4.49349C-0.16276 5.14453 -0.16276 6.20182 0.488281 6.85287L8.82162 15.1862L8.82683 15.181Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>

    <div
      v-if="useCustomDropdown"
      :id="listboxId"
      ref="dropdownRef"
      :class="[`${rootClass}__dropdown`, { active: dropdownActive }]"
      role="listbox"
      :aria-multiselectable="multiple || undefined"
      :aria-hidden="(!dropdownActive) || undefined"
    >
      <div
        v-if="search"
        :class="[`${rootClass}__search`]"
      >
        <input
          :id="searchId"
          ref="searchInputRef"
          v-model="searchTerm"
          type="search"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :tabindex="dropdownActive ? 0 : -1"
          :placeholder="searchPlaceholder || undefined"
          @keydown="onSearchKeydown"
          @click.stop
        >

        <button
          v-if="searchClearable && searchTerm"
          type="button"
          :class="[`${rootClass}__search-clear`]"
          aria-label="Clear search"
          :tabindex="dropdownActive ? 0 : -1"
          @click.stop="searchTerm = ''"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M9.75 3.25L3.25 9.75"
              stroke="currentColor"
              stroke-width="1.08333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M3.25 3.25L9.75 9.75"
              stroke="currentColor"
              stroke-width="1.08333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        ref="optionsRef"
        :class="[`${rootClass}__options`]"
      >
        <template
          v-for="(opt, i) in filteredOptions"
          :key="isGroup(opt) ? `fg-${opt.title}-${i}` : `fo-${getValue(opt)}-${i}`"
        >
          <div
            v-if="isGroup(opt)"
            :class="[`${rootClass}__optgroup`]"
            :data-disabled="opt.disabled || undefined"
          >
            <div :class="[`${rootClass}__optgroup-title`]">
              {{ opt.title }}
            </div>

            <button
              v-for="child in opt.childs"
              :id="`${listboxId}-opt-${optionIndex(child)}`"
              :key="String(getValue(child))"
              type="button"
              role="option"
              :class="[
                `${rootClass}__option`,
                { [`${rootClass}__option--highlighted`]: highlightedIndex === optionIndex(child) },
              ]"
              :data-option-index="optionIndex(child)"
              :aria-selected="isSelected(getValue(child))"
              :disabled="isOptionDisabled(child) || opt.disabled"
              :tabindex="dropdownActive ? 0 : -1"
              @click="selectOption(getValue(child))"
              @mouseenter="highlightedIndex = optionIndex(child)"
            >
              <img
                v-if="optionIcon"
                :src="imageSrc(child.img)"
                :class="{ 'no-img': !child.img }"
                aria-hidden="true"
                alt=""
              >
              <span>
                {{ child.lbl }}
              </span>
            </button>
          </div>

          <button
            v-else
            :id="`${listboxId}-opt-${optionIndex(opt)}`"
            type="button"
            role="option"
            :class="[
              `${rootClass}__option`,
              { [`${rootClass}__option--highlighted`]: highlightedIndex === optionIndex(opt) },
            ]"
            :data-option-index="optionIndex(opt)"
            :aria-selected="isSelected(getValue(opt))"
            :disabled="isOptionDisabled(opt)"
            :tabindex="dropdownActive ? 0 : -1"
            @click="selectOption(getValue(opt))"
            @mouseenter="highlightedIndex = optionIndex(opt)"
          >
            <img
              v-if="optionIcon"
              :src="imageSrc(opt.img)"
              :class="{ 'no-img': !opt.img }"
              aria-hidden="true"
              alt=""
            >
            <span>
              {{ opt.lbl }}
            </span>
          </button>
        </template>

        <button
          v-if="canAddCustom"
          :id="`${listboxId}-opt-${flatFiltered.length}`"
          type="button"
          role="option"
          :class="[
            `${rootClass}__option`,
            `${rootClass}__option--custom`,
            { [`${rootClass}__option--highlighted`]: highlightedIndex === flatFiltered.length },
          ]"
          :data-option-index="flatFiltered.length"
          aria-selected="false"
          :tabindex="dropdownActive ? 0 : -1"
          @click="addCustomOption"
          @mouseenter="highlightedIndex = flatFiltered.length"
        >
          {{ addOptionText }} "{{ searchTerm.trim() }}"
        </button>

        <div
          v-if="!filteredOptions.length && !canAddCustom"
          :class="[`${rootClass}__no-results`]"
        >
          {{ noResultsText }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: ".katecms-select";

#{$root} {
  position: relative;
  width: 100%;

  &--disabled {
    #{$root}__selection {
      cursor: not-allowed;
      opacity: .6;
      background-color: $color-bg;
    }
  }

  select {
    opacity: 0;
    visibility: hidden;
    border: 0 !important;
    clip: rect(0 0 0 0) !important;
    clip-path: inset(50%) !important;
    height: 1px !important;
    overflow: hidden !important;
    padding: 0 !important;
    position: absolute !important;
    width: 1px !important;
    white-space: nowrap !important;
  }

  &.below {
    #{$root}__dropdown {
      top: calc(100% + 5px);
      box-shadow: 0 8px 15px rgba(20, 26, 42, 0.1);
    }
  }

  &.above {
    #{$root}__dropdown {
      bottom: calc(100% + 5px);
      box-shadow: 0 -8px 15px rgba(20, 26, 42, 0.1);
    }
  }

  &__selection {
    width: 100%;
    background-color: $color-surface;
    display: flex;
    justify-content: space-between;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    cursor: pointer;
    position: relative;
    padding: 0 10px;
    gap: math-rem(8);

    &:focus-visible {
      outline: 2px solid color-alpha($color-accent, .4);
      outline-offset: 2px;
    }
  }

  &__image {
    flex: 0 0 25px;
    align-content: center;

    img {
      display: block;
      width: 100%;
      height: 17px !important;
      object-fit: contain;
      border-radius: 3px;
      background-color: $color-border;

      &.no-img {
        background-color: $color-border;
      }
    }
  }

  &__text {
    min-height: 36px;
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%;
    text-align: left;
    line-height: 1.5;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    color: $color-ink;
    overflow: hidden;

    &--placeholder {
      color: $color-muted;
    }

    &--multiple {
      padding-top: 3px;
      padding-bottom: 3px;
    }

    > span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  &__chip {
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: $color-bg;
    border-radius: 3px;
    padding: 5px 10px;
    font-size: math-rem(13);

    img {
      width: 25px;
      height: 17px !important;
      object-fit: contain;
      object-position: center;
      background-color: $color-border;

      &.no-img {
        background-color: $color-border;
      }
    }

    &-clear {
      width: 20px;
      height: 20px;
      align-content: center;
      align-self: center;
      border: none;
      border-radius: 3px;
      background-color: transparent;
      padding: 0;
      color: $color-muted;
      cursor: pointer;
      transition: background-color .2s;

      &:hover:not(:disabled) {
        background-color: $color-border;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: .4;
      }

      svg {
        width: 18px;
        height: auto;
        display: block;
        margin-inline: auto;
      }
    }
  }

  &__clear {
    width: 20px;
    height: 20px;
    align-content: center;
    align-self: center;
    border: none;
    border-radius: 3px;
    background-color: transparent;
    padding: 0;
    color: $color-muted;
    cursor: pointer;
    transition: background-color .2s;

    &:hover {
      background-color: $color-border;
    }

    svg {
      width: 18px;
      height: auto;
      display: block;
      margin-inline: auto;
    }
  }

  &__arrow {
    flex: 0 0 10px;
    max-width: 10px;
    display: flex;
    align-items: center;
    color: $color-muted;

    svg {
      width: 10px;
      height: auto;
      display: block;
      transition: transform .3s;
    }

    &.active svg {
      transform: rotate(180deg);
    }
  }

  &__dropdown {
    position: absolute;
    z-index: 900;
    background-color: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    left: 0;
    width: 100%;
    max-height: v-bind(dropdownMaxHeight);
    display: none;

    &.active {
      display: flex;
      flex-direction: column;
    }
  }

  &__search {
    padding: 8px;
    position: relative;

    input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid $color-border;
      border-radius: $border-radius-inter;
      padding: 0 28px 0 10px;
      font: inherit;
      font-size: math-rem(15);
      height: math-rem(36);
      outline: none;
    }

    &-clear {
      position: absolute;
      top: 50%;
      right: 15px;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      align-content: center;
      border: none;
      border-radius: 3px;
      background-color: transparent;
      padding: 0;
      color: $color-muted;
      cursor: pointer;
      transition: background-color .2s;

      &:hover {
        background-color: $color-border;
      }

      svg {
        width: 18px;
        height: auto;
        display: block;
        margin-inline: auto;
      }
    }
  }

  &__options {
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  &__no {
    &-results {
      text-align: center;
      padding: math-rem(10) math-rem(8);
      font-size: math-rem(14);
      color: $color-muted;
    }
  }

  &__optgroup {
    &:not(:last-child) {
      border-bottom: 1px solid $color-border;
    }

    &-title {
      padding: 0 10px;
      line-height: 32px;
      font-weight: 700;
      cursor: default;
      color: $color-ink;

      &:not(:last-child) {
        border-bottom: 1px solid $color-border;
      }
    }

    #{$root}__option {
      padding-left: 25px;
    }
  }

  &__option {
    width: 100%;
    min-height: math-rem(34);
    border: none;
    background-color: transparent;
    text-align: left;
    padding: 0 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: $color-ink;
    cursor: pointer;
    font: inherit;
    overflow: hidden;

    img {
      display: block;
      width: 25px;
      height: 25px !important;
      object-fit: contain;
      border-radius: 3px;

      &.no-img {
        background-color: $color-border;
      }
    }

    &:not(:last-child) {
      border-bottom: 1px solid $color-border;
    }

    &:first-child {
      border-radius: 3px 3px 0 0;
    }

    &:last-child {
      border-radius: 0 0 3px 3px;
    }

    &[aria-selected="true"] {
      background-color: $color-accent;
      color: $color-on-accent;
    }

    &--highlighted:not([aria-selected="true"]):not([disabled]) {
      background-color: $color-bg;
    }

    &--custom {
      font-style: italic;
      color: $color-accent;
    }

    &[disabled] {
      cursor: not-allowed;
      color: $color-muted;
      background-color: $color-bg;
    }

    &:hover:not([aria-selected="true"]):not([disabled]) {
      background-color: $color-accent-wash;
      border-bottom-color: $color-accent-wash;
    }

    > span {
      overflow: hidden;
    }
  }
}
</style>
