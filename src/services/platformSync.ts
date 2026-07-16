/**
 * R2 sync for platform config, applications, and encrypted envelopes.
 * Supports Firebase bearer tokens and portal (admin/agency) bridge tokens.
 */
import type {
  AgencyOrg,
  CountryKeyRegistryEntry,
  EncryptedEnvelope,
  RejectionReason,
  VisaApplication,
} from '@/types'
import type { PromoBannerConfig } from './promoBannerService'
import { getFirebaseAuth } from './api'
import { buildPortalAuthHeader, readPortalSession } from './portalToken'

export interface PartnerApplicationRecord {
  id: string
  companyName: string
  contactEmail: string
  estimatedVolume: string
  status: 'new' | 'contacted' | 'approved' | 'rejected'
  createdAt: string
  notes?: string
}

async function tryGetAuthHeader(): Promise<string | null> {
  try {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken()
      return `Bearer ${token}`
    }
  } catch {
    // Firebase may be unavailable for portal demo users.
  }

  const portal = readPortalSession()
  if (portal) return buildPortalAuthHeader(portal)
  return null
}

async function platformFetch(
  path: string,
  init?: RequestInit & { requireAuth?: boolean },
): Promise<Response | null> {
  const requireAuth = init?.requireAuth !== false
  const { requireAuth: _ignored, ...requestInit } = init ?? {}
  void _ignored
  const headers = new Headers(requestInit.headers)
  if (requireAuth) {
    const authHeader = await tryGetAuthHeader()
    if (!authHeader) return null
    headers.set('Authorization', authHeader)
  }
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 12000)
    const res = await fetch(path, {
      ...requestInit,
      headers,
      signal: controller.signal,
    })
    window.clearTimeout(timer)
    return res
  } catch (error) {
    console.warn('[platformFetch] failed', path, error)
    return null
  }
}

export async function syncOrgsToR2(orgs: AgencyOrg[]): Promise<boolean> {
  const res = await platformFetch('/api/platform/orgs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgs }),
  })
  return Boolean(res?.ok)
}

export async function fetchOrgsFromR2(): Promise<AgencyOrg[] | null> {
  const res = await platformFetch('/api/platform/orgs')
  if (!res?.ok) return null
  const data = (await res.json().catch(() => null)) as { orgs?: AgencyOrg[] } | null
  return Array.isArray(data?.orgs) ? data.orgs : null
}

export async function syncRejectionCodesToR2(codes: RejectionReason[]): Promise<boolean> {
  const res = await platformFetch('/api/platform/rejection-codes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codes }),
  })
  return Boolean(res?.ok)
}

export async function fetchRejectionCodesFromR2(): Promise<RejectionReason[] | null> {
  const res = await platformFetch('/api/platform/rejection-codes')
  if (!res?.ok) return null
  const data = (await res.json().catch(() => null)) as { codes?: RejectionReason[] } | null
  return Array.isArray(data?.codes) ? data.codes : null
}

export async function syncPromoBannerToR2(config: PromoBannerConfig): Promise<boolean> {
  const res = await platformFetch('/api/platform/promo-banner', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  })
  return Boolean(res?.ok)
}

export async function fetchPromoBannerFromR2(): Promise<PromoBannerConfig | null> {
  const res = await platformFetch('/api/platform/promo-banner', { requireAuth: false })
  if (!res?.ok) return null
  const data = (await res.json().catch(() => null)) as { config?: PromoBannerConfig | null } | null
  return data?.config ?? null
}

export async function fetchCountryKeysFromR2(): Promise<CountryKeyRegistryEntry[] | null> {
  // Public keys are world-readable so the landing page can unlock destinations.
  const res = await platformFetch('/api/platform/country-keys', { requireAuth: false })
  if (!res?.ok) return null
  const data = (await res.json().catch(() => null)) as {
    keys?: CountryKeyRegistryEntry[]
  } | null
  return Array.isArray(data?.keys) ? data.keys : null
}

export async function deleteCountryKeyFromR2(iso2: string): Promise<boolean> {
  const res = await platformFetch(
    `/api/platform/country-key-reset?iso2=${encodeURIComponent(iso2)}`,
    { method: 'DELETE' },
  )
  return Boolean(res?.ok)
}

export async function syncApplicationsToR2(applications: VisaApplication[]): Promise<boolean> {
  const res = await platformFetch('/api/platform/applications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applications }),
  })
  return Boolean(res?.ok)
}

export async function fetchApplicationsFromR2(): Promise<VisaApplication[] | null> {
  const res = await platformFetch('/api/platform/applications')
  if (!res?.ok) return null
  const data = (await res.json().catch(() => null)) as {
    applications?: VisaApplication[]
  } | null
  return Array.isArray(data?.applications) ? data.applications : null
}

export async function syncEnvelopeToR2(
  applicationId: string,
  envelope: EncryptedEnvelope,
): Promise<boolean> {
  const res = await platformFetch('/api/platform/envelopes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId, envelope }),
  })
  return Boolean(res?.ok)
}

export async function fetchEnvelopeFromR2(
  applicationId: string,
): Promise<EncryptedEnvelope | null> {
  const res = await platformFetch(
    `/api/platform/envelopes?applicationId=${encodeURIComponent(applicationId)}`,
  )
  if (!res?.ok) return null
  const data = (await res.json().catch(() => null)) as {
    envelope?: EncryptedEnvelope | null
  } | null
  return data?.envelope ?? null
}

export async function submitPartnerApplication(input: {
  companyName: string
  contactEmail: string
  estimatedVolume: string
}): Promise<PartnerApplicationRecord> {
  const res = await fetch('/api/platform/partner-applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => ({}))) as {
    application?: PartnerApplicationRecord
    error?: string
  }
  if (!res.ok || !data.application) {
    throw new Error(data.error || 'Failed to submit partnership application')
  }
  return data.application
}

export async function fetchPartnerApplicationsFromR2(): Promise<PartnerApplicationRecord[] | null> {
  const res = await platformFetch('/api/platform/partner-applications')
  if (!res?.ok) return null
  const data = (await res.json().catch(() => null)) as {
    applications?: PartnerApplicationRecord[]
  } | null
  return Array.isArray(data?.applications) ? data.applications : null
}

export async function syncPartnerApplicationsToR2(
  applications: PartnerApplicationRecord[],
): Promise<boolean> {
  const res = await platformFetch('/api/platform/partner-applications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applications }),
  })
  return Boolean(res?.ok)
}
