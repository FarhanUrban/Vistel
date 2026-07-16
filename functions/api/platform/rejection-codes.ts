import { json, requirePlatformActor, type Env } from '../../_shared/auth'

const CODES_KEY = 'admin/platform/rejection-codes.json'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }
    const object = await context.env.CLIENT_DATA.get(CODES_KEY)
    if (!object) return json({ codes: [] })
    const data = (await object.json()) as { codes?: unknown }
    return json({ codes: Array.isArray(data.codes) ? data.codes : data })
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
    const body = (await context.request.json()) as { codes?: unknown }
    if (!Array.isArray(body.codes)) {
      return json({ error: 'codes array is required' }, 400)
    }
    await context.env.CLIENT_DATA.put(CODES_KEY, JSON.stringify({ codes: body.codes }), {
      httpMetadata: { contentType: 'application/json' },
    })
    return json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
