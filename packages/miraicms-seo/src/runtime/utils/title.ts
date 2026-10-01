const DEFAULT_TEMPLATE = '%title% %sep% %sitename%'

/** Replace `%title%`, `%sep%`, and `%sitename%` in a title template. */
export function renderTitle(template: string, title: string, siteName: string, separator: string): string {
  const sep = siteName ? separator : ''
  let rendered = (template || DEFAULT_TEMPLATE)
    .replaceAll('%title%', title)
    .replaceAll('%sep%', sep)
    .replaceAll('%sitename%', siteName)
    .replace(/\s+/g, ' ')
    .trim()
  if (separator.trim()) {
    const escaped = separator.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    rendered = rendered.replace(new RegExp(`^(?:${escaped}\\s*)+|(?:\\s*${escaped})+$`, 'g'), '').trim()
  }
  return rendered || title || siteName
}
