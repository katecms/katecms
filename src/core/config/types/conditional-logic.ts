/** Operators for field visibility conditions. */
export type Operator
  = | 'empty'
    | 'notEmpty'
    | 'equal'
    | 'notEqual'
    | 'contains'
    | 'notContains'
    | 'matches'
    | 'gt'
    | 'lt'

export type ConditionValue = string | number | boolean | Array<string | number>

/** One condition: value of `field` compared with `operator` / `value`. */
export interface Condition {
  field: string
  operator: Operator
  /** Not required for `empty` / `notEmpty`. */
  value?: ConditionValue
}

/**
 * Field visibility rules.
 * Outer array = OR between groups, inner array = AND inside a group.
 */
export type ConditionalLogic = Condition[][]
