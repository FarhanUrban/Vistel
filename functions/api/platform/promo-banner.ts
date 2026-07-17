import { json, requirePlatformActor, type Env } from '../../_shared/auth'
import { getAgencyBucket } from '../../_shared/buckets'

const PROMO_KEY = 'admin/platform/promo-banner.json'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // Promo is public-readable for the landing page; auth optional.
    const bucket = getAgencyBucket(context.env)
    const object = await bucket.get(PROMO_KEY)
    if (!object) return json({ config: null })
    return json({ config: await object.json() })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    const bucket = getAgencyBucket(context.env)
    const body = (await context.request.json()) as { config?: unknown }
    if (!body.config || typeof body.config !== 'object') {
      return json({ error: 'config object is required' }, 400)
    }
    await bucket.put(PROMO_KEY, JSON.stringify(body.config), {
      httpMetadata: { contentType: 'application/json' },
    })
    return json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
