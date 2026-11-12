<script setup lang="ts">
import type { FormCondition, FormConditionAction, FormConditionBranch, FormConditionGroup, FormConditionLogic, FormConditionRule, FormContent, FormField } from '../../form/model'
import { FORM_CONDITION_ACTIONS, FORM_CONDITION_LOGICS, conditionBranches } from '../../form/model'
import { listedChoiceOptions } from '../../form/text-options'

const props = defineProps<{
  content: FormContent
}>()

const emit = defineEmits<{
  update: [conditions: FormContent['conditions']]
}>()

const rootClass = 'katecms-form-conditions'

const logicLabels: Record<FormConditionLogic, string> = {
  equal: 'Equal',
  not_equal: 'Not equal',
  null: 'Is empty',
  not_null: 'Is not empty',
  contain: 'Contains',
  not_contain: 'Does not contain',
  contain_all: 'Contains all',
  greater: 'Greater than',
  less: 'Less than',
  greater_or_equal: 'Greater than or equal',
  less_or_equal: 'Less than or equal',
  start_with: 'Starts with',
  end_with: 'Ends with',
  between: 'Between',
}

const actionLabels: Record<FormConditionAction, string> = {
  show: 'Show',
  hide: 'Hide',
  enable: 'Enable',
  disable: 'Disable',
  readonly: 'Read only',
  writable: 'Writable',
  required: 'Required',
}

const kindLabels: Record<FormConditionBranch['kind'], string> = {
  if: 'If',
  else_if: 'Else if',
  else: 'Else',
}

function fieldLabel(field: FormField | undefined): string {
  if (!field) {
    return 'Field'
  }
  const marked = field.text?.label
  if (marked) {
    const label = marked.text.trim()
    if (!marked.enabled || !label) {
      return field.key || 'Field'
    }
    return label
  }
  return field.label.trim() || field.key || 'Field'
}

function fieldById(id: string): FormField | undefined {
  return props.content.fields.find(field => field.id === id)
}

function fieldChoices() {
  return props.content.fields.map(field => ({ val: field.id, lbl: fieldLabel(field) }))
}

function blankRule(fieldId = ''): FormConditionRule {
  return { id: `r_${crypto.randomUUID()}`, ...(fieldId ? { fieldId } : {}), logic: 'equal', value: '' }
}

function blankGroup(fieldId = ''): FormConditionGroup {
  return { id: `g_${crypto.randomUUID()}`, match: 'all', rules: [blankRule(fieldId)] }
}

function blankBranch(kind: FormConditionBranch['kind'], action: FormConditionAction = 'show'): FormConditionBranch {
  const fieldId = props.content.fields[0]?.id ?? ''
  const target = props.content.fields.find(field => field.id !== fieldId)
  return {
    id: `b_${crypto.randomUUID()}`,
    kind,
    fieldId: kind === 'else' ? '' : fieldId,
    groups: kind === 'else' ? [] : [blankGroup(fieldId)],
    action,
    targetFieldIds: target ? [target.id] : [],
  }
}

function blankCondition(): FormCondition {
  return {
    id: `c_${crypto.randomUUID()}`,
    enabled: true,
    title: 'Condition',
    branches: [blankBranch('if')],
  }
}

function write(next: FormCondition[]) {
  emit('update', next)
}

function replace(condition: FormCondition) {
  const current = props.content.conditions ?? []
  write(current.some(item => item.id === condition.id)
    ? current.map(item => item.id === condition.id ? condition : item)
    : [...current, condition])
}

function branches(condition: FormCondition): FormConditionBranch[] {
  return conditionBranches(condition)
}

function hasElse(condition: FormCondition): boolean {
  return branches(condition).some(branch => branch.kind === 'else')
}

function mapBranch(condition: FormCondition, branchId: string, update: (branch: FormConditionBranch) => FormConditionBranch): FormCondition {
  return {
    ...condition,
    branches: branches(condition).map(branch => branch.id === branchId ? update(branch) : branch),
  }
}

function mapGroup(branch: FormConditionBranch, groupId: string, update: (group: FormConditionGroup) => FormConditionGroup): FormConditionBranch {
  return { ...branch, groups: branch.groups.map(group => group.id === groupId ? update(group) : group) }
}

function watchedIds(branch: FormConditionBranch): Set<string> {
  const ids = new Set<string>()
  if (branch.fieldId) {
    ids.add(branch.fieldId)
  }
  for (const group of branch.groups) {
    for (const rule of group.rules) {
      if (rule.fieldId) {
        ids.add(rule.fieldId)
      }
    }
  }
  return ids
}

function setRuleField(condition: FormCondition, branch: FormConditionBranch, group: FormConditionGroup, rule: FormConditionRule, fieldId: string) {
  const next = mapBranch(condition, branch.id, (item) => {
    const groups = item.groups.map(entry => entry.id === group.id
      ? { ...entry, rules: entry.rules.map(current => current.id === rule.id ? { ...current, fieldId } : current) }
      : entry)
    const first = groups[0]?.rules[0]
    return {
      ...item,
      fieldId: first?.fieldId || fieldId,
      groups,
      targetFieldIds: item.targetFieldIds.filter(id => id !== fieldId),
    }
  })
  replace(next)
}

function setTargets(condition: FormCondition, branch: FormConditionBranch, raw: unknown) {
  const blocked = watchedIds(branch)
  const ids = (Array.isArray(raw) ? raw : [raw])
    .map(item => String(item ?? ''))
    .filter(id => id && !blocked.has(id))
  replace(mapBranch(condition, branch.id, item => ({ ...item, targetFieldIds: ids })))
}

function targetChoices(branch: FormConditionBranch) {
  const blocked = watchedIds(branch)
  return props.content.fields.filter(field => !blocked.has(field.id)).map(field => ({ val: field.id, lbl: fieldLabel(field) }))
}

function ruleField(branch: FormConditionBranch, rule: FormConditionRule): FormField | undefined {
  return fieldById(rule.fieldId || branch.fieldId)
}

function choiceValues(field: FormField | undefined) {
  if (!field) {
    return []
  }
  const listed = field.text ? listedChoiceOptions(field.text) : []
  const options = listed.length ? listed : field.options
  return options.map(option => ({ val: option.value, lbl: option.label || option.value }))
}

function choiceLogic(logic: FormConditionLogic): boolean {
  return logic === 'equal' || logic === 'not_equal' || logic === 'contain' || logic === 'not_contain' || logic === 'contain_all'
}

function valueIsList(field: FormField | undefined): boolean {
  if (!field) {
    return false
  }
  return field.type === 'checkbox'
    || (field.type === 'image_select' && field.text?.allowMultiple === true)
    || (field.type === 'select' && field.text?.selectMultiple.enabled === true)
}

function betweenParts(value: string): { min: string, max: string } {
  try {
    const parsed = JSON.parse(value) as { min?: unknown, max?: unknown }
    return { min: parsed.min == null ? '' : String(parsed.min), max: parsed.max == null ? '' : String(parsed.max) }
  }
  catch {
    return { min: '', max: '' }
  }
}

function addElseIf(condition: FormCondition) {
  const next = blankBranch('else_if')
  const items = branches(condition)
  const elseIndex = items.findIndex(branch => branch.kind === 'else')
  const branchesNext = elseIndex < 0 ? [...items, next] : [...items.slice(0, elseIndex), next, ...items.slice(elseIndex)]
  replace({ ...condition, branches: branchesNext })
}

function addElse(condition: FormCondition) {
  if (hasElse(condition)) {
    return
  }
  const ifAction = branches(condition)[0]?.action
  replace({ ...condition, branches: [...branches(condition), blankBranch('else', ifAction === 'show' ? 'hide' : 'show')] })
}

function deleteGroup(condition: FormCondition, branch: FormConditionBranch, groupId: string) {
  replace(mapBranch(condition, branch.id, (item) => {
    const groups = item.groups.filter(entry => entry.id !== groupId)
    return {
      ...item,
      groups,
      fieldId: groups[0]?.rules[0]?.fieldId || item.fieldId,
    }
  }))
}

function deleteBranch(condition: FormCondition, branchId: string) {
  const next = branches(condition).filter(branch => branch.id !== branchId)
  if (!next.some(branch => branch.kind === 'if')) {
    write((props.content.conditions ?? []).filter(item => item.id !== condition.id))
    return
  }
  replace({ ...condition, branches: next })
}
</script>

<template>
  <div :class="rootClass">
    <div
      v-if="!(content.conditions ?? []).length"
      :class="`${rootClass}__empty`"
    >
      No conditions yet.
    </div>
    <div
      v-for="condition in content.conditions ?? []"
      :key="condition.id"
      :class="`${rootClass}__card`"
    >
      <div :class="`${rootClass}__head`">
        <KateCmsTrueFalseField
          :model-value="condition.enabled"
          :field-key="`${condition.id}-enabled`"
          :field="{ type: 'true_false', label: 'Enabled' }"
          @update:model-value="replace({ ...condition, enabled: $event === true })"
        />
        <KateCmsTextField
          :model-value="condition.title"
          :field-key="`${condition.id}-title`"
          :field="{ type: 'text', label: 'Name', maxLength: 80 }"
          @update:model-value="replace({ ...condition, title: String($event ?? '') })"
        />
      </div>

      <div
        v-for="(branch, branchIndex) in branches(condition)"
        :key="branch.id"
        :class="`${rootClass}__branch`"
      >
        <div :class="`${rootClass}__kind`">
          {{ kindLabels[branch.kind] }}
        </div>

        <template v-if="branch.kind !== 'else'">
          <template
            v-for="(group, groupIndex) in branch.groups"
            :key="group.id"
          >
            <div
              v-if="groupIndex > 0"
              :class="`${rootClass}__join`"
            >
              And
            </div>
            <KateCmsSelectField
              v-if="group.rules.length > 1"
              :model-value="group.match"
              :field-key="`${group.id}-combine`"
              :field="{
                type: 'select',
                label: 'Combine rules',
                returnFormat: 'value',
                choices: [
                  { val: 'all', lbl: 'All of these' },
                  { val: 'any', lbl: 'Any of these' },
                ],
              }"
              @update:model-value="replace(mapBranch(condition, branch.id, item => mapGroup(item, group.id, current => ({ ...current, match: $event === 'any' ? 'any' : 'all' }))))"
            />
            <div
              v-for="rule in group.rules"
              :key="rule.id"
              :class="`${rootClass}__rule`"
            >
              <KateCmsSelectField
                :model-value="rule.fieldId || branch.fieldId"
                :field-key="`${rule.id}-field`"
                :field="{ type: 'select', label: 'Field', returnFormat: 'value', choices: fieldChoices() }"
                @update:model-value="setRuleField(condition, branch, group, rule, String($event ?? ''))"
              />
              <KateCmsSelectField
                :model-value="rule.logic"
                :field-key="`${rule.id}-logic`"
                :field="{
                  type: 'select',
                  label: 'Operator',
                  returnFormat: 'value',
                  choices: FORM_CONDITION_LOGICS.map(logic => ({ val: logic, lbl: logicLabels[logic] })),
                }"
                @update:model-value="replace(mapBranch(condition, branch.id, item => mapGroup(item, group.id, current => ({ ...current, rules: current.rules.map(entry => entry.id === rule.id ? { ...entry, logic: FORM_CONDITION_LOGICS.includes($event as FormConditionLogic) ? $event as FormConditionLogic : 'equal' } : entry) }))))"
              />
              <div
                v-if="rule.logic !== 'null' && rule.logic !== 'not_null'"
                :class="`${rootClass}__value`"
              >
                <template v-if="rule.logic === 'between'">
                  <KateCmsTextField
                    :model-value="betweenParts(rule.value).min"
                    :field-key="`${rule.id}-min`"
                    :field="{ type: 'text', label: 'Min', maxLength: 80 }"
                    @update:model-value="replace(mapBranch(condition, branch.id, item => mapGroup(item, group.id, current => ({ ...current, rules: current.rules.map(entry => entry.id === rule.id ? { ...entry, value: JSON.stringify({ min: String($event ?? ''), max: betweenParts(entry.value).max }) } : entry) }))))"
                  />
                  <KateCmsTextField
                    :model-value="betweenParts(rule.value).max"
                    :field-key="`${rule.id}-max`"
                    :field="{ type: 'text', label: 'Max', maxLength: 80 }"
                    @update:model-value="replace(mapBranch(condition, branch.id, item => mapGroup(item, group.id, current => ({ ...current, rules: current.rules.map(entry => entry.id === rule.id ? { ...entry, value: JSON.stringify({ min: betweenParts(entry.value).min, max: String($event ?? '') }) } : entry) }))))"
                  />
                </template>
                <KateCmsSelectField
                  v-else-if="choiceValues(ruleField(branch, rule)).length && choiceLogic(rule.logic)"
                  :model-value="valueIsList(ruleField(branch, rule)) ? rule.value.split(',').filter(Boolean) : rule.value"
                  :field-key="`${rule.id}-choice`"
                  :field="{
                    type: 'select',
                    label: 'Value',
                    returnFormat: 'value',
                    multiple: valueIsList(ruleField(branch, rule)),
                    choices: choiceValues(ruleField(branch, rule)),
                  }"
                  @update:model-value="replace(mapBranch(condition, branch.id, item => mapGroup(item, group.id, current => ({ ...current, rules: current.rules.map(entry => entry.id === rule.id ? { ...entry, value: Array.isArray($event) ? $event.map(String).join(',') : String($event ?? '') } : entry) }))))"
                />
                <KateCmsTextField
                  v-else
                  :model-value="rule.value"
                  :field-key="`${rule.id}-value`"
                  :field="{ type: 'text', label: 'Value', maxLength: 500 }"
                  @update:model-value="replace(mapBranch(condition, branch.id, item => mapGroup(item, group.id, current => ({ ...current, rules: current.rules.map(entry => entry.id === rule.id ? { ...entry, value: String($event ?? '') } : entry) }))))"
                />
              </div>
              <KateCmsUiButton
                v-if="group.rules.length > 1"
                tag="button"
                aria-label="Delete rule"
                :variant="['red', 'icon']"
                @click="replace(mapBranch(condition, branch.id, item => mapGroup(item, group.id, current => ({ ...current, rules: current.rules.filter(entry => entry.id !== rule.id) }))))"
              >
                <svg
                  data-v-dc89e617=""
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                ><path
                  data-v-dc89e617=""
                  d="M3 5.25H15"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                /><path
                  data-v-dc89e617=""
                  d="M7.5 8.25V12.75"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                /><path
                  data-v-dc89e617=""
                  d="M10.5 8.25V12.75"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                /><path
                  data-v-dc89e617=""
                  d="M3.75 5.25L4.5 14.25C4.5 14.6478 4.65804 15.0294 4.93934 15.3107C5.22064 15.592 5.60218 15.75 6 15.75H12C12.3978 15.75 12.7794 15.592 13.0607 15.3107C13.342 15.0294 13.5 14.6478 13.5 14.25L14.25 5.25"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                /><path
                  data-v-dc89e617=""
                  d="M6.75 5.25V3C6.75 2.80109 6.82902 2.61032 6.96967 2.46967C7.11032 2.32902 7.30109 2.25 7.5 2.25H10.5C10.6989 2.25 10.8897 2.32902 11.0303 2.46967C11.171 2.61032 11.25 2.80109 11.25 3V5.25"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="currentColor"
                /></svg>
              </KateCmsUiButton>
            </div>
            <div :class="`${rootClass}__links`">
              <KateCmsUiButton
                tag="button"
                :variant="['secondary', 'small']"
                aria-label="Add rule"
                @click="replace(mapBranch(condition, branch.id, item => mapGroup(item, group.id, current => ({ ...current, rules: [...current.rules, blankRule(branch.fieldId)] }))))"
              >
                Add rule
              </KateCmsUiButton>
              <KateCmsUiButton
                v-if="groupIndex === branch.groups.length - 1"
                tag="button"
                :variant="['secondary', 'small']"
                aria-label="And group"
                @click="replace(mapBranch(condition, branch.id, item => ({ ...item, groups: [...item.groups, blankGroup(branch.fieldId)] })))"
              >
                And group
              </KateCmsUiButton>
              <KateCmsUiButton
                v-if="branch.groups.length > 1"
                tag="button"
                aria-label="Delete group"
                :variant="['red', 'small']"
                @click="deleteGroup(condition, branch, group.id)"
              >
                Delete group
              </KateCmsUiButton>
            </div>
          </template>
        </template>

        <div :class="`${rootClass}__then`">
          <span :class="`${rootClass}__word`">Then</span>
          <KateCmsSelectField
            :model-value="branch.action"
            :field-key="`${branch.id}-action`"
            :field="{
              type: 'select',
              label: 'Action',
              returnFormat: 'value',
              choices: FORM_CONDITION_ACTIONS.map(action => ({ val: action, lbl: actionLabels[action] })),
            }"
            @update:model-value="replace(mapBranch(condition, branch.id, item => ({ ...item, action: ($event === 'hide' || $event === 'enable' || $event === 'disable' || $event === 'readonly' || $event === 'writable' || $event === 'required') ? $event : 'show' })))"
          />
          <KateCmsSelectField
            :model-value="branch.targetFieldIds"
            :field-key="`${branch.id}-targets`"
            :field="{
              type: 'select',
              label: 'Fields',
              returnFormat: 'value',
              multiple: true,
              choices: targetChoices(branch),
            }"
            @update:model-value="setTargets(condition, branch, $event)"
          />
        </div>
        <KateCmsUiButton
          v-if="branch.kind !== 'if'"
          tag="button"
          aria-label="Delete branch"
          :variant="['red', 'small']"
          @click="deleteBranch(condition, branch.id)"
        >
          Delete {{ kindLabels[branch.kind] }}
        </KateCmsUiButton>
        <div
          v-if="branchIndex < branches(condition).length - 1"
          :class="`${rootClass}__gap`"
        />
      </div>

      <div :class="`${rootClass}__links`">
        <KateCmsUiButton
          tag="button"
          :variant="['secondary', 'small']"
          aria-label="Else if"
          @click="addElseIf(condition)"
        >
          Else if
        </KateCmsUiButton>
        <KateCmsUiButton
          v-if="!hasElse(condition)"
          tag="button"
          :variant="['secondary', 'small']"
          aria-label="Else"
          @click="addElse(condition)"
        >
          Else
        </KateCmsUiButton>
        <KateCmsUiButton
          tag="button"
          aria-label="Delete condition"
          :variant="['red', 'small']"
          @click="write((content.conditions ?? []).filter(item => item.id !== condition.id))"
        >
          Delete condition
        </KateCmsUiButton>
      </div>
    </div>
    <KateCmsUiButton
      tag="button"
      aria-label="Add Condition"
      title="Add Condition"
      @click="write([...(content.conditions ?? []), blankCondition()])"
    >
      Add Condition
    </KateCmsUiButton>
  </div>
</template>

<style scoped lang="scss">
@use "katecms/styles" as *;
$root: '.katecms-form-conditions';

#{$root} {
  //display: flex;
  //flex-direction: column;
  //gap: math-rem(12);

  &__empty {
    width: 100%;
    color: $color-muted;
    font-size: math-rem(16);
    margin-bottom: math-rem(12);
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: math-rem(12);
    padding: math-rem(12);
    border: 1px solid $color-border;
    border-radius: $border-radius;
    margin-bottom: math-rem(12);
  }

  &__head {
    display: grid;
    grid-template-columns: math-rem(160) minmax(0, 1fr);
    gap: math-rem(8);
    align-items: end;
  }

  &__branch {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
    padding: math-rem(10);
    border-radius: $border-radius;
    background: $color-bg;
  }

  &__kind,
  &__word,
  &__join {
    font-size: math-rem(13);
    font-weight: 700;
  }

  &__word {
    padding-bottom: math-rem(8);
  }

  &__rule {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.1fr) auto;
    gap: math-rem(8);
    align-items: end;
  }

  &__value {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
    min-width: 0;
  }

  &__then {
    display: grid;
    grid-template-columns: math-rem(52) minmax(math-rem(140), math-rem(220)) minmax(0, 1fr);
    gap: math-rem(8);
    align-items: end;
  }

  &__links {
    display: flex;
    flex-wrap: wrap;
    gap: math-rem(8);
  }
}
</style>
