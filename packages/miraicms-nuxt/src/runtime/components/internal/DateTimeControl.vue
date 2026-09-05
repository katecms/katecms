<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'

type PickerMode = 'date' | 'datetime' | 'time'

const props = defineProps({
  // Что выбираем: дату, дату+время или только время.
  mode: {
    type: String as PropType<PickerMode>,
    default: 'date',
  },
  id: {
    type: String,
    default: undefined,
  },
  name: {
    type: String,
    default: undefined,
  },
  required: {
    type: Boolean,
    default: false,
  },
  displayFormat: {
    type: String,
    default: undefined,
  },
  returnFormat: {
    type: String,
    default: undefined,
  },
  firstDay: {
    type: Number,
    default: 1,
  },
  defaultToCurrentDate: {
    type: Boolean,
    default: false,
  },
})

// В model лежит значение строкой в returnFormat.
const model = defineModel<string>()

const rootClass = 'miraicms-date-time-control'

const DEFAULT_FORMATS: Record<PickerMode, { display: string, return: string }> = {
  date: { display: 'DD.MM.YYYY', return: 'YYYY-MM-DD' },
  datetime: { display: 'DD.MM.YYYY HH:mm', return: 'YYYY-MM-DD HH:mm' },
  time: { display: 'HH:mm', return: 'HH:mm' },
}

const DISPLAY_FORMAT = computed(() => props.displayFormat || DEFAULT_FORMATS[props.mode].display)
const RETURN_FORMAT = computed(() => props.returnFormat || DEFAULT_FORMATS[props.mode].return)

const showCalendar = computed(() => props.mode !== 'time')
const showTime = computed(() => props.mode !== 'date')
const hasSeconds = computed(() => /s/.test(RETURN_FORMAT.value) || /s/.test(DISPLAY_FORMAT.value))

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const pad = (n: number) => String(n).padStart(2, '0')

// Дата → строка по формату (токены YYYY/YY/MM/M/DD/D/HH/H/mm/m/ss/s).
function formatDate(date: Date, fmt: string): string {
  const map: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: pad(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    DD: pad(date.getDate()),
    D: String(date.getDate()),
    HH: pad(date.getHours()),
    H: String(date.getHours()),
    mm: pad(date.getMinutes()),
    m: String(date.getMinutes()),
    ss: pad(date.getSeconds()),
    s: String(date.getSeconds()),
  }
  return fmt.replace(/YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g, token => map[token] ?? token)
}

// Строка → дата по формату (или null, если не распарсилось).
// Отсутствующие в формате компоненты берутся: дата — сегодня, время — 00.
function parseDate(value: string, fmt: string): Date | null {
  const tokens: string[] = []
  const pattern = fmt
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g, (token) => {
      tokens.push(token)
      return token.length >= 2 ? `(\\d{${token.length}})` : '(\\d{1,2})'
    })
  const match = value.match(new RegExp(`^${pattern}$`))
  if (!match) {
    return null
  }
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  let day = now.getDate()
  let hour = 0
  let minute = 0
  let second = 0
  tokens.forEach((token, index) => {
    const num = Number.parseInt(match[index + 1]!, 10)
    if (token.startsWith('Y')) {
      year = token === 'YY' ? 2000 + num : num
    }
    else if (token.startsWith('M')) {
      month = num
    }
    else if (token.startsWith('D')) {
      day = num
    }
    else if (token.startsWith('H')) {
      hour = num
    }
    else if (token.startsWith('m')) {
      minute = num
    }
    else {
      second = num
    }
  })
  const date = new Date(year, month - 1, day, hour, minute, second)
  return Number.isNaN(date.getTime()) ? null : date
}

// Выбранное значение, разобранное из model.
const selectedDate = computed(() => (model.value ? parseDate(model.value, RETURN_FORMAT.value) : null))

// То, что показываем в поле.
const displayValue = computed(() => (selectedDate.value ? formatDate(selectedDate.value, DISPLAY_FORMAT.value) : ''))

const open = ref(false)
const today = new Date()

// Месяц, показанный в календаре.
const viewYear = ref((selectedDate.value ?? today).getFullYear())
const viewMonth = ref((selectedDate.value ?? today).getMonth())

// Выбранное время.
const viewHour = ref((selectedDate.value ?? today).getHours())
const viewMinute = ref((selectedDate.value ?? today).getMinutes())
const viewSecond = ref((selectedDate.value ?? today).getSeconds())

const hoursList = Array.from({ length: 24 }, (_, i) => i)
const minutesList = Array.from({ length: 60 }, (_, i) => i)
const secondsList = Array.from({ length: 60 }, (_, i) => i)

// Порядок подписей дней недели с учётом firstDay.
const weekdayLabels = computed(() =>
  Array.from({ length: 7 }, (_, i) => WEEKDAYS[(props.firstDay + i) % 7]),
)

// Ячейки календаря: ведущие пустоты + дни месяца.
const cells = computed<(number | null)[]>(() => {
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const firstWeekday = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const offset = (firstWeekday - props.firstDay + 7) % 7
  const result: (number | null)[] = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= daysInMonth; d++) {
    result.push(d)
  }
  return result
})

function sameDate(a: Date, y: number, m: number, d: number) {
  return a.getFullYear() === y && a.getMonth() === m && a.getDate() === d
}

function isSelected(day: number) {
  return selectedDate.value ? sameDate(selectedDate.value, viewYear.value, viewMonth.value, day) : false
}

function isToday(day: number) {
  return sameDate(today, viewYear.value, viewMonth.value, day)
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  }
  else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  }
  else {
    viewMonth.value++
  }
}

function commit(year: number, month: number, day: number) {
  model.value = formatDate(
    new Date(year, month, day, viewHour.value, viewMinute.value, viewSecond.value),
    RETURN_FORMAT.value,
  )
}

function selectDay(day: number) {
  // Выбор дня применяет выбранное время и закрывает попап.
  commit(viewYear.value, viewMonth.value, day)
  open.value = false
}

// Изменение времени пересобирает model на основе уже выбранной даты.
function applyTime() {
  const base = selectedDate.value ?? today
  commit(base.getFullYear(), base.getMonth(), base.getDate())
}

function onHourChange(event: Event) {
  viewHour.value = Number((event.target as HTMLSelectElement).value)
  applyTime()
}

function onMinuteChange(event: Event) {
  viewMinute.value = Number((event.target as HTMLSelectElement).value)
  applyTime()
}

function onSecondChange(event: Event) {
  viewSecond.value = Number((event.target as HTMLSelectElement).value)
  applyTime()
}

// Список годов для выбора: текущий ± диапазон.
const years = computed(() => {
  const base = today.getFullYear()
  const start = base - 100
  const end = base + 20
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

function onMonthChange(event: Event) {
  viewMonth.value = Number((event.target as HTMLSelectElement).value)
}

function onYearChange(event: Event) {
  viewYear.value = Number((event.target as HTMLSelectElement).value)
}

function selectNow() {
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  viewHour.value = now.getHours()
  viewMinute.value = now.getMinutes()
  viewSecond.value = now.getSeconds()
  commit(now.getFullYear(), now.getMonth(), now.getDate())
  // В режиме только времени выбор «сейчас» сразу закрывает попап.
  if (!showCalendar.value) {
    open.value = false
  }
}

function clear() {
  model.value = ''
  open.value = false
}

// Примерная высота попапа для расчёта направления раскрытия.
const POPUP_HEIGHT = computed(() => {
  if (props.mode === 'time') {
    return 140
  }
  return props.mode === 'datetime' ? 420 : 360
})

const control = ref<HTMLElement>()
const dropUp = ref(false)

// Раскрывать вверх, если снизу не хватает места, а сверху его больше.
function updateDropDirection() {
  if (typeof window === 'undefined' || !control.value) {
    return
  }
  const rect = control.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  dropUp.value = spaceBelow < POPUP_HEIGHT.value && spaceAbove > spaceBelow
}

function toggle() {
  // При открытии показываем месяц/время выбранного значения.
  if (!open.value && selectedDate.value) {
    viewYear.value = selectedDate.value.getFullYear()
    viewMonth.value = selectedDate.value.getMonth()
    viewHour.value = selectedDate.value.getHours()
    viewMinute.value = selectedDate.value.getMinutes()
    viewSecond.value = selectedDate.value.getSeconds()
  }
  if (!open.value) {
    updateDropDirection()
  }
  open.value = !open.value
}

// defaultToCurrentDate: если значения нет — подставляем текущее.
onMounted(() => {
  if (!model.value && props.defaultToCurrentDate) {
    model.value = formatDate(today, RETURN_FORMAT.value)
  }
})

// Закрытие по Escape и клику вне поля.
const root = ref<HTMLElement>()

function onDocEvent(event: Event) {
  if (event instanceof KeyboardEvent) {
    if (event.key === 'Escape') {
      open.value = false
    }
    return
  }
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

watch(open, (isOpen) => {
  if (typeof document === 'undefined') {
    return
  }
  if (isOpen) {
    document.addEventListener('keydown', onDocEvent)
    document.addEventListener('click', onDocEvent)
  }
  else {
    document.removeEventListener('keydown', onDocEvent)
    document.removeEventListener('click', onDocEvent)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onDocEvent)
    document.removeEventListener('click', onDocEvent)
  }
})
</script>

<template>
  <div
    ref="root"
    :class="rootClass"
  >
    <div
      ref="control"
      :class="`${rootClass}__control`"
    >
      <input
        :id="id"
        :value="displayValue"
        type="text"
        readonly
        :class="`${rootClass}__input`"
        :name="name"
        :placeholder="DISPLAY_FORMAT"
        :required="required"
        @click="toggle"
      >

      <div
        v-if="open"
        :class="[`${rootClass}__popup`, { 'is-drop-up': dropUp, 'is-time-only': !showCalendar }]"
      >
        <template v-if="showCalendar">
          <div :class="`${rootClass}__nav`">
            <button
              type="button"
              :class="`${rootClass}__nav-btn`"
              @click="prevMonth"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              ><path d="M201 297a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L269 320l138-137a32 32 0 0 0-46-46z" /></svg>
            </button>

            <div :class="`${rootClass}__selects`">
              <select
                :class="`${rootClass}__select`"
                :value="viewMonth"
                @change="onMonthChange"
              >
                <option
                  v-for="(month, index) in MONTHS"
                  :key="month"
                  :value="index"
                >
                  {{ month }}
                </option>
              </select>

              <select
                :class="`${rootClass}__select`"
                :value="viewYear"
                @change="onYearChange"
              >
                <option
                  v-for="year in years"
                  :key="year"
                  :value="year"
                >
                  {{ year }}
                </option>
              </select>
            </div>

            <button
              type="button"
              :class="`${rootClass}__nav-btn`"
              @click="nextMonth"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              ><path d="M439 297c13 13 13 33 0 46L279 503a32 32 0 0 1-45-46l137-137-137-137a32 32 0 0 1 45-46z" /></svg>
            </button>
          </div>

          <div :class="`${rootClass}__grid`">
            <span
              v-for="label in weekdayLabels"
              :key="label"
              :class="`${rootClass}__weekday`"
            >{{ label }}</span>

            <template v-for="(cell, index) in cells">
              <span
                v-if="cell === null"
                :key="`b-${index}`"
                :class="`${rootClass}__cell`"
              />
              <button
                v-else
                :key="`d-${cell}`"
                type="button"
                :class="[
                  `${rootClass}__cell`,
                  `${rootClass}__day`,
                  { 'is-selected': isSelected(cell), 'is-today': isToday(cell) },
                ]"
                @click="selectDay(cell)"
              >
                {{ cell }}
              </button>
            </template>
          </div>
        </template>

        <div
          v-if="showTime"
          :class="[`${rootClass}__time`, { 'is-standalone': !showCalendar }]"
        >
          <span
            v-if="showCalendar"
            :class="`${rootClass}__time-label`"
          >Время</span>
          <select
            :class="`${rootClass}__select`"
            :value="viewHour"
            @change="onHourChange"
          >
            <option
              v-for="hour in hoursList"
              :key="hour"
              :value="hour"
            >
              {{ pad(hour) }}
            </option>
          </select>
          <span :class="`${rootClass}__time-sep`">:</span>
          <select
            :class="`${rootClass}__select`"
            :value="viewMinute"
            @change="onMinuteChange"
          >
            <option
              v-for="minute in minutesList"
              :key="minute"
              :value="minute"
            >
              {{ pad(minute) }}
            </option>
          </select>
          <template v-if="hasSeconds">
            <span :class="`${rootClass}__time-sep`">:</span>
            <select
              :class="`${rootClass}__select`"
              :value="viewSecond"
              @change="onSecondChange"
            >
              <option
                v-for="second in secondsList"
                :key="second"
                :value="second"
              >
                {{ pad(second) }}
              </option>
            </select>
          </template>
        </div>

        <div :class="`${rootClass}__footer`">
          <button
            type="button"
            :class="`${rootClass}__footer-btn`"
            @click="selectNow"
          >
            Сейчас
          </button>
          <button
            type="button"
            :class="`${rootClass}__footer-btn`"
            @click="clear"
          >
            Очистить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-date-time-control';

#{$root} {

  &__control {
    position: relative;
    width: 100%;
    max-width: 100%;
  }

  &__input {
    width: 100%;
    height: math-rem(38);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    padding: 0 math-rem(10);
    color: $color-ink;
    cursor: pointer;
    background-color: $color-surface;

    &:focus {
      outline: none;
      border-color: $color-accent;
    }
  }

  &__popup {
    position: absolute;
    z-index: 100;
    top: calc(100% + 4px);
    left: 0;
    width: 280px;
    padding: 10px;
    background-color: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    box-shadow: $shadow-md;

    &.is-time-only {
      width: 200px;
    }

    &.is-drop-up {
      top: auto;
      bottom: calc(100% + 4px);
    }
  }

  &__nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__selects {
    display: flex;
    gap: 6px;
  }

  &__select {
    min-width: 58px;
    height: 28px;
    border: 1px solid $color-border;
    border-radius: 5px;
    padding: 0 4px;
    background-color: $color-surface;
    cursor: pointer;

    &:focus {
      outline: none;
    }
  }

  &__nav-btn {
    width: 28px;
    height: 28px;
    border: 1px solid $color-border;
    border-radius: 5px;
    background-color: $color-surface;
    cursor: pointer;
    padding: 0;

    &:focus {
      outline: none;
    }

    svg {
      display: block;
      width: 14px;
      height: 14px;
      margin: auto;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  &__weekday {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    font-size: 12px;
    color: $color-muted;
  }

  &__cell {
    height: 32px;
  }

  &__day {
    border: 0;
    border-radius: 5px;
    background-color: transparent;
    cursor: pointer;

    &:hover {
      background-color: $color-bg;
    }

    &.is-today {
      border: 1px solid $color-accent;
    }

    &.is-selected {
      background-color: $color-accent;
      color: #fff;
    }

    &:focus {
      outline: none;
    }
  }

  &__time {
    display: flex;
    align-items: center;
    //justify-content: center;
    gap: 6px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid $color-border;

    &.is-standalone {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }
  }

  &__time-label {
    margin-right: auto;
    font-size: 13px;
    color: $color-muted;
  }

  &__time-sep {
    font-weight: 600;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid $color-border;
  }

  &__footer-btn {
    padding: 5px 10px;
    border: 1px solid $color-border;
    border-radius: 5px;
    background-color: $color-surface;
    cursor: pointer;

    &:focus {
      outline: none;
    }
  }
}
</style>
