let serverSanitizer: ((html: string) => string) | undefined

/** Holds the server function so the browser and server modules do not import each other. */
export function registerHtmlSanitizer(sanitize: (html: string) => string): void {
  serverSanitizer = sanitize
}

export function sanitizeHtmlOnServer(html: string): string {
  if (!serverSanitizer) {
    throw new Error('Form HTML sanitizer is not installed.')
  }
  return serverSanitizer(html)
}
