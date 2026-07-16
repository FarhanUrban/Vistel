import { json, requirePlatformActor, type Env } from '../../_shared/auth'

const APPS_KEY = 'admin/platform/applications.json'

interface StoredApp {
  id?: string
  [key: string]: unknown
}

async function readApps(bucket: R2Bucket): Promise<StoredApp[]> {
  const object = await bucket.get(APPS_KEY)
  if (!object) return []
  const data = (await object.json()) as { applications?: StoredApp[] }
  return Array.isArray(data.applications) ? data.applications : []
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }
    return json({ applications: await readApps(context.env.CLIENT_DATA) })
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
    const body = (await context.request.json()) as { applications?: StoredApp[] }
    if (!Array.isArray(body.applications)) {
      return json({ error: 'applications array is required' }, 400)
    }

    // Merge by id so concurrent clients don't wipe each other's submissions.
    const existing = await readApps(context.env.CLIENT_DATA)
    const byId = new Map<string, StoredApp>()
    for (const app of existing) {
      if (typeof app.id === 'string') byId.set(app.id, app)
    }
    for (const app of body.applications) {
      if (typeof app.id === 'string') byId.set(app.id, app)
    }
    const applications = [...byId.values()]

    await context.env.CLIENT_DATA.put(APPS_KEY, JSON.stringify({ applications }), {
      httpMetadata: { contentType: 'application/json' },
    })
    return json({ ok: true, count: applications.length })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
