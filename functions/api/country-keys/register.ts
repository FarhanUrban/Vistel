import { json, requirePlatformActor, type Env } from '../../_shared/auth'

/** Stores country public keys in R2 admin partition (no private keys). */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { uid } = await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }

    const body = (await context.request.json()) as {
      iso2?: string
      publicKeyJwk?: Record<string, unknown>
      orgId?: string
    }

    const iso2 = body.iso2?.trim().toUpperCase()
    if (!iso2 || !body.publicKeyJwk || !body.orgId) {
      return json({ error: 'iso2, publicKeyJwk, and orgId are required' }, 400)
    }

    const key = `admin/country-keys/${iso2}.json`
    await context.env.CLIENT_DATA.put(
      key,
      JSON.stringify({
        iso2,
        publicKeyJwk: body.publicKeyJwk,
        orgId: body.orgId,
        registeredByUid: uid,
        registeredAt: new Date().toISOString(),
      }),
      {
        httpMetadata: { contentType: 'application/json' },
      },
    )

    return json({ ok: true, key })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Register failed' }, 500)
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }

    const url = new URL(context.request.url)
    const iso2 = url.searchParams.get('iso2')?.trim().toUpperCase()
    if (!iso2) {
      return json({ error: 'iso2 is required' }, 400)
    }

    const object = await context.env.CLIENT_DATA.get(`admin/country-keys/${iso2}.json`)
    if (!object) {
      return json({ error: 'Not found' }, 404)
    }

    return json(await object.json())
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}
