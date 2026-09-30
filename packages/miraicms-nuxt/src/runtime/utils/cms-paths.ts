/** Normalise a config path segment into an absolute route (`admin` → `/admin`). */
export function cmsRoutePath(segment: string): string {
  const trimmed = String(segment ?? '').replace(/^\/+|\/+$/g, '')
  return `/${trimmed}`
}

/** Child of the admin route (`admin` + `login` → `/admin/login`). */
export function cmsAdminChildPath(adminPath: string, segment: string): string {
  const root = cmsRoutePath(adminPath).replace(/\/$/, '')
  const child = String(segment ?? '').replace(/^\/+|\/+$/g, '')
  return child ? `${root}/${child}` : root
}

export function isCmsAdminPath(path: string, adminPath: string): boolean {
  const root = cmsRoutePath(adminPath)
  return path === root || path.startsWith(`${root}/`)
}
