export interface StepIcon {
  id: string
  label: string
  svg: string
}

function icon(path: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
}

export const STEP_ICONS: StepIcon[] = [
  { id: 'check', label: 'Check', svg: icon('<path d="M5 12.5 9.2 17 19 7"/>') },
  { id: 'user', label: 'User', svg: icon('<circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.2a6.5 6.5 0 0 1 13 0"/>') },
  { id: 'mail', label: 'Mail', svg: icon('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>') },
  { id: 'phone', label: 'Phone', svg: icon('<path d="M8 4.5h2.2l1.2 3-1.6 1a12 12 0 0 0 5.7 5.7l1-1.6 3 1.2V16a2 2 0 0 1-2.2 2A14.5 14.5 0 0 1 6 6.7 2 2 0 0 1 8 4.5Z"/>') },
  { id: 'home', label: 'Home', svg: icon('<path d="m4 11 8-7 8 7"/><path d="M6.5 10.5V19h11v-8.5"/>') },
  { id: 'star', label: 'Star', svg: icon('<path d="m12 3.8 2.1 4.6 5 .6-3.7 3.4.9 4.9L12 15.2 7.7 17.3l.9-4.9L4.9 9l5-.6Z"/>') },
  { id: 'calendar', label: 'Calendar', svg: icon('<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.8v3.2M16 3.8v3.2M4 10h16"/>') },
  { id: 'clock', label: 'Clock', svg: icon('<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/>') },
  { id: 'file', label: 'File', svg: icon('<path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M14 3.8V8h4.2"/>') },
  { id: 'image', label: 'Image', svg: icon('<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.4"/><path d="m7 16 3.2-3.2a1 1 0 0 1 1.4 0L16 17"/>') },
  { id: 'map', label: 'Map', svg: icon('<path d="m9 5-4.5 2v12L9 17l6 2 4.5-2V5L15 7Z"/><path d="M9 5v12M15 7v12"/>') },
  { id: 'lock', label: 'Lock', svg: icon('<rect x="6" y="10" width="12" height="9" rx="1.5"/><path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2"/>') },
  { id: 'heart', label: 'Heart', svg: icon('<path d="M12 19s-6.5-4.1-6.5-8.2A3.4 3.4 0 0 1 12 8.6a3.4 3.4 0 0 1 6.5 2.2C18.5 14.9 12 19 12 19Z"/>') },
  { id: 'cart', label: 'Cart', svg: icon('<circle cx="9" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/><path d="M4 5h2.2l1.6 9.2h9.4l1.6-6.2H7.2"/>') },
  { id: 'message', label: 'Message', svg: icon('<path d="M5 6.5h14v9H9l-4 3Z"/>') },
  { id: 'flag', label: 'Flag', svg: icon('<path d="M6 4.5v15"/><path d="M6 5.5h9l-1.5 3L15 12H6"/>') },
]

const ICONS_BY_ID = new Map(STEP_ICONS.map(item => [item.id, item.svg]))

export function stepIconSvg(id: string): string {
  return ICONS_BY_ID.get(id) ?? ''
}

export function knownStepIcon(id: string): string {
  return ICONS_BY_ID.has(id) ? id : ''
}
