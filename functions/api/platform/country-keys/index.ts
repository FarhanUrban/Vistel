import { json, type Env } from '../../../_shared/auth'
import { getAgencyBucket } from '../../../_shared/buckets'

/** Lists current agency public keys. Public — encrypt-only material. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const bucket = getAgencyBucket(context.env)
    const keys: unknown[] = []
    let cursor: string | undefined
    do {
      const listed = await bucket.list({
        prefix: 'admin/agency-keys/',
        cursor,
        limit: 1000,
      })
      for (const obj of listed.objects) {
        if (!obj.key.endsWith('/current.json')) continue
        const pointer = await bucket.get(obj.key)
        if (!pointer) continue
        const { keyId } = (await pointer.json()) as { keyId?: string }
        const [, , orgId, iso2] = obj.key.split('/')
        if (!orgId || !iso2 || !keyId) continue
        const file = await bucket.get(`admin/agency-keys/${orgId}/${iso2}/${keyId}.json`)
        if (!file) continue
        const data = (await file.json()) as {
          publicKeyJwk?: JsonWebKey
          registeredAt?: string
          current?: boolean
        }
        if (!data.current || !data.publicKeyJwk) continue
        keys.push({
          orgId,
          registeredByOrgId: orgId,
          iso2,
          keyId,
          publicKeyJwk: data.publicKeyJwk,
          registeredAt: data.registeredAt,
          live: Boolean(data.publicKeyJwk.n && data.publicKeyJwk.e),
        })
      }
      cursor = listed.truncated ? listed.cursor : undefined
    } while (cursor)
    return json({ keys })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}
