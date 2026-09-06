<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Field, OsmMarker, OsmMarkerValue } from '@miraicms/core'
import {
  emptyOsmAddress,
  isOsmMarker,
  osmAddressFromNominatim,
} from '@miraicms/core'
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

const rootClass = 'miraicms-open-street-map-field'
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
    el?.classList.toggle('miraicms-osm-marker--selected', selected)
  })
}

function bindMarkerEvents(marker: LeafletMarker, index: number) {
  marker.on('click', (event) => {
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
      lat: Number(pos.lat.toFixed(6)),
      lng: Number(pos.lng.toFixed(6)),
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
  const lat = Number(event.latlng.lat.toFixed(6))
  const lng = Number(event.latlng.lng.toFixed(6))
  placeMarkerAt(lat, lng)
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
      leaflet.DomEvent.on(link, 'click', (event) => {
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
  const lat = Number(geocode.center.lat.toFixed(6))
  const lng = Number(geocode.center.lng.toFixed(6))
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
  await import('leaflet-control-geocoder/dist/Control.Geocoder.css')

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
  await import('leaflet/dist/leaflet.css')

  const locateMod = await import('leaflet.locatecontrol')
  const LocateControl = locateMod.LocateControl
    ?? (locateMod as { default?: typeof locateMod.LocateControl }).default
  if (!LocateControl) {
    return
  }
  await import('leaflet.locatecontrol/dist/L.Control.Locate.css')

  const markerHtml = [
    '<span class="miraicms-osm-marker__pin" aria-hidden="true"></span>',
    '<span class="miraicms-osm-marker__pulse" aria-hidden="true"></span>',
  ].join('')

  markerIcon = L.divIcon({
    className: 'miraicms-osm-marker',
    html: markerHtml,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -36],
  })

  selectedMarkerIcon = L.divIcon({
    className: 'miraicms-osm-marker miraicms-osm-marker--selected',
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
  const lat = Number(event.latlng.lat.toFixed(6))
  const lng = Number(event.latlng.lng.toFixed(6))
  placeMarkerAt(lat, lng)
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
  <MiraiCmsFieldWrapper
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
          <MiraiCmsUiButton
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
          </MiraiCmsUiButton>

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

          <MiraiCmsUiButton
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
          </MiraiCmsUiButton>
        </div>
      </div>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-open-street-map-field';

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

  :deep(.miraicms-osm-marker) {
    background: transparent !important;
    border: 0 !important;

    .miraicms-osm-marker__pin {
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

    .miraicms-osm-marker__pulse {
      display: none;
    }

    &.miraicms-osm-marker--selected {
      .miraicms-osm-marker__pin {
        background: $color-accent-hover;
        box-shadow: 0 2px 8px rgba(47, 111, 237, 0.45);
      }

      .miraicms-osm-marker__pulse {
        display: block;
        position: absolute;
        left: 50%;
        bottom: 4px;
        width: 18px;
        height: 18px;
        margin-left: -9px;
        border-radius: 50%;
        background: rgba($color-accent, 0.35);
        animation: miraicms-osm-marker-pulse 1.4s ease-out infinite;
      }
    }
  }

  @keyframes miraicms-osm-marker-pulse {
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

  &__marker-row {
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

    :deep(.miraicms-btn) {
      flex: 0 0 auto;
    }
  }

  &__field {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: math-rem(4);
    min-width: 0;
  }

  &__field-label {
    font-size: math-rem(12);
    color: $color-muted;
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

    &.leaflet-control {
      clear: none;
    }
  }

  :deep(.leaflet-control-geocoder-form) {
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
  }

  :deep(.leaflet-control-geocoder-icon) {
    flex: 0 0 40px;
    width: 40px !important;
    height: 38px !important;
    border: 1px solid $color-border !important;
    border-radius: 0 $border-radius-inter $border-radius-inter 0 !important;
    background-color: $color-bg !important;
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
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    box-shadow: $shadow-md;
  }

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
  }

  :deep(.leaflet-control-fit-bounds a) {
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

  :deep(.leaflet-control-locate a) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
