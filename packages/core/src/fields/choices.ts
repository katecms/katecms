import type {
  ChoiceArrayValue,
  ChoiceMap,
  ChoiceReturnFormat,
  ImageChoiceMap,
  SelectChoice,
  SelectChoiceGroup,
  SelectChoiceItem,
  SelectChoiceValue,
} from '../config'

export interface ChoiceLabelLookup {
  labelOf: (raw: string) => string
  rawOfLabel: (label: string) => string | undefined
}

export function isSelectChoiceGroup(opt: SelectChoice): opt is SelectChoiceGroup {
  return 'type' in opt && opt.type === 'group'
}

export function selectChoiceValue(opt: SelectChoiceItem): SelectChoiceValue {
  return opt.val ?? opt.lbl
}

export function walkSelectChoices(
  choices: SelectChoice[],
  visit: (opt: SelectChoiceItem) => void,
): void {
  for (const opt of choices) {
    if (isSelectChoiceGroup(opt)) {
      for (const child of opt.childs ?? []) {
        visit(child)
      }
    }
    else {
      visit(opt)
    }
  }
}

export function choiceMapLookup(choices: ChoiceMap): ChoiceLabelLookup {
  return {
    labelOf: raw => choices[raw] ?? raw,
    rawOfLabel: (label) => {
      return Object.keys(choices).find(key => choices[key] === label)
    },
  }
}

export function imageChoiceLookup(choices: ImageChoiceMap): ChoiceLabelLookup {
  return {
    labelOf: raw => choices[raw]?.label ?? raw,
    rawOfLabel: (label) => {
      return Object.keys(choices).find(key => choices[key]?.label === label)
    },
  }
}

export function selectChoiceLookup(choices: SelectChoice[]): ChoiceLabelLookup {
  return {
    labelOf: (raw) => {
      let found: string | undefined
      walkSelectChoices(choices, (opt) => {
        if (found === undefined && String(selectChoiceValue(opt)) === raw) {
          found = opt.lbl
        }
      })
      return found ?? raw
    },
    rawOfLabel: (label) => {
      let found: string | undefined
      walkSelectChoices(choices, (opt) => {
        if (found === undefined && opt.lbl === label) {
          found = String(selectChoiceValue(opt))
        }
      })
      return found
    },
  }
}

export function encodeChoiceValue(
  raw: string,
  lookup: ChoiceLabelLookup,
  returnFormat?: ChoiceReturnFormat,
): string | ChoiceArrayValue {
  const label = lookup.labelOf(raw)
  if (returnFormat === 'label') {
    return label
  }
  if (returnFormat === 'array') {
    return { value: raw, label }
  }
  return raw
}

export function decodeChoiceValue(
  value: unknown,
  lookup: ChoiceLabelLookup,
  returnFormat?: ChoiceReturnFormat,
): string {
  if (value == null || value === '') {
    return ''
  }
  if (returnFormat === 'array' && typeof value === 'object') {
    return String((value as { value?: unknown }).value ?? '')
  }
  if (returnFormat === 'label') {
    const label = String(value)
    return lookup.rawOfLabel(label) ?? label
  }
  return String(value)
}
