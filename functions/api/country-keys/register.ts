import { json, requirePlatformActor, type Env } from '../../_shared/auth'
import { getAgencyBucket } from '../../_shared/buckets'

function keyPrefix(orgId: string, iso2: string): string {
  return `admin/agency-keys/${orgId}/${iso2}`
}

function validPart(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value)
}

/** Registers an agency's initial keypair (public + escrowed private). */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { uid } = await requirePlatformActor(context.request, context.env)
    const bucket = getAgencyBucket(context.env)
    const body = (await context.request.json()) as {
      iso2?: string
      publicKeyJwk?: Record<string, unknown>
      privateKeyJwk?: Record<string, unknown>
      orgId?: string
      keyId?: string
    }
    const iso2 = body.iso2?.trim().toUpperCase()
    const orgId = body.orgId?.trim()
    const keyId = body.keyId?.trim()
    if (!iso2 || !orgId || !keyId || !body.publicKeyJwk || !body.privateKeyJwk) {
      return json(
        { error: 'orgId, iso2, keyId, publicKeyJwk, and privateKeyJwk are required' },
        400,
      )
    }
    if (!/^[A-Z]{2}$/.test(iso2) || !validPart(orgId) || !validPart(keyId)) {
      return json({ error: 'Invalid orgId, iso2, or keyId' }, 400)
    }
    if (body.privateKeyJwk.kty !== 'RSA' || !body.privateKeyJwk.d) {
      return json({ error: 'privateKeyJwk must be an RSA private key' }, 400)
    }

    const prefix = keyPrefix(orgId, iso2)
    if (await bucket.get(`${prefix}/current.json`)) {
      return json({ error: 'A current key already exists; use the rotation endpoint' }, 409)
    }
    const registeredAt = new Date().toISOString()
    const key = `${prefix}/${keyId}.json`
    await bucket.put(
      key,
      JSON.stringify({
        orgId,
        iso2,
        keyId,
        publicKeyJwk: body.publicKeyJwk,
        registeredByUid: uid,
        registeredAt,
        current: true,
      }),
      { httpMetadata: { contentType: 'application/json' } },
    )
    // Escrowed private key — never listed by the public country-keys endpoint.
    await bucket.put(
      `${prefix}/${keyId}.private.json`,
      JSON.stringify({
        orgId,
        iso2,
        keyId,
        privateKeyJwk: body.privateKeyJwk,
        registeredByUid: uid,
        registeredAt,
      }),
      { httpMetadata: { contentType: 'application/json' } },
    )
    // Initial registration does NOT start the 7-day rotation cooldown.
    await bucket.put(
      `${prefix}/current.json`,
      JSON.stringify({ keyId, registeredAt }),
      { httpMetadata: { contentType: 'application/json' } },
    )
    if (context.env.DB) {
      await context.env.DB.prepare(
        `INSERT INTO agency_key_meta (org_id, iso2, current_key_id, last_rotated_at)
         VALUES (?, ?, ?, NULL)
         ON CONFLICT(org_id, iso2) DO UPDATE SET current_key_id = excluded.current_key_id,
           last_rotated_at = NULL`,
      )
        .bind(orgId, iso2, keyId)
        .run()
    }
    return json({ ok: true, key, keyId })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Register failed' }, 500)
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    const bucket = getAgencyBucket(context.env)
    const url = new URL(context.request.url)
    const iso2 = url.searchParams.get('iso2')?.trim().toUpperCase()
    const orgId = url.searchParams.get('orgId')?.trim()
    if (!iso2 || !orgId) return json({ error: 'orgId and iso2 are required' }, 400)
    const prefix = keyPrefix(orgId, iso2)
    const pointer = await bucket.get(`${prefix}/current.json`)
    if (!pointer) return json({ error: 'Not found' }, 404)
    const { keyId } = (await pointer.json()) as { keyId?: string }
    const object = keyId ? await bucket.get(`${prefix}/${keyId}.json`) : null
    if (!object) return json({ error: 'Current key is missing' }, 404)
    return json(await object.json())
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}
