export function throttle<A extends unknown[], R>(
  fn: (...args: A) => R,
  delay: number
): (...args: A) => R {
  const state = { lastResult: null as R | null, lastCalledAt: null as number | null }
  return (...args: A) => {
    const now = Date.now()
    if (
      state.lastCalledAt === null ||
      now - state.lastCalledAt >= delay ||
      state.lastResult === null
    ) {
      state.lastCalledAt = now
      state.lastResult = fn(...args)
    }
    return state.lastResult
  }
}
