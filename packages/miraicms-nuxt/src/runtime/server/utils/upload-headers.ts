import { extname } from 'node:path'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
}

const DOWNLOAD_EXTS = new Set(['.svg', '.html', '.htm', '.xhtml', '.xml', '.pdf'])

function downloadName(key: string): string {
  const base = key.split(/[/\\]/).pop() || 'download'
  return base.replace(/[\r\n"]/g, '') || 'download'
}

/** Headers for a stored upload. SVG and similar types are downloads, not pages. */
export function uploadResponseHeaders(key: string): Record<string, string> {
  const ext = extname(key).toLowerCase()
  const mime = MIME_BY_EXT[ext] || 'application/octet-stream'
  const disposition = DOWNLOAD_EXTS.has(ext) || mime === 'application/octet-stream' ? 'attachment' : 'inline'
  return {
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': 'sandbox; default-src \'none\'',
    'Content-Disposition': `${disposition}; filename="${downloadName(key)}"`,
    'Content-Type': mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
  }
}
