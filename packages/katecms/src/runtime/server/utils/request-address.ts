import type { H3Event } from 'h3'
import { getRequestHeader, getRequestIP } from 'h3'
import { clientAddress, trustedProxyHops } from './client-address'

/**
 * Socket address, or the client address added by a trusted proxy.
 * `X-Forwarded-For` is ignored unless `MIRAICMS_TRUST_PROXY` is set.
 */
export function eventClientAddress(event: H3Event): string {
  const hops = trustedProxyHops()
  return clientAddress({
    forwardedFor: hops > 0 ? getRequestHeader(event, 'x-forwarded-for') : undefined,
    hops,
    socketAddress: getRequestIP(event),
  })
}
