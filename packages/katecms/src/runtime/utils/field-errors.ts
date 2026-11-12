import { computed, inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'

export const miraiCmsFieldErrorsKey: InjectionKey<Ref<Record<string, string>>> = Symbol('katecmsFieldErrors')

export function provideKateCmsFieldErrors(errors: Ref<Record<string, string>>): void {
  provide(miraiCmsFieldErrorsKey, errors)
}

export function useKateCmsFieldError(fieldKey: () => string): ComputedRef<string> {
  const errors = inject(miraiCmsFieldErrorsKey, null)
  return computed(() => errors?.value[fieldKey()] ?? '')
}
