import { sanitizeHtmlInBrowser } from './html.browser.ts'
import { sanitizeHtmlOnServer } from './html-registry.ts'

/** Allowlisted HTML for form copy. Event handlers, scripts, and SVG are removed. */
export function sanitizeHtml(html: string): string {
  if (!html) {
    return ''
  }
  if (typeof window !== 'undefined') {
    return sanitizeHtmlInBrowser(html)
  }
  return sanitizeHtmlOnServer(html)
}
