import sanitizeHtml from 'sanitize-html'
import { registerHtmlSanitizer } from '../../form/html-registry.ts'
import {
  HTML_ALLOWED_TAGS,
  HTML_IMAGE_ATTRIBUTES,
  HTML_LINK_ATTRIBUTES,
} from '../../form/html-policy.ts'

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: HTML_ALLOWED_TAGS,
  allowedAttributes: {
    a: HTML_LINK_ATTRIBUTES,
    img: HTML_IMAGE_ATTRIBUTES,
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
}

export function sanitizeFormHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS)
}

export function installFormHtmlSanitizer(): void {
  registerHtmlSanitizer(sanitizeFormHtml)
}
