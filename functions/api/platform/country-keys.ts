import { json, type Env } from '../../_shared/auth'

/** Lists registered country public keys. Public — encrypt-only material. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }

    const listed = await context.env.CLIENT_DATA.list({ prefix: 'admin/country-keys/' })
    const keys: unknown[] = []
    for (const obj of listed.objects) {
      if (!obj.key.endsWith('.json')) continue
      const file = await context.env.CLIENT_DATA.get(obj.key)
      if (!file) continue
      const data = (await file.json()) as {
        iso2?: string
        publicKeyJwk?: JsonWebKey
        orgId?: string
        registeredAt?: string
      }
      if (!data.iso2 || !data.publicKeyJwk) continue
      keys.push({
        iso2: data.iso2,
        publicKeyJwk: data.publicKeyJwk,
        registeredByOrgId: data.orgId ?? '',
        registeredAt: data.registeredAt ?? new Date().toISOString(),
        live: Boolean(
          data.publicKeyJwk &&
            typeof data.publicKeyJwk === 'object' &&
            'n' in data.publicKeyJwk &&
            'e' in data.publicKeyJwk,
        ),
      })
    }
    return json({ keys })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}
