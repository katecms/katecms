import { computed, onUnmounted, ref } from 'vue'

/** Client-side wait after the server reports `retryAfterMs` on a failed auth attempt. */
export function useAuthCooldown() {
  const cooldownUntil = ref(0)
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined
  let onUnlock: (() => void) | undefined

  const remainingMs = computed(() => Math.max(0, cooldownUntil.value - now.value))
  const remainingSec = computed(() => Math.ceil(remainingMs.value / 1000))
  const locked = computed(() => remainingMs.value > 0)

  function finish() {
    if (!timer) {
      return
    }
    clearInterval(timer)
    timer = undefined
    const done = onUnlock
    onUnlock = undefined
    done?.()
  }

  function tick() {
    now.value = Date.now()
    if (remainingMs.value <= 0) {
      finish()
    }
  }

  function start(retryAfterMs: number, unlock?: () => void) {
    if (retryAfterMs <= 0) {
      return
    }
    onUnlock = unlock
    cooldownUntil.value = Date.now() + retryAfterMs
    now.value = Date.now()
    if (!timer) {
      timer = setInterval(tick, 250)
    }
  }

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
  })

  return { remainingSec, locked, start }
}
