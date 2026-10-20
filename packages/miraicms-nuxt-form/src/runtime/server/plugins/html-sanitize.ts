import { installFormHtmlSanitizer } from '../utils/html-sanitize'

/** Register the server allowlist before form pages render or forms are saved. */
export default function formHtmlSanitizer() {
  installFormHtmlSanitizer()
}
