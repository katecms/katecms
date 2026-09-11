import { computed, inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'

export const miraiCmsFieldErrorsKey: InjectionKey<Ref<Record<string, string>>> = Symbol('miraicmsFieldErrors')

export function provideMiraiCmsFieldErrors(errors: Ref<Record<string, string>>): void {
  provide(miraiCmsFieldErrorsKey, errors)
}

export function useMiraiCmsFieldError(fieldKey: () => string): ComputedRef<string> {
  const errors = inject(miraiCmsFieldErrorsKey, null)
  return computed(() => errors?.value[fieldKey()] ?? '')
}
