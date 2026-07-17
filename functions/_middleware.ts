import type { Env, PlatformActor } from './_shared/auth'
import { enforceRateLimit, cleanupRateLimits } from './_shared/rateLimit'
import { touchAndResolveSession } from './_shared/sessions'

function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context
  const url = new URL(request.url)

  if (!url.pathname.startsWith('/api/')) {
    return next()
  }

  // Attach resolved D1 session for downstream handlers when present.
  let actor: PlatformActor | null = null
  try {
    actor = await touchAndResolveSession(request, env)
    if (actor) {
      context.data = { ...(context.data as object), sessionActor: actor }
    }
  } catch {
    // Session lookup failures should not block static API auth paths.
  }

  try {
    await enforceRateLimit(request, env, actor?.uid || `ip:${clientIp(request)}`)
  } catch (error) {
    if (error instanceof Response) return error
  }

  // Occasional cleanup (~1% of requests).
  if (Math.random() < 0.01) {
    void cleanupRateLimits(env)
  }

  return next()
}
