export function throttle<A extends unknown[], R>(
  fn: (...args: A) => R,
  delay: number
): (...args: A) => R {
  let lastResult: R | null = null
  let lastCalledAt: number | null = null
  return (...args: A) => {
    const now = Date.now()
    if (lastCalledAt === null || now - lastCalledAt >= delay || lastResult === null) {
      lastCalledAt = now
      lastResult = fn(...args)
    }
    return lastResult
  }
}
