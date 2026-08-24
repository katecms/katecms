/** Newlines → `<br>` tags. Input is HTML-escaped first. */
export function nl2br(text: string): string {
  return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>')
}

/**
 * Text → `<p>` paragraphs (simplified autop): a double newline starts a new
 * paragraph; a single newline inside a paragraph becomes `<br>`.
 * Input is HTML-escaped first.
 */
export function autop(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(block => block.length > 0)
    .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
