import { json, requirePlatformActor, type Env } from '../../_shared/auth'

/** Deletes a country public key from R2 (admin key reset). */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }
    const url = new URL(context.request.url)
    const iso2 = url.searchParams.get('iso2')?.trim().toUpperCase()
    if (!iso2) return json({ error: 'iso2 is required' }, 400)

    await context.env.CLIENT_DATA.delete(`admin/country-keys/${iso2}.json`)
    return json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Delete failed' }, 500)
  }
}
