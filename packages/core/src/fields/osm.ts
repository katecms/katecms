import type { OsmAddress, OsmMarker } from '../config/types/fields'

export const OSM_ADDRESS_KEYS = [
  'house_number',
  'road',
  'suburb',
  'city_district',
  'city',
  'ISO3166-2-lvl4',
  'postcode',
  'country',
  'country_code',
  'building',
  'town',
  'village',
  'hamlet',
  'state',
] as const satisfies ReadonlyArray<keyof OsmAddress>

type MissingOsmAddressKey = Exclude<keyof OsmAddress, (typeof OSM_ADDRESS_KEYS)[number]>
const _osmAddressKeysComplete: MissingOsmAddressKey extends never ? true : never = true
void _osmAddressKeysComplete

export function emptyOsmAddress(): OsmAddress {
  const address = {} as OsmAddress
  for (const key of OSM_ADDRESS_KEYS) {
    address[key] = ''
  }
  return address
}

export function isOsmMarker(value: unknown): value is OsmMarker {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const marker = value as Partial<OsmMarker>
  return typeof marker.lat === 'number' && typeof marker.lng === 'number'
}

export function osmAddressFromNominatim(
  raw?: Record<string, string | undefined> | null,
): OsmAddress {
  const address = emptyOsmAddress()
  if (!raw) {
    return address
  }
  for (const key of OSM_ADDRESS_KEYS) {
    const value = raw[key]
    address[key] = typeof value === 'string' ? value : ''
  }
  return address
}
