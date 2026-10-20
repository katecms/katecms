import createDOMPurify from 'dompurify'
import { HTML_ALLOWED_TAGS, HTML_BROWSER_ATTRIBUTES } from './html-policy.ts'

let browserPurifier: ReturnType<typeof createDOMPurify> | undefined

/** Browser allowlist for form copy rendered with v-html. */
export function sanitizeHtmlInBrowser(html: string): string {
  if (!browserPurifier) {
    browserPurifier = createDOMPurify(window)
  }
  return String(browserPurifier.sanitize(html, {
    ALLOWED_TAGS: HTML_ALLOWED_TAGS,
    ALLOWED_ATTR: HTML_BROWSER_ATTRIBUTES,
    ALLOW_DATA_ATTR: false,
  }))
}
