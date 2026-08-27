/**
 * Cyrillic → Latin (Russian + common Ukrainian letters). Other characters
 * pass through. Shared by media keys, slugs, and anything else that needs
 * readable ASCII from a Cyrillic source.
 */
const TRANSLIT_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'Zh', З: 'Z',
  И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R',
  С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch',
  Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya', І: 'I', Ї: 'Yi', Є: 'Ye', Ґ: 'G',
}

/** Transliterate Cyrillic characters to Latin; other characters pass through. */
export function transliterate(input: string): string {
  let out = ''
  for (const ch of input) {
    out += ch in TRANSLIT_MAP ? TRANSLIT_MAP[ch] : ch
  }
  return out
}

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
