/** Normalise a config path segment into an absolute route (`admin` → `/admin`). */
export function cmsRoutePath(segment: string): string {
  const trimmed = String(segment ?? '').replace(/^\/+|\/+$/g, '')
  return `/${trimmed}`
}

export function isCmsAdminPath(path: string, adminPath: string): boolean {
  const root = cmsRoutePath(adminPath)
  return path === root || path.startsWith(`${root}/`)
}
