import {
  json,
  requirePlatformActor,
  type Env,
  type PlatformActor,
} from '../../_shared/auth'
import { getAgencyBucket, getClientBucket } from '../../_shared/buckets'
import { readApplications } from '../../_shared/applications'

async function actorCanAccessApplicantObject(
  env: Env,
  actor: PlatformActor,
  key: string,
  ownerId: string | undefined,
  orgIdMeta: string | undefined,
): Promise<boolean> {
  if (ownerId && ownerId === actor.uid) return true
  if (actor.role === 'admin') return true

  const parts = key.split('/')
  // applicants/{iso2}/{applicationId}/...
  const applicationId = parts[2]
  if (!applicationId) return false

  const apps = await readApplications(env)
  const app = apps.find((a) => a.id === applicationId)
  if (!app) {
    return Boolean(
      actor.role === 'agency' &&
        actor.orgId &&
        orgIdMeta &&
        actor.orgId === orgIdMeta,
    )
  }
  if (app.userId === actor.uid) return true
  if (actor.role === 'admin') return true
  // Exact org membership required — no role-only fallback.
  if (actor.role === 'agency' && actor.orgId && app.orgId && actor.orgId === app.orgId) {
    return true
  }
  return false
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)

    const url = new URL(context.request.url)
    const key = url.searchParams.get('key')?.trim()
    if (!key) {
      return json({ error: 'key is required' }, 400)
    }

    let object: R2ObjectBody | null = null
    if (key.startsWith('users/')) {
      if (!key.startsWith(`users/${actor.uid}/`)) {
        return json({ error: 'Forbidden' }, 403)
      }
      object = await getClientBucket(context.env).get(key)
    } else if (key.startsWith('applicants/')) {
      object = await getAgencyBucket(context.env).get(key)
      if (!object && context.env.CLIENT_DATA && context.env.AGENCY_LOGINS) {
        object = await context.env.CLIENT_DATA.get(key)
      }
      if (!object) return json({ error: 'Not found' }, 404)
      const allowed = await actorCanAccessApplicantObject(
        context.env,
        actor,
        key,
        object.customMetadata?.userId,
        object.customMetadata?.orgId,
      )
      if (!allowed) return json({ error: 'Forbidden' }, 403)
    } else {
      return json({ error: 'Forbidden' }, 403)
    }

    if (!object) {
      return json({ error: 'Not found' }, 404)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('Cache-Control', 'private, max-age=60')

    return new Response(object.body, { headers })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Download failed' }, 500)
  }
}
