import type { Component } from 'vue'

const fieldModules = import.meta.glob<{ default: Component }>(
  '../components/fields/*.vue',
  { eager: true },
)

const fieldComponents: Record<string, Component> = Object.fromEntries(
  Object.entries(fieldModules).map(([path, mod]) => {
    const name = path.split(/[/\\]/).pop()!.replace(/\.vue$/, '')
    return [name, mod.default]
  }),
)

/** Maps field `type` to `TypeField` from the glob above. */
function toPascalCase(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

export function resolveField(type: string): Component | undefined {
  return fieldComponents[`${toPascalCase(type)}Field`]
}
