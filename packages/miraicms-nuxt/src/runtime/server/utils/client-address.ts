/**
 * How many reverse proxies may append to `X-Forwarded-For`.
 * `MIRAICMS_TRUST_PROXY=1` trusts one proxy and uses the address it added.
 * Unset means the header is ignored and the socket address is used.
 */
export function trustedProxyHops(raw = process.env.MIRAICMS_TRUST_PROXY): number {
  const value = (raw ?? '').trim().toLowerCase()
  if (!value || value === '0' || value === 'false' || value === 'off') {
    return 0
  }
  if (value === 'true' || value === 'on') {
    return 1
  }
  const hops = Number(value)
  if (!Number.isInteger(hops) || hops < 1) {
    return 0
  }
  return hops
}

/**
 * Client address for the auth limiter.
 * With `hops` 0 the forwarded header is ignored, so a caller cannot pick a new
 * bucket by sending another `X-Forwarded-For`.
 */
export function clientAddress(options: {
  forwardedFor?: string | null
  hops: number
  socketAddress?: string | null
}): string {
  const socket = options.socketAddress?.trim() || 'unknown'
  if (options.hops < 1) {
    return socket
  }
  const parts = (options.forwardedFor ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
  const index = parts.length - options.hops
  return index >= 0 && parts[index] ? parts[index] : socket
}
