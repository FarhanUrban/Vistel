import { json, requirePlatformActor, type Env, type PlatformActor } from '../../../_shared/auth'
import { getAgencyBucket } from '../../../_shared/buckets'

const ORGS_KEY = 'admin/platform/orgs.json'

function validPart(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value)
}

async function actorCanAccessOrgPrivateKey(
  actor: PlatformActor,
  orgId: string,
  env: Env,
): Promise<boolean> {
  if (actor.role === 'admin') return true
  if (actor.orgId && actor.orgId === orgId) return true

  const bucket = getAgencyBucket(env)
  const object = await bucket.get(ORGS_KEY)
  if (!object) return false
  const data = (await object.json()) as {
    orgs?: Array<{
      id?: string
      active?: boolean
      memberEmails?: string[]
      primaryMemberEmail?: string
      memberUids?: string[]
    }>
  }
  const orgs = Array.isArray(data.orgs) ? data.orgs : []
  const org = orgs.find((o) => o.id === orgId && o.active !== false)
  if (!org) return false

  const email = actor.email?.trim().toLowerCase()
  if (email) {
    if (org.primaryMemberEmail?.toLowerCase() === email) return true
    if (org.memberEmails?.some((e) => e.toLowerCase() === email)) return true
  }
  if (org.memberUids?.includes(actor.uid)) return true
  return false
}

/** Returns an escrowed private JWK for authorized admin or org members. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    const url = new URL(context.request.url)
    const orgId = url.searchParams.get('orgId')?.trim()
    const iso2 = url.searchParams.get('iso2')?.trim().toUpperCase()
    let keyId = url.searchParams.get('keyId')?.trim()

    if (!orgId || !iso2) {
      return json({ error: 'orgId and iso2 are required' }, 400)
    }
    if (!validPart(orgId) || !/^[A-Z]{2}$/.test(iso2)) {
      return json({ error: 'Invalid orgId or iso2' }, 400)
    }
    if (keyId && !validPart(keyId)) {
      return json({ error: 'Invalid keyId' }, 400)
    }

    if (!(await actorCanAccessOrgPrivateKey(actor, orgId, context.env))) {
      return json({ error: 'Forbidden' }, 403)
    }

    const bucket = getAgencyBucket(context.env)
    const prefix = `admin/agency-keys/${orgId}/${iso2}`

    if (!keyId) {
      const pointer = await bucket.get(`${prefix}/current.json`)
      if (!pointer) return json({ error: 'No current key for this destination' }, 404)
      const parsed = (await pointer.json()) as { keyId?: string }
      keyId = parsed.keyId
    }
    if (!keyId) return json({ error: 'keyId not found' }, 404)

    const privateObject = await bucket.get(`${prefix}/${keyId}.private.json`)
    if (!privateObject) {
      return json({ error: 'Escrowed private key not found' }, 404)
    }
    const data = (await privateObject.json()) as {
      privateKeyJwk?: JsonWebKey
      keyId?: string
      orgId?: string
      iso2?: string
    }
    if (!data.privateKeyJwk?.d) {
      return json({ error: 'Escrowed private key is invalid' }, 500)
    }
    return json({
      orgId,
      iso2,
      keyId,
      privateKeyJwk: data.privateKeyJwk,
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}
