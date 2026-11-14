<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Field, OsmMarker, OsmMarkerValue } from '@katecms/core'
import {
  emptyOsmAddress,
  isOsmMarker,
  osmAddressFromNominatim,
} from '@katecms/core'
import type {
  Control as LeafletControl,
  DivIcon as LeafletDivIcon,
  LatLngLiteral,
  LeafletMouseEvent,
  LocationEvent,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from 'leaflet'

type OpenStreetMapFieldConfig = Extract<Field, { type: 'open_street_map' }>

type GeocodingResult = {
  name: string
  html?: string
  center: { lat: number, lng: number }
  properties?: {
    place_id?: number | string
    address?: Record<string, string | undefined>
    display_name?: string
  }
}

type LeafletModule = typeof import('leaflet')

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: OpenStreetMapFieldConfig
}>(), {
  field: () => ({ type: 'open_street_map', label: '' }),
})

const model = defineModel<OsmMarkerValue>()

const rootClass = 'katecms-open-street-map-field'
const markerClass = 'katecms-osm-marker'
const mapEl = ref<HTMLElement | null>(null)
const searchEl = ref<HTMLElement | null>(null)
const selectedIndex = ref(0)

const DEFAULT_LAT = 53.55064
const DEFAULT_LNG = 10.00065
const DEFAULT_ZOOM = 12

const ADDRESS_FORMAT = {
  street: '{building} {road} {house_number}',
  city: '{postcode} {city} {town} {village} {hamlet}',
  country: '{state} {country}',
}

let L: LeafletModule | null = null
let map: LeafletMap | null = null
let markerIcon: LeafletDivIcon | null = null
let selectedMarkerIcon: LeafletDivIcon | null = null
let markers: LeafletMarker[] = []
let locateControl: LeafletControl | null = null
let fitBoundsControl: LeafletControl | null = null
let geocoderControl: LeafletControl | null = null
let nominatimGeocoder: {
  reverse: (location: LatLngLiteral, scale: number) => Promise<GeocodingResult[]>
} | null = null
let syncingFromModel = false
let onMarkGeocodeHandler: ((event: { geocode: GeocodingResult }) => void) | null = null

const isMultiple = computed(() => !!props.field?.multiple)
const mapHeight = computed(() => props.field?.height ?? 400)

const centerLat = computed(() => {
  const raw = props.field?.centerLat
  const n = raw != null && raw !== '' ? Number(raw) : Number.NaN
  return Number.isFinite(n) ? n : DEFAULT_LAT
})

const centerLng = computed(() => {
  const raw = props.field?.centerLng
  const n = raw != null && raw !== '' ? Number(raw) : Number.NaN
  return Number.isFinite(n) ? n : DEFAULT_LNG
})

const initialZoom = computed(() => {
  const z = props.field?.zoom
  return typeof z === 'number' && Number.isFinite(z) ? z : DEFAULT_ZOOM
})

const markersList = computed<OsmMarker[]>(() => {
  const value = model.value
  if (isMultiple.value) {
    return Array.isArray(value) ? value : []
  }
  if (Array.isArray(value)) {
    return value[0] && isOsmMarker(value[0]) ? [value[0]] : []
  }
  if (value && isOsmMarker(value)) {
    return [value]
  }
  return []
})

const hasMarker = computed(() => markersList.value.length > 0)

function addressFromResult(result?: GeocodingResult) {
  return osmAddressFromNominatim(result?.properties?.address)
}

function interpolate(template: string, data: Record<string, string>): string {
  return template.replace(/\{(.+?)\}/g, (_, key: string) => data[key] ?? '')
}

function formatNominatimAddress(result: { address?: Record<string, string | undefined> }): string {
  const addr = {
    ...emptyOsmAddress(),
    ...Object.fromEntries(
      Object.entries(result.address ?? {}).filter(([, value]) => typeof value === 'string'),
    ),
  }

  return [
    interpolate(ADDRESS_FORMAT.street, addr),
    interpolate(ADDRESS_FORMAT.city, addr),
    interpolate(ADDRESS_FORMAT.country, addr),
  ]
    .map(part => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(', ')
}

function parseGeocodeResult(results: GeocodingResult[], latlng: LatLngLiteral): string {
  if (!results.length) {
    return `${latlng.lat}, ${latlng.lng}`
  }
  const last = results[results.length - 1]!
  const html = (last.html || last.name || '').trim()
  return html || `${latlng.lat}, ${latlng.lng}`
}

function placeIdFromResult(result?: GeocodingResult): string {
  const id = result?.properties?.place_id
  return id != null ? String(id) : ''
}

function withLabelFromDefault(marker: OsmMarker): OsmMarker {
  if (marker.label || !marker.default_label) {
    return marker
  }
  return { ...marker, label: marker.default_label }
}

function createMarkerData(lat: number, lng: number, zoom: number, partial?: Partial<OsmMarker>): OsmMarker {
  return withLabelFromDefault({
    label: partial?.label ?? '',
    default_label: partial?.default_label ?? '',
    lat,
    lng,
    zoom,
    address: partial?.address ?? emptyOsmAddress(),
    place_id: partial?.place_id ?? '',
  })
}

function currentZoom(): number {
  return map?.getZoom() ?? initialZoom.value
}

function writeModel(list: OsmMarker[], activeIdx = selectedIndex.value) {
  syncingFromModel = true
  if (isMultiple.value) {
    model.value = list
    selectedIndex.value = list.length ? Math.min(Math.max(activeIdx, 0), list.length - 1) : 0
  }
  else {
    model.value = list[0] ?? null
    selectedIndex.value = 0
  }
  nextTick(() => {
    syncingFromModel = false
  })
}

function clearLeafletMarkers() {
  for (const marker of markers) {
    marker.off()
    if (map?.hasLayer(marker)) {
      map.removeLayer(marker)
    }
    else {
      marker.remove()
    }
  }
  markers = []
}

function selectMarker(index: number) {
  selectedIndex.value = index
  applyMarkerSelection()
  const list = markersList.value.map(m => ({ ...m }))
  const current = list[index]
  if (!current) {
    return
  }
  const filled = withLabelFromDefault(current)
  if (filled.label !== current.label) {
    list[index] = filled
    writeModel(list, index)
  }
}

function applyMarkerSelection() {
  markers.forEach((marker, index) => {
    const selected = index === selectedIndex.value
    const icon = selected
      ? (selectedMarkerIcon ?? markerIcon)
      : markerIcon
    if (icon) {
      marker.setIcon(icon)
    }
    marker.setZIndexOffset(selected ? 1000 : 0)
    const el = marker.getElement()
    el?.classList.toggle(`${markerClass}--selected`, selected)
  })
}

function bindMarkerEvents(marker: LeafletMarker, index: number) {
  marker.on('click', (event: LeafletMouseEvent) => {
    L?.DomEvent.stopPropagation(event)
    selectMarker(index)
  })
  marker.on('dragend', () => {
    const pos = marker.getLatLng()
    const list = markersList.value.map(m => ({ ...m }))
    const current = list[index]
    if (!current) {
      return
    }
    list[index] = {
      ...current,
      lat: pos.lat,
      lng: pos.lng,
      zoom: currentZoom(),
    }
    writeModel(list, index)
    void reverseGeocodeMarker(index, list[index]!)
  })
}

function syncMarkersToMap(panToActive = false, listOverride?: OsmMarker[]) {
  if (!map || !L) {
    return
  }

  const list = listOverride ?? markersList.value
  clearLeafletMarkers()
  list.forEach((item, index) => {
    const selected = index === selectedIndex.value
    const marker = L!.marker([item.lat, item.lng], {
      draggable: true,
      icon: (selected ? selectedMarkerIcon : markerIcon) ?? undefined,
      title: item.label || item.default_label || undefined,
      zIndexOffset: selected ? 1000 : 0,
    })
    marker.addTo(map!)
    bindMarkerEvents(marker, index)
    markers.push(marker)
  })

  if (list.length) {
    const idx = Math.min(Math.max(selectedIndex.value, 0), list.length - 1)
    selectedIndex.value = idx
    applyMarkerSelection()
    if (panToActive) {
      const active = list[idx]!
      map.setView([active.lat, active.lng], active.zoom || currentZoom())
    }
  }

  updateFitBoundsDisabled()
}

async function reverseGeocodeMarker(index: number, snapshot?: OsmMarker) {
  if (!nominatimGeocoder || !map) {
    return
  }
  const current = snapshot ?? markersList.value[index]
  if (!current) {
    return
  }

  const previousDefault = current.default_label
  const latlng = { lat: current.lat, lng: current.lng }

  try {
    const results = await nominatimGeocoder.reverse(
      latlng,
      map.options.crs?.scale(18) ?? 18,
    )
    const latest = markersList.value.map(m => ({ ...m }))
    const idx = latest.findIndex(m => m.lat === current.lat && m.lng === current.lng)
    if (idx < 0) {
      return
    }

    const marker = latest[idx]!
    const label = parseGeocodeResult(results, latlng)
    const next: OsmMarker = {
      ...marker,
      default_label: label,
      address: addressFromResult(results[0]),
      place_id: placeIdFromResult(results[0]),
    }
    if (!marker.label || marker.label === previousDefault) {
      next.label = label
    }
    latest[idx] = next
    writeModel(latest, idx)
  }
  catch {
    // Nominatim can fail (rate limit / network) — keep coordinates.
  }
}

function placeMarkerAt(lat: number, lng: number, partial?: Partial<OsmMarker>) {
  if (!map) {
    return
  }
  const zoom = partial?.zoom ?? currentZoom()
  const next = createMarkerData(lat, lng, zoom, partial)

  if (isMultiple.value) {
    const list = [...markersList.value, next]
    const idx = list.length - 1
    writeModel(list, idx)
    syncMarkersToMap(false, list)
    if (!partial?.default_label) {
      void reverseGeocodeMarker(idx, list[idx])
    }
  }
  else {
    const list = [next]
    writeModel(list, 0)
    syncMarkersToMap(false, list)
    if (!partial?.default_label) {
      void reverseGeocodeMarker(0, list[0])
    }
  }
}

function onMapDblClick(event: LeafletMouseEvent) {
  placeMarkerAt(event.latlng.lat, event.latlng.lng)
}

function onZoomEnd() {
  if (!map || !hasMarker.value) {
    return
  }
  const list = markersList.value.map(m => ({ ...m }))
  const idx = Math.min(Math.max(selectedIndex.value, 0), list.length - 1)
  const current = list[idx]
  if (!current) {
    return
  }
  const zoom = currentZoom()
  if (current.zoom === zoom) {
    return
  }
  list[idx] = { ...current, zoom }
  writeModel(list, idx)
}

function updateLabel(index: number, value: string) {
  const list = markersList.value.map(m => ({ ...m }))
  const current = list[index]
  if (!current) {
    return
  }
  const label = value.trim() === '' ? current.default_label : value
  if (current.label === label) {
    return
  }
  list[index] = { ...current, label }
  writeModel(list, index)
}

function removeMarker(index: number) {
  const list = markersList.value.map(m => ({ ...m }))
  if (!list.length) {
    return
  }
  list.splice(index, 1)
  writeModel(list, Math.min(index, Math.max(list.length - 1, 0)))
  syncMarkersToMap(false, list)
  if (!list.length && map) {
    map.setView([centerLat.value, centerLng.value], initialZoom.value)
  }
}

function focusMarkerOnMap(index: number) {
  selectMarker(index)
  const item = markersList.value[index]
  if (!item || !map) {
    return
  }
  map.setView([item.lat, item.lng], item.zoom || currentZoom())
}

function fitAllMarkers() {
  if (!map || !L || markers.length === 0) {
    return
  }
  if (markers.length === 1) {
    const pos = markers[0]!.getLatLng()
    map.setView(pos, Math.max(currentZoom(), 15))
    return
  }
  const group = L.featureGroup(markers)
  map.fitBounds(group.getBounds().pad(0.15))
}

function updateFitBoundsDisabled() {
  const el = mapEl.value?.querySelector('.leaflet-control-fit-bounds a')
  if (!el) {
    return
  }
  if (markers.length === 0) {
    el.classList.add('is-disabled')
    el.setAttribute('aria-disabled', 'true')
  }
  else {
    el.classList.remove('is-disabled')
    el.removeAttribute('aria-disabled')
  }
}

function createFitBoundsControl(leaflet: LeafletModule): LeafletControl {
  const FitBounds = leaflet.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      const container = leaflet.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-fit-bounds')
      const link = leaflet.DomUtil.create('a', '', container) as HTMLAnchorElement
      link.href = '#'
      link.title = 'Show all markers'
      link.setAttribute('role', 'button')
      link.setAttribute('aria-label', 'Show all markers')
      link.innerHTML = '<span class="leaflet-control-fit-bounds__icon" aria-hidden="true"></span>'

      leaflet.DomEvent.disableClickPropagation(container)
      leaflet.DomEvent.on(link, 'click', (event: Event) => {
        leaflet.DomEvent.preventDefault(event)
        if (link.classList.contains('is-disabled')) {
          return
        }
        fitAllMarkers()
      })

      return container
    },
  })
  return new FitBounds()
}

function onMarkGeocode(event: { geocode: GeocodingResult }) {
  const { geocode } = event
  const lat = geocode.center.lat
  const lng = geocode.center.lng
  const label = parseGeocodeResult([geocode], { lat, lng })
  const zoom = currentZoom()

  placeMarkerAt(lat, lng, {
    label,
    default_label: label,
    address: addressFromResult(geocode),
    place_id: placeIdFromResult(geocode),
    zoom,
  })
  map?.setView([lat, lng], zoom)

  const control = geocoderControl as LeafletControl & {
    _clearResults?: () => void
    _input?: HTMLInputElement
  }
  control._clearResults?.()
  if (control._input) {
    control._input.value = ''
  }
}

async function initGeocoder() {
  if (!map || !L) {
    return
  }

  const { geocoder, geocoders } = await import('leaflet-control-geocoder')

  const language = typeof navigator !== 'undefined' ? (navigator.language || 'en') : 'en'

  const nominatim = geocoders.nominatim({
    geocodingQueryParams: { 'accept-language': language },
    reverseQueryParams: { 'accept-language': language },
    htmlTemplate: formatNominatimAddress as never,
  })

  const geocoderApi = {
    geocode: (query: string) => nominatim.geocode(query),
    reverse: (location: LatLngLiteral, scale: number) => nominatim.reverse(location, scale),
    suggest: async () => [] as GeocodingResult[],
  }
  nominatimGeocoder = {
    reverse: (location, scale) => geocoderApi.reverse(location, scale) as unknown as Promise<GeocodingResult[]>,
  }

  onMarkGeocodeHandler = onMarkGeocode
  const control = geocoder({
    collapsed: false,
    position: 'topleft',
    placeholder: 'Search…',
    errorMessage: 'Nothing found…',
    showResultIcons: true,
    queryMinLength: 3,
    suggestMinLength: 1000,
    defaultMarkGeocode: false,
    geocoder: geocoderApi as never,
  }) as LeafletControl & {
    on: (type: string, fn: (event: { geocode: GeocodingResult }) => void) => void
    off: (type: string, fn: (event: { geocode: GeocodingResult }) => void) => void
    getContainer: () => HTMLElement
  }
  control.on('markgeocode', onMarkGeocodeHandler)
  control.addTo(map)

  const container = control.getContainer?.()
  if (searchEl.value && container) {
    searchEl.value.appendChild(container)
  }

  geocoderControl = control
}

async function initMap() {
  if (!mapEl.value || map) {
    return
  }

  const leafletMod = await import('leaflet')
  L = typeof leafletMod.map === 'function'
    ? leafletMod
    : (leafletMod as { default: LeafletModule }).default
  if (!L?.map) {
    return
  }

  const locateMod = await import('leaflet.locatecontrol')
  const LocateControl = locateMod.LocateControl
    ?? (locateMod as { default?: typeof locateMod.LocateControl }).default
  if (!LocateControl) {
    return
  }

  const markerHtml = [
    `<span class="${markerClass}__pin" aria-hidden="true"></span>`,
    `<span class="${markerClass}__pulse" aria-hidden="true"></span>`,
  ].join('')

  markerIcon = L.divIcon({
    className: markerClass,
    html: markerHtml,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -36],
  })

  selectedMarkerIcon = L.divIcon({
    className: `${markerClass} ${markerClass}--selected`,
    html: markerHtml,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -36],
  })

  const startLat = markersList.value[0]?.lat ?? centerLat.value
  const startLng = markersList.value[0]?.lng ?? centerLng.value
  const startZoom = markersList.value[0]?.zoom ?? initialZoom.value

  map = L.map(mapEl.value, {
    zoomControl: true,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    touchZoom: false,
  }).setView([startLat, startLng], startZoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  await initGeocoder()

  locateControl = new LocateControl({
    position: 'bottomleft',
    setView: 'once',
    showPopup: false,
    drawCircle: true,
    drawMarker: true,
    showCompass: false,
    initialZoomLevel: 16,
    strings: {
      title: 'My location',
    },
    locateOptions: {
      enableHighAccuracy: true,
      maxZoom: 16,
      watch: false,
    },
  })
  locateControl.addTo(map)

  fitBoundsControl = createFitBoundsControl(L)
  fitBoundsControl.addTo(map)

  map.on('dblclick', onMapDblClick)
  map.on('zoomend', onZoomEnd)
  map.on('locationfound', onLocationFound)

  syncMarkersToMap(false)

  requestAnimationFrame(() => {
    map?.invalidateSize()
    updateFitBoundsDisabled()
  })
}

function onLocationFound(event: LocationEvent) {
  if (isMultiple.value) {
    return
  }
  placeMarkerAt(event.latlng.lat, event.latlng.lng)
}

watch(
  () => model.value,
  () => {
    if (syncingFromModel) {
      return
    }
    if (isMultiple.value && !Array.isArray(model.value) && model.value != null) {
      syncingFromModel = true
      model.value = isOsmMarker(model.value) ? [model.value] : []
      nextTick(() => {
        syncingFromModel = false
        syncMarkersToMap(true)
      })
      return
    }
    syncMarkersToMap(true)
  },
  { deep: true },
)

onMounted(() => {
  void initMap()
})

onBeforeUnmount(() => {
  if (map) {
    map.off('dblclick', onMapDblClick)
    map.off('zoomend', onZoomEnd)
    map.off('locationfound', onLocationFound)
  }
  if (onMarkGeocodeHandler && geocoderControl) {
    ;(geocoderControl as LeafletControl & {
      off: (type: string, fn: (event: { geocode: GeocodingResult }) => void) => void
    }).off('markgeocode', onMarkGeocodeHandler)
  }
  geocoderControl?.remove()
  locateControl?.remove()
  fitBoundsControl?.remove()
  clearLeafletMarkers()
  map?.remove()
  map = null
  geocoderControl = null
  onMarkGeocodeHandler = null
  nominatimGeocoder = null
  locateControl = null
  fitBoundsControl = null
  markerIcon = null
  selectedMarkerIcon = null
  L = null
})
</script>

<template>
  <KateCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div
        ref="searchEl"
        :class="`${rootClass}__search`"
      />
      <div
        ref="mapEl"
        :class="`${rootClass}__map`"
        :style="{ height: `${mapHeight}px` }"
      />

      <div
        v-if="hasMarker"
        :class="`${rootClass}__markers`"
      >
        <div
          v-for="(marker, index) in markersList"
          :key="`${marker.lat}-${marker.lng}-${index}`"
          :class="[
            `${rootClass}__marker-row`,
            { 'is-selected': selectedIndex === index },
          ]"
        >
          <KateCmsUiButton
            tag="button"
            :variant="['secondary', 'icon']"
            title="Show on map"
            aria-label="Show on map"
            @click="focusMarkerOnMap(index)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
              />
            </svg>
          </KateCmsUiButton>

          <label :class="`${rootClass}__field`">
            <span :class="`${rootClass}__field-label`">
              Label{{ isMultiple ? ` #${index + 1}` : '' }}
            </span>
            <input
              type="text"
              :class="`${rootClass}__input`"
              :name="`${fieldKey}_label_${index}`"
              :value="marker.label"
              :placeholder="marker.default_label || 'Marker name'"
              @focus="selectMarker(index)"
              @input="updateLabel(index, ($event.target as HTMLInputElement).value)"
            >
          </label>

          <KateCmsUiButton
            tag="button"
            :variant="['red', 'icon']"
            title="Remove marker"
            aria-label="Remove marker"
            @click="removeMarker(index)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"
              />
            </svg>
          </KateCmsUiButton>
        </div>
      </div>
    </div>
  </KateCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.katecms-open-street-map-field';
$marker: '.katecms-osm-marker';

#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(10);

  &__search {
    position: relative;
    z-index: 2;
    width: 100%;
  }

  &__map {
    width: 100%;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    overflow: hidden;
    background: $color-bg;
    z-index: 0;
    position: relative;
  }

  :deep(#{$marker}) {
    background: transparent !important;
    border: 0 !important;

    #{$marker}__pin {
      position: absolute;
      left: 50%;
      bottom: 0;
      width: 22px;
      height: 22px;
      margin-left: -11px;
      background: $color-accent;
      border: 3px solid #fff;
      border-radius: 50% 50% 50% 0;
      box-shadow: $shadow-sm;
      transform: rotate(-45deg);
    }

    #{$marker}__pulse {
      display: none;
    }

    &#{$marker}--selected {
      #{$marker}__pin {
        background: $color-accent-hover;
        box-shadow: 0 2px 8px rgba(232, 85, 47, 0.45);
      }

      #{$marker}__pulse {
        display: block;
        position: absolute;
        left: 50%;
        bottom: 4px;
        width: 18px;
        height: 18px;
        margin-left: -9px;
        border-radius: 50%;
        background: color-alpha($color-accent, 0.35);
        animation: katecms-osm-marker-pulse 1.4s ease-out infinite;
      }
    }
  }

  @keyframes katecms-osm-marker-pulse {
    0% {
      transform: scale(0.6);
      opacity: 0.9;
    }
    100% {
      transform: scale(2.4);
      opacity: 0;
    }
  }

  &__markers {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
  }

  &__marker {
    &-row {
      display: flex;
      align-items: flex-end;
      gap: math-rem(8);
      padding: math-rem(8);
      border: 1px solid $color-border;
      border-radius: $border-radius-inter;
      background: $color-surface;

      &.is-selected {
        border-color: $color-accent;
        background: $color-bg;
      }

      :deep(.katecms-btn) {
        flex: 0 0 auto;
      }
    }
  }

  &__field {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: math-rem(4);
    min-width: 0;

    &-label {
      font-size: math-rem(12);
      color: $color-muted;
    }
  }

  &__input {
    width: 100%;
    height: math-rem(40);
    padding: 0 math-rem(10);
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $color-surface;
    color: $color-ink;
    font-size: math-rem(14);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: $color-accent;
    }
  }

  :deep(.leaflet-pane),
  :deep(.leaflet-tile),
  :deep(.leaflet-marker-icon),
  :deep(.leaflet-marker-shadow),
  :deep(.leaflet-tile-container),
  :deep(.leaflet-pane) > svg,
  :deep(.leaflet-pane) > canvas,
  :deep(.leaflet-zoom-box),
  :deep(.leaflet-image-layer),
  :deep(.leaflet-layer) {
    position: absolute;
    left: 0;
    top: 0;
  }

  :deep(.leaflet-container) {
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    background: $color-bg;
    outline-offset: 1px;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    line-height: 1.5;

    a {
      -webkit-tap-highlight-color: color-alpha($color-accent, 0.4);
      color: $color-accent;
    }

    .leaflet-overlay-pane svg {
      max-width: none !important;
      max-height: none !important;
    }

    .leaflet-marker-pane img,
    .leaflet-shadow-pane img,
    .leaflet-tile-pane img,
    img.leaflet-image-layer,
    .leaflet-tile {
      max-width: none !important;
      max-height: none !important;
      width: auto;
      padding: 0;
    }

    &.leaflet-touch-zoom {
      touch-action: pan-x pan-y;
    }

    &.leaflet-touch-drag {
      touch-action: pinch-zoom;
    }

    &.leaflet-touch-drag.leaflet-touch-zoom {
      touch-action: none;
    }

    .leaflet-control-attribution {
      background: color-alpha($color-surface, 0.8);
      margin: 0;
    }

    a.leaflet-popup-close-button {
      position: absolute;
      top: 0;
      right: 0;
      border: none;
      text-align: center;
      width: 24px;
      height: 24px;
      font: 16px/24px Tahoma, Verdana, sans-serif;
      color: $color-muted;
      text-decoration: none;
      background: transparent;

      &:hover,
      &:focus {
        color: $color-ink;
      }
    }
  }

  :deep(.leaflet-tile),
  :deep(.leaflet-marker-icon),
  :deep(.leaflet-marker-shadow) {
    user-select: none;
    -webkit-user-drag: none;
  }

  :deep(.leaflet-tile) {
    filter: inherit;
    visibility: hidden;

    &::selection {
      background: transparent;
    }

    &.leaflet-tile-loaded {
      visibility: inherit;
    }
  }

  :deep(.leaflet-safari) {
    .leaflet-tile {
      image-rendering: -webkit-optimize-contrast;
    }

    .leaflet-tile-container {
      width: 1600px;
      height: 1600px;
      -webkit-transform-origin: 0 0;
    }
  }

  :deep(.leaflet-marker-icon),
  :deep(.leaflet-marker-shadow) {
    display: block;
  }

  :deep(.leaflet-zoom-box) {
    width: 0;
    height: 0;
    box-sizing: border-box;
    z-index: 800;
    border: 2px dotted $color-accent;
    background: color-alpha($color-surface, 0.5);
  }

  :deep(.leaflet-overlay-pane) svg {
    user-select: none;
  }

  :deep(.leaflet-pane) { z-index: 400; }
  :deep(.leaflet-tile-pane) { z-index: 200; }
  :deep(.leaflet-overlay-pane) { z-index: 400; }
  :deep(.leaflet-shadow-pane) { z-index: 500; }
  :deep(.leaflet-marker-pane) { z-index: 600; }
  :deep(.leaflet-tooltip-pane) { z-index: 650; }
  :deep(.leaflet-popup-pane) { z-index: 700; }

  :deep(.leaflet-map-pane) {
    canvas { z-index: 100; }
    svg { z-index: 200; }
  }

  :deep(.leaflet-control) {
    position: relative;
    z-index: 800;
    pointer-events: auto;
    float: left;
    clear: both;
    cursor: auto;
  }

  :deep(.leaflet-top),
  :deep(.leaflet-bottom) {
    position: absolute;
    z-index: 1000;
    pointer-events: none;
  }

  :deep(.leaflet-top) { top: 0; }
  :deep(.leaflet-right) { right: 0; }
  :deep(.leaflet-bottom) { bottom: 0; }
  :deep(.leaflet-left) { left: 0; }

  :deep(.leaflet-right) .leaflet-control { float: right; }
  :deep(.leaflet-top) .leaflet-control { margin-top: 10px; }
  :deep(.leaflet-bottom) .leaflet-control { margin-bottom: 10px; }
  :deep(.leaflet-left) .leaflet-control { margin-left: 10px; }
  :deep(.leaflet-right) .leaflet-control { margin-right: 10px; }

  :deep(.leaflet-fade-anim) {
    .leaflet-popup { opacity: 0; transition: opacity 0.2s linear; }
    .leaflet-map-pane .leaflet-popup { opacity: 1; }
  }

  :deep(.leaflet-zoom-animated) {
    transform-origin: 0 0;
  }

  :deep(svg.leaflet-zoom-animated) {
    will-change: transform;
  }

  :deep(.leaflet-zoom-anim) {
    .leaflet-zoom-animated {
      transition: transform 0.25s cubic-bezier(0, 0, 0.25, 1);
    }

    .leaflet-tile { transition: none; }
    .leaflet-zoom-hide { visibility: hidden; }
  }

  :deep(.leaflet-pan-anim) .leaflet-tile {
    transition: none;
  }

  :deep(.leaflet-interactive) { cursor: pointer; }

  :deep(.leaflet-grab) {
    cursor: grab;
  }

  :deep(.leaflet-crosshair),
  :deep(.leaflet-crosshair) .leaflet-interactive {
    cursor: crosshair;
  }

  :deep(.leaflet-popup-pane) { cursor: auto; }

  :deep(.leaflet-dragging) {
    .leaflet-grab,
    .leaflet-grab .leaflet-interactive,
    .leaflet-marker-draggable {
      cursor: grabbing;
    }
  }

  :deep(.leaflet-marker-icon),
  :deep(.leaflet-marker-shadow),
  :deep(.leaflet-image-layer),
  :deep(.leaflet-pane) > svg path,
  :deep(.leaflet-tile-container) {
    pointer-events: none;
  }

  :deep(.leaflet-marker-icon.leaflet-interactive),
  :deep(.leaflet-image-layer.leaflet-interactive),
  :deep(.leaflet-pane) > svg path.leaflet-interactive,
  :deep(svg.leaflet-image-layer.leaflet-interactive) path {
    pointer-events: auto;
  }

  :deep(.leaflet-bar) {
    box-shadow: $shadow-sm;
    border-radius: $border-radius-inter;

    a {
      background-color: $color-surface;
      background-position: 50% 50%;
      background-repeat: no-repeat;
      border-bottom: 1px solid $color-border;
      width: 26px;
      height: 26px;
      line-height: 26px;
      display: block;
      text-align: center;
      text-decoration: none;
      color: $color-ink;

      &:hover,
      &:focus {
        background-color: $color-bg;
      }

      &:first-child {
        border-top-left-radius: $border-radius-inter;
        border-top-right-radius: $border-radius-inter;
      }

      &:last-child {
        border-bottom-left-radius: $border-radius-inter;
        border-bottom-right-radius: $border-radius-inter;
        border-bottom: none;
      }

      &.leaflet-disabled {
        cursor: default;
        background-color: $color-bg;
        color: $color-muted;
      }
    }
  }

  :deep(.leaflet-touch) {
    .leaflet-bar {
      box-shadow: none;
      border: 2px solid color-alpha($color-ink, 0.12);
      background-clip: padding-box;

      a {
        width: 30px;
        height: 30px;
        line-height: 30px;

        &:first-child {
          border-top-left-radius: 2px;
          border-top-right-radius: 2px;
        }

        &:last-child {
          border-bottom-left-radius: 2px;
          border-bottom-right-radius: 2px;
        }
      }
    }

    .leaflet-control-attribution {
      box-shadow: none;
    }

    .leaflet-control-zoom-in,
    .leaflet-control-zoom-out {
      font-size: 22px;
    }
  }

  :deep(.leaflet-control-zoom-in),
  :deep(.leaflet-control-zoom-out) {
    font: bold 18px 'Lucida Console', Monaco, monospace;
    text-indent: 1px;
  }

  :deep(.leaflet-control-attribution),
  :deep(.leaflet-control-scale-line) {
    padding: 0 5px;
    color: $color-ink;
    line-height: 1.4;
  }

  :deep(.leaflet-control-attribution) a {
    text-decoration: none;

    &:hover,
    &:focus {
      text-decoration: underline;
    }
  }

  :deep(.leaflet-attribution-flag) {
    display: inline !important;
    vertical-align: baseline !important;
    width: 1em;
    height: 0.6669em;
  }

  :deep(.leaflet-left) .leaflet-control-scale { margin-left: 5px; }
  :deep(.leaflet-bottom) .leaflet-control-scale { margin-bottom: 5px; }

  :deep(.leaflet-control-scale-line) {
    border: 2px solid $color-muted;
    border-top: none;
    line-height: 1.1;
    padding: 2px 5px 1px;
    white-space: nowrap;
    box-sizing: border-box;
    background: color-alpha($color-surface, 0.8);
    text-shadow: 1px 1px $color-surface;

    &:not(:first-child) {
      border-top: 2px solid $color-muted;
      border-bottom: none;
      margin-top: -2px;
    }

    &:not(:first-child):not(:last-child) {
      border-bottom: 2px solid $color-muted;
    }
  }

  :deep(.leaflet-popup) {
    position: absolute;
    text-align: center;
    margin-bottom: 20px;
  }

  :deep(.leaflet-popup-content-wrapper) {
    padding: 1px;
    text-align: left;
    border-radius: 12px;
  }

  :deep(.leaflet-popup-content) {
    margin: 13px 24px 13px 20px;
    line-height: 1.3;
    font-size: 13px;
    min-height: 1px;

    p { margin: 1.3em 0; }
  }

  :deep(.leaflet-popup-tip-container) {
    width: 40px;
    height: 20px;
    position: absolute;
    left: 50%;
    margin-top: -1px;
    margin-left: -20px;
    overflow: hidden;
    pointer-events: none;
  }

  :deep(.leaflet-popup-tip) {
    width: 17px;
    height: 17px;
    padding: 1px;
    margin: -10px auto 0;
    pointer-events: auto;
    transform: rotate(45deg);
  }

  :deep(.leaflet-popup-content-wrapper),
  :deep(.leaflet-popup-tip) {
    background: $color-surface;
    color: $color-ink;
    box-shadow: $shadow-md;
  }

  :deep(.leaflet-popup-scrolled) { overflow: auto; }

  :deep(.leaflet-div-icon) {
    background: $color-surface;
    border: 1px solid $color-muted;
  }

  :deep(.leaflet-tooltip) {
    position: absolute;
    padding: 6px;
    background-color: $color-surface;
    border: 1px solid $color-surface;
    border-radius: 3px;
    color: $color-ink;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
    box-shadow: $shadow-sm;

    &.leaflet-interactive {
      cursor: pointer;
      pointer-events: auto;
    }
  }

  :deep(.leaflet-tooltip-top:before),
  :deep(.leaflet-tooltip-bottom:before),
  :deep(.leaflet-tooltip-left:before),
  :deep(.leaflet-tooltip-right:before) {
    position: absolute;
    pointer-events: none;
    border: 6px solid transparent;
    background: transparent;
    content: '';
  }

  :deep(.leaflet-tooltip-bottom) { margin-top: 6px; }
  :deep(.leaflet-tooltip-top) { margin-top: -6px; }

  :deep(.leaflet-tooltip-bottom:before),
  :deep(.leaflet-tooltip-top:before) {
    left: 50%;
    margin-left: -6px;
  }

  :deep(.leaflet-tooltip-top:before) {
    bottom: 0;
    margin-bottom: -12px;
    border-top-color: $color-surface;
  }

  :deep(.leaflet-tooltip-bottom:before) {
    top: 0;
    margin-top: -12px;
    margin-left: -6px;
    border-bottom-color: $color-surface;
  }

  :deep(.leaflet-tooltip-left) { margin-left: -6px; }
  :deep(.leaflet-tooltip-right) { margin-left: 6px; }

  :deep(.leaflet-tooltip-left:before),
  :deep(.leaflet-tooltip-right:before) {
    top: 50%;
    margin-top: -6px;
  }

  :deep(.leaflet-tooltip-left:before) {
    right: 0;
    margin-right: -12px;
    border-left-color: $color-surface;
  }

  :deep(.leaflet-tooltip-right:before) {
    left: 0;
    margin-left: -12px;
    border-right-color: $color-surface;
  }

  :deep(.leaflet-control-locate) {
    --locate-control-icon-color: #{$color-ink};
    --locate-control-active-color: #{$color-accent};
    --locate-control-following-color: #{$color-warning};

    a {
      display: flex;
      align-items: center;
      justify-content: center;

      .leaflet-control-locate-location-arrow,
      .leaflet-control-locate-spinner {
        background-color: var(--locate-control-icon-color);
        width: 16px;
        height: 16px;
        margin: 7px;
        display: inline-block;
        mask-position: center;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        -webkit-mask-repeat: no-repeat;
      }

      .leaflet-locate-icon {
        color: var(--locate-control-icon-color);
      }

      .leaflet-control-locate-location-arrow {
        -webkit-mask-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M445 4 29 195c-48 23-32 93 19 93h176v176c0 51 70 67 93 19L508 67c16-38-25-79-63-63z"/></svg>');
        mask-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M445 4 29 195c-48 23-32 93 19 93h176v176c0 51 70 67 93 19L508 67c16-38-25-79-63-63z"/></svg>');
      }

      .leaflet-control-locate-spinner {
        animation: 2s linear infinite leaflet-control-locate-spin;
        -webkit-mask-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M304 48a48 48 0 1 1-96 0 48 48 0 0 1 96 0zm-48 368a48 48 0 1 0 0 96 48 48 0 0 0 0-96zm208-208a48 48 0 1 0 0 96 48 48 0 0 0 0-96zM96 256a48 48 0 1 0-96 0 48 48 0 0 0 96 0zm13 99a48 48 0 1 0 0 96 48 48 0 0 0 0-96zm294 0a48 48 0 1 0 0 96 48 48 0 0 0 0-96zM109 61a48 48 0 1 0 0 96 48 48 0 0 0 0-96z"/></svg>');
        mask-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M304 48a48 48 0 1 1-96 0 48 48 0 0 1 96 0zm-48 368a48 48 0 1 0 0 96 48 48 0 0 0 0-96zm208-208a48 48 0 1 0 0 96 48 48 0 0 0 0-96zM96 256a48 48 0 1 0-96 0 48 48 0 0 0 96 0zm13 99a48 48 0 1 0 0 96 48 48 0 0 0 0-96zm294 0a48 48 0 1 0 0 96 48 48 0 0 0 0-96zM109 61a48 48 0 1 0 0 96 48 48 0 0 0 0-96z"/></svg>');
      }
    }

    &.active a {
      .leaflet-control-locate-location-arrow {
        background-color: var(--locate-control-active-color);
      }

      .leaflet-locate-icon {
        color: var(--locate-control-active-color);
      }
    }

    &.following a {
      .leaflet-control-locate-location-arrow {
        background-color: var(--locate-control-following-color);
      }

      .leaflet-locate-icon {
        color: var(--locate-control-following-color);
      }
    }

    &.locate-timeout a .leaflet-control-locate-spinner {
      background-color: $color-warning;
    }
  }

  :deep(.leaflet-bar) .leaflet-locate-text-active {
    text-overflow: ellipsis;
    white-space: nowrap;
    align-items: center;
    width: auto;
    max-width: 200px;
    padding: 0 10px;
    display: flex;
    overflow: hidden;

    .leaflet-locate-icon {
      padding: 0 5px 0 0;
    }
  }

  :deep(.leaflet-touch) .leaflet-bar .leaflet-locate-text-active {
    width: 100%;
  }

  :deep(.leaflet-control-locate-location) circle {
    animation: 4s infinite leaflet-control-locate-throb;
  }

  :deep(.leaflet-control-geocoder) {
    position: relative;
    float: none;
    width: 100%;
    max-width: 100%;
    margin: 0 !important;
    box-shadow: $shadow-sm;
    border-radius: $border-radius-inter;
    background: $color-surface;
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    flex-direction: row-reverse;
    min-width: 26px;
    min-height: 26px;

    &.leaflet-control {
      clear: none;
    }

    a,
    .leaflet-control-geocoder-icon {
      border-bottom: none;
      display: inline-block;
    }

    .leaflet-control-geocoder-alternatives a {
      width: inherit;
      height: inherit;
      line-height: inherit;
    }

    a:hover,
    .leaflet-control-geocoder-icon:hover {
      border-bottom: none;
      display: inline-block;
    }
  }

  :deep(.leaflet-touch) .leaflet-control-geocoder {
    min-width: 30px;
    min-height: 30px;
  }

  :deep(.leaflet-control-geocoder-form) {
    vertical-align: middle;
    display: block !important;
    flex: 1 1 auto;
    min-width: 0;

    input {
      width: 100%;
      min-width: 0;
      height: math-rem(38);
      padding: 0 math-rem(12);
      border: 1px solid $color-border;
      border-right: 0;
      border-radius: $border-radius-inter 0 0 $border-radius-inter;
      font-size: math-rem(14);
      box-sizing: border-box;
      background: $color-surface;
      color: $color-ink;

      &:focus {
        outline: none;
        border-color: $color-accent;
      }
    }

    button {
      display: none;
    }
  }

  :deep(.leaflet-control-geocoder-icon) {
    cursor: pointer;
    flex: 0 0 40px;
    width: 40px !important;
    height: 38px !important;
    border: 1px solid $color-border !important;
    border-radius: 0 $border-radius-inter $border-radius-inter 0 !important;
    background-color: $color-bg !important;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12.2 13l3.4 6.6c.6 1.1 2.5-.4 2-1.2l-4-6.2z'/%3E%3Ccircle cx='10.8' cy='8.9' r='3.9' fill='none' stroke='%23000' stroke-width='1.5'/%3E%3C/svg%3E");
    background-position: 50%;
    background-repeat: no-repeat;
  }

  :deep(.leaflet-control-geocoder-throbber) .leaflet-control-geocoder-icon {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' stroke='%23000' stroke-linecap='round' stroke-width='1.6' viewBox='0 0 24 24'%3E%3Cdefs/%3E%3Cg%3E%3Cpath stroke-opacity='.1' d='M14 8.4l3-5'/%3E%3Cpath stroke-opacity='.2' d='M15.6 10l5-3'/%3E%3Cpath stroke-opacity='.3' d='M16.2 12H22'/%3E%3Cpath stroke-opacity='.4' d='M15.6 14l5 3m-6.5-1.4l2.9 5'/%3E%3Cpath stroke-opacity='.5' d='M12 16.2V22m-2-6.4l-3 5'/%3E%3Cpath stroke-opacity='.6' d='M8.4 14l-5 3'/%3E%3Cpath stroke-opacity='.7' d='M7.8 12H2'/%3E%3Cpath stroke-opacity='.8' d='M8.4 10l-5-3'/%3E%3Cpath stroke-opacity='.9' d='M10 8.4l-3-5'/%3E%3Cpath d='M12 7.8V2'/%3E%3CanimateTransform attributeName='transform' calcMode='discrete' dur='1s' repeatCount='indefinite' type='rotate' values='0 12 12;30 12 12;60 12 12;90 12 12;120 12 12;150 12 12;180 12 12;210 12 12;240 12 12;270 12 12;300 12 12;330 12 12'/%3E%3C/g%3E%3C/svg%3E");
  }

  :deep(.leaflet-control-geocoder-form-no-error) { display: none; }

  :deep(.leaflet-control-geocoder-error) {
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    z-index: 10;
    margin: 4px 0 0;
    padding: 8px 12px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    color: $color-danger;
    display: block;
  }

  :deep(.leaflet-control-geocoder-alternatives) {
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    z-index: 10;
    margin: 4px 0 0;
    width: 100%;
    max-height: 250px;
    overflow: auto;
    padding: 0;
    list-style: none;
    display: block;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    box-shadow: $shadow-md;

    li {
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;
      border-bottom: 1px solid $color-border;
      padding: 5px 8px;
      display: block;
      overflow: hidden;

      a,
      a:hover {
        width: inherit;
        height: inherit;
        line-height: inherit;
        background: inherit;
        border-radius: inherit;
        text-align: left;
      }

      &:last-child { border-bottom: none; }
      &:hover { background-color: $color-bg; }
    }
  }

  :deep(.leaflet-control-geocoder-alternatives-minimized) {
    height: 0;
    display: none;
  }

  :deep(.leaflet-control-geocoder-selected) {
    background-color: $color-bg;
  }

  :deep(.leaflet-control-geocoder-address-context) {
    color: $color-muted;
  }

  :deep(.leaflet-control-fit-bounds) a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    line-height: 1;
    background: $color-surface;
    color: $color-ink;

    &.is-disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }
  }

  :deep(.leaflet-control-fit-bounds__icon) {
    display: block;
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-radius: 2px;
    box-sizing: border-box;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      inset: 2px;
      border: 1px dashed currentColor;
    }
  }
}

@keyframes leaflet-control-locate-throb {
  0% { stroke-width: 1px; }
  50% {
    stroke-width: 3px;
    transform: scale(0.8);
  }
  100% { stroke-width: 1px; }
}

@keyframes leaflet-control-locate-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}
</style>
