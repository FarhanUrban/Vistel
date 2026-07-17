import { json, requirePlatformActor, type Env } from '../../_shared/auth'
import { getAgencyBucket } from '../../_shared/buckets'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    const bucket = getAgencyBucket(context.env)
    const url = new URL(context.request.url)
    const applicationId = url.searchParams.get('applicationId')?.trim()
    if (!applicationId) {
      return json({ error: 'applicationId is required' }, 400)
    }
    const object = await bucket.get(
      `admin/envelopes/${applicationId}.json`,
    )
    if (!object) return json({ envelope: null })
    return json({ envelope: await object.json() })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    const bucket = getAgencyBucket(context.env)
    const body = (await context.request.json()) as {
      applicationId?: string
      envelope?: unknown
    }
    if (!body.applicationId || !body.envelope || typeof body.envelope !== 'object') {
      return json({ error: 'applicationId and envelope are required' }, 400)
    }
    await bucket.put(
      `admin/envelopes/${body.applicationId}.json`,
      JSON.stringify(body.envelope),
      { httpMetadata: { contentType: 'application/json' } },
    )
    return json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
