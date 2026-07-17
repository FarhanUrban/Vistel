import { json, requirePlatformActor, type Env } from '../../_shared/auth'
import { getAgencyBucket } from '../../_shared/buckets'

const APPS_KEY = 'admin/platform/applications.json'

interface StoredApp {
  id?: string
  userId?: string
  orgId?: string
  status?: string
  [key: string]: unknown
}

async function readApps(bucket: R2Bucket): Promise<StoredApp[]> {
  const object = await bucket.get(APPS_KEY)
  if (!object) return []
  const data = (await object.json()) as { applications?: StoredApp[] }
  return Array.isArray(data.applications) ? data.applications : []
}

function filterForActor(
  apps: StoredApp[],
  actor: { uid: string; role?: string; orgId?: string },
): StoredApp[] {
  if (actor.role === 'admin') return apps
  if (actor.role === 'agency') {
    // Agencies without a resolved orgId see nothing (prevents full dump).
    if (!actor.orgId) return []
    return apps.filter((app) => app.orgId === actor.orgId)
  }
  return apps.filter((app) => app.userId === actor.uid)
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    const bucket = getAgencyBucket(context.env)
    const apps = await readApps(bucket)
    return json({ applications: filterForActor(apps, actor) })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    // Agencies must use the decision endpoint for status transitions.
    if (actor.role === 'agency') {
      return json(
        { error: 'Agencies must use /api/applications/decision for status changes' },
        403,
      )
    }

    const bucket = getAgencyBucket(context.env)
    const body = (await context.request.json()) as { applications?: StoredApp[] }
    if (!Array.isArray(body.applications)) {
      return json({ error: 'applications array is required' }, 400)
    }

    const existing = await readApps(bucket)
    const byId = new Map<string, StoredApp>()
    for (const app of existing) {
      if (typeof app.id === 'string') byId.set(app.id, app)
    }

    for (const app of body.applications) {
      if (typeof app.id !== 'string') continue
      const previous = byId.get(app.id)
      if (actor.role === 'admin') {
        byId.set(app.id, app)
        continue
      }
      // Applicants may only upsert their own records and cannot self-approve.
      if (app.userId && app.userId !== actor.uid) continue
      if (previous && previous.userId && previous.userId !== actor.uid) continue
      const status = typeof app.status === 'string' ? app.status : 'submitted'
      if (status !== 'submitted' && status !== 'reviewing' && !previous) continue
      if (
        previous &&
        previous.status &&
        previous.status !== app.status &&
        app.status !== 'submitted'
      ) {
        // Preserve server-authoritative status transitions from decision endpoint.
        byId.set(app.id, { ...app, status: previous.status })
        continue
      }
      byId.set(app.id, { ...app, userId: actor.uid })
    }

    const applications = [...byId.values()]
    await bucket.put(APPS_KEY, JSON.stringify({ applications }), {
      httpMetadata: { contentType: 'application/json' },
    })
    return json({ ok: true, count: applications.length })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
