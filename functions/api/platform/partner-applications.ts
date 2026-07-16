import { json, requirePlatformActor, type Env } from '../../_shared/auth'

const PARTNER_KEY = 'admin/platform/partner-applications.json'

export interface PartnerApplication {
  id: string
  companyName: string
  contactEmail: string
  estimatedVolume: string
  status: 'new' | 'contacted' | 'approved' | 'rejected'
  createdAt: string
  notes?: string
}

async function readList(bucket: R2Bucket): Promise<PartnerApplication[]> {
  const object = await bucket.get(PARTNER_KEY)
  if (!object) return []
  const data = (await object.json()) as { applications?: PartnerApplication[] }
  return Array.isArray(data.applications) ? data.applications : []
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }
    return json({ applications: await readList(context.env.CLIENT_DATA) })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // Public partner signup — no auth required.
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }
    const body = (await context.request.json()) as {
      companyName?: string
      contactEmail?: string
      estimatedVolume?: string
    }
    const companyName = body.companyName?.trim()
    const contactEmail = body.contactEmail?.trim().toLowerCase()
    const estimatedVolume = body.estimatedVolume?.trim() || 'unspecified'
    if (!companyName || !contactEmail) {
      return json({ error: 'companyName and contactEmail are required' }, 400)
    }

    const applications = await readList(context.env.CLIENT_DATA)
    const entry: PartnerApplication = {
      id: `partner-${Date.now()}`,
      companyName,
      contactEmail,
      estimatedVolume,
      status: 'new',
      createdAt: new Date().toISOString(),
    }
    applications.unshift(entry)
    await context.env.CLIENT_DATA.put(
      PARTNER_KEY,
      JSON.stringify({ applications: applications.slice(0, 500) }),
      { httpMetadata: { contentType: 'application/json' } },
    )
    return json({ ok: true, application: entry })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    await requirePlatformActor(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }
    const body = (await context.request.json()) as { applications?: PartnerApplication[] }
    if (!Array.isArray(body.applications)) {
      return json({ error: 'applications array is required' }, 400)
    }
    await context.env.CLIENT_DATA.put(
      PARTNER_KEY,
      JSON.stringify({ applications: body.applications }),
      { httpMetadata: { contentType: 'application/json' } },
    )
    return json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
