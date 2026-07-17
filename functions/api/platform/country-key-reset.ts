import {
  json,
  requirePlatformActor,
  requireRole,
  type Env,
  type PlatformActor,
} from '../../_shared/auth'
import { getAgencyBucket } from '../../_shared/buckets'

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
const ORGS_KEY = 'admin/platform/orgs.json'

function prefix(orgId: string, iso2: string): string {
  return `admin/agency-keys/${orgId}/${iso2}`
}

function validPart(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value)
}

async function actorCanRotateOrg(
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
  return Boolean(org.memberUids?.includes(actor.uid))
}

async function deleteAllUnderPrefix(bucket: R2Bucket, keyPrefix: string): Promise<number> {
  let deleted = 0
  let cursor: string | undefined
  do {
    const listed = await bucket.list({ prefix: `${keyPrefix}/`, cursor, limit: 1000 })
    for (const object of listed.objects) {
      await bucket.delete(object.key)
      deleted += 1
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)
  return deleted
}

/** Rotates an agency keypair; private key is escrowed server-side. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    const bucket = getAgencyBucket(context.env)
    const body = (await context.request.json()) as {
      orgId?: string
      iso2?: string
      keyId?: string
      publicKeyJwk?: Record<string, unknown>
      privateKeyJwk?: Record<string, unknown>
      force?: boolean
    }
    const orgId = body.orgId?.trim()
    const iso2 = body.iso2?.trim().toUpperCase()
    const keyId = body.keyId?.trim()
    if (!orgId || !iso2 || !keyId || !body.publicKeyJwk || !body.privateKeyJwk) {
      return json(
        { error: 'orgId, iso2, keyId, publicKeyJwk, and privateKeyJwk are required' },
        400,
      )
    }
    if (!validPart(orgId) || !validPart(keyId) || !/^[A-Z]{2}$/.test(iso2)) {
      return json({ error: 'Invalid orgId, iso2, or keyId' }, 400)
    }
    if (body.privateKeyJwk.kty !== 'RSA' || !body.privateKeyJwk.d) {
      return json({ error: 'privateKeyJwk must be an RSA private key' }, 400)
    }
    if (!(await actorCanRotateOrg(actor, orgId, context.env))) {
      return json({ error: 'Forbidden for this organization' }, 403)
    }

    const keyPrefix = prefix(orgId, iso2)
    const pointerObject = await bucket.get(`${keyPrefix}/current.json`)
    const pointer = pointerObject
      ? await pointerObject.json<{ keyId?: string; lastRotatedAt?: string }>()
      : {}
    const meta = context.env.DB
      ? await context.env.DB.prepare(
          'SELECT last_rotated_at FROM agency_key_meta WHERE org_id = ? AND iso2 = ?',
        )
          .bind(orgId, iso2)
          .first<{ last_rotated_at: number | null }>()
      : null
    const lastRotatedAt =
      meta?.last_rotated_at ?? (pointer.lastRotatedAt ? Date.parse(pointer.lastRotatedAt) : NaN)
    const now = Date.now()
    const bypassCooldown = actor.role === 'admin' && body.force === true
    if (!bypassCooldown && Number.isFinite(lastRotatedAt) && now - lastRotatedAt < COOLDOWN_MS) {
      const retryAt = new Date(lastRotatedAt + COOLDOWN_MS).toISOString()
      return json({ error: 'Key rotation is on a 7-day cooldown', retryAt }, 429)
    }

    let cursor: string | undefined
    do {
      const listed = await bucket.list({ prefix: `${keyPrefix}/`, cursor, limit: 1000 })
      for (const object of listed.objects) {
        if (
          object.key === `${keyPrefix}/current.json` ||
          object.key.endsWith('.private.json') ||
          !object.key.endsWith('.json')
        ) {
          continue
        }
        const oldObject = await bucket.get(object.key)
        if (!oldObject) continue
        const oldData = (await oldObject.json()) as Record<string, unknown>
        if (oldData.current !== true) continue
        await bucket.put(object.key, JSON.stringify({ ...oldData, current: false }), {
          httpMetadata: { contentType: 'application/json' },
        })
      }
      cursor = listed.truncated ? listed.cursor : undefined
    } while (cursor)

    const registeredAt = new Date(now).toISOString()
    await bucket.put(
      `${keyPrefix}/${keyId}.json`,
      JSON.stringify({
        orgId,
        iso2,
        keyId,
        publicKeyJwk: body.publicKeyJwk,
        registeredAt,
        current: true,
      }),
      { httpMetadata: { contentType: 'application/json' } },
    )
    await bucket.put(
      `${keyPrefix}/${keyId}.private.json`,
      JSON.stringify({
        orgId,
        iso2,
        keyId,
        privateKeyJwk: body.privateKeyJwk,
        registeredAt,
      }),
      { httpMetadata: { contentType: 'application/json' } },
    )
    await bucket.put(
      `${keyPrefix}/current.json`,
      JSON.stringify({ keyId, lastRotatedAt: registeredAt }),
      { httpMetadata: { contentType: 'application/json' } },
    )
    if (context.env.DB) {
      await context.env.DB.prepare(
        `INSERT INTO agency_key_meta (org_id, iso2, current_key_id, last_rotated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(org_id, iso2) DO UPDATE SET current_key_id = excluded.current_key_id,
           last_rotated_at = excluded.last_rotated_at`,
      )
        .bind(orgId, iso2, keyId, now)
        .run()
    }
    return json({ ok: true, orgId, iso2, keyId, lastRotatedAt: registeredAt })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Rotation failed' }, 500)
  }
}

/** Admin-only: wipe all key material for an org/country so the agency can re-issue. */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    requireRole(actor, ['admin'])

    const url = new URL(context.request.url)
    const orgId = url.searchParams.get('orgId')?.trim()
    const iso2 = url.searchParams.get('iso2')?.trim().toUpperCase()
    if (!orgId || !iso2) {
      return json({ error: 'orgId and iso2 are required' }, 400)
    }
    if (!validPart(orgId) || !/^[A-Z]{2}$/.test(iso2)) {
      return json({ error: 'Invalid orgId or iso2' }, 400)
    }

    const bucket = getAgencyBucket(context.env)
    const keyPrefix = prefix(orgId, iso2)
    const deleted = await deleteAllUnderPrefix(bucket, keyPrefix)

    if (context.env.DB) {
      await context.env.DB.prepare('DELETE FROM agency_key_meta WHERE org_id = ? AND iso2 = ?')
        .bind(orgId, iso2)
        .run()
    }

    return json({ ok: true, orgId, iso2, deleted })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Reset failed' }, 500)
  }
}
