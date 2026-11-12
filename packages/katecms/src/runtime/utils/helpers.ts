import type { Component } from 'vue'

const fieldModules = import.meta.glob<{ default: Component }>(
  '../internal/fields/*.vue',
  { eager: true },
)

const fieldComponents: Record<string, Component> = Object.fromEntries(
  Object.entries(fieldModules).map(([path, mod]) => {
    const name = path.split(/[/\\]/).pop()!.replace(/\.vue$/, '')
    return [name, mod.default]
  }),
)

const extraFieldComponents = new Map<string, Component>()

/** Registers a field widget supplied by an addon. `type` matches the field config `type`. */
export function registerKateCmsField(type: string, component: Component) {
  extraFieldComponents.set(type, component)
}

/** Maps field `type` to `TypeField` from the glob of `internal/fields/*.vue`. */
function toPascalCase(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

export function resolveField(type: string): Component | undefined {
  return fieldComponents[`${toPascalCase(type)}Field`] ?? extraFieldComponents.get(type)
}
