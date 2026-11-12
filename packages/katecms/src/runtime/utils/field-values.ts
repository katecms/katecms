import { inject, isRef, provide, type InjectionKey, type Ref } from 'vue'

/**
 * Parent form / group values for layout-only fields (`tab`, `accordion`).
 * May be a reactive object or a ref to one (e.g. group `defineModel`).
 */
export type KateCmsFieldValuesStore = Ref<Record<string, unknown>> | Record<string, unknown>

export const miraiCmsFieldValuesKey: InjectionKey<KateCmsFieldValuesStore> = Symbol('miraiCmsFieldValues')

export function provideKateCmsFieldValues(store: KateCmsFieldValuesStore): void {
  provide(miraiCmsFieldValuesKey, store)
}

function readStore(store: KateCmsFieldValuesStore | null): Record<string, unknown> {
  if (!store) {
    return {}
  }
  if (isRef(store)) {
    const value = store.value
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  }
  return store
}

/**
 * Read/write helpers for the nearest provided field-values store.
 * Layout fields (`tab` / `accordion`) use this instead of their own v-model.
 */
export function useKateCmsFieldValues() {
  const store = inject(miraiCmsFieldValuesKey, null)

  function getValues(): Record<string, unknown> {
    return readStore(store)
  }

  function setValue(key: string, value: unknown): void {
    if (!store) {
      return
    }
    if (isRef(store)) {
      const current = readStore(store)
      store.value = {
        ...current,
        [key]: value,
      }
      return
    }
    store[key] = value
  }

  function ensureDefaults(defaults: Record<string, unknown>): void {
    if (!store) {
      return
    }
    if (isRef(store)) {
      const current = { ...readStore(store) }
      let changed = false
      for (const [key, value] of Object.entries(defaults)) {
        if (!(key in current)) {
          current[key] = value
          changed = true
        }
      }
      if (changed) {
        store.value = current
      }
      return
    }
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in store)) {
        store[key] = value
      }
    }
  }

  function removeKey(key: string): void {
    if (!store) {
      return
    }
    if (isRef(store)) {
      const current = readStore(store)
      if (!(key in current)) {
        return
      }
      const next = { ...current }
      Reflect.deleteProperty(next, key)
      store.value = next
      return
    }
    Reflect.deleteProperty(store, key)
  }

  return {
    store,
    getValues,
    setValue,
    ensureDefaults,
    removeKey,
  }
}
