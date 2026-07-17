type RefreshFn = () => void | Promise<void>

const DEFAULT_INTERVAL_MS = 18_000

/**
 * Visible-tab poller with focus refresh. Dedupes overlapping refreshes and
 * skips ticks while a newer local mutation may still be in flight.
 */
export function startDashboardPoller(
  refresh: RefreshFn,
  options?: { intervalMs?: number },
): () => void {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS
  let timer: number | null = null
  let inFlight = false
  let generation = 0

  async function run(reason: 'interval' | 'focus' | 'visible') {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    if (inFlight) return
    inFlight = true
    const myGen = ++generation
    try {
      await refresh()
    } catch (error) {
      console.warn(`[dashboardPoller] refresh failed (${reason})`, error)
    } finally {
      // Only clear inFlight if we are still the latest generation starter.
      if (myGen === generation) inFlight = false
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') void run('visible')
  }

  function onFocus() {
    void run('focus')
  }

  timer = window.setInterval(() => void run('interval'), intervalMs)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', onFocus)

  // Immediate first refresh so mount + poller share one path.
  void run('visible')

  return () => {
    if (timer != null) window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onFocus)
  }
}
