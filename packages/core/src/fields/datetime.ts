const DATE_TOKENS = /YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Default display / storage formats for date, datetime, and time fields. */
export const DATE_FIELD_FORMATS = {
  date: { display: 'DD.MM.YYYY', return: 'YYYY-MM-DD' },
  datetime: { display: 'DD.MM.YYYY HH:mm', return: 'YYYY-MM-DD HH:mm' },
  time: { display: 'HH:mm', return: 'HH:mm' },
} as const

/** Format a date with tokens YYYY/YY/MM/M/DD/D/HH/H/mm/m/ss/s. */
export function formatDate(date: Date, fmt: string): string {
  const map: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: pad(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    DD: pad(date.getDate()),
    D: String(date.getDate()),
    HH: pad(date.getHours()),
    H: String(date.getHours()),
    mm: pad(date.getMinutes()),
    m: String(date.getMinutes()),
    ss: pad(date.getSeconds()),
    s: String(date.getSeconds()),
  }
  return fmt.replace(DATE_TOKENS, token => map[token] ?? token)
}

/**
 * Parse a string with the same tokens as `formatDate`.
 * Missing date parts default to today; missing time parts default to 00.
 */
export function parseDate(value: string, fmt: string): Date | null {
  const tokens: string[] = []
  const pattern = fmt
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(DATE_TOKENS, (token) => {
      tokens.push(token)
      return token.length >= 2 ? `(\\d{${token.length}})` : '(\\d{1,2})'
    })
  const match = value.match(new RegExp(`^${pattern}$`))
  if (!match) {
    return null
  }
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  let day = now.getDate()
  let hour = 0
  let minute = 0
  let second = 0
  tokens.forEach((token, index) => {
    const num = Number.parseInt(match[index + 1]!, 10)
    if (token.startsWith('Y')) {
      year = token === 'YY' ? 2000 + num : num
    }
    else if (token.startsWith('M')) {
      month = num
    }
    else if (token.startsWith('D')) {
      day = num
    }
    else if (token.startsWith('H')) {
      hour = num
    }
    else if (token.startsWith('m')) {
      minute = num
    }
    else {
      second = num
    }
  })
  const date = new Date(year, month - 1, day, hour, minute, second)
  return Number.isNaN(date.getTime()) ? null : date
}
