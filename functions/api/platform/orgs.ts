import { json, requirePlatformActor, type Env } from '../../_shared/auth'

const ORGS_KEY = 'admin/platform/orgs.json'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }
    const object = await context.env.CLIENT_DATA.get(ORGS_KEY)
    if (!object) return json({ orgs: [] })
    const data = (await object.json()) as { orgs?: unknown }
    return json({ orgs: Array.isArray(data.orgs) ? data.orgs : data })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }
    const body = (await context.request.json()) as { orgs?: unknown }
    if (!Array.isArray(body.orgs)) {
      return json({ error: 'orgs array is required' }, 400)
    }
    await context.env.CLIENT_DATA.put(ORGS_KEY, JSON.stringify({ orgs: body.orgs }), {
      httpMetadata: { contentType: 'application/json' },
    })
    return json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
