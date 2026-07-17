import { getAgencyBucket } from './buckets'
import type { Env } from './auth'

export const ORGS_KEY = 'admin/platform/orgs.json'

export interface StoredOrg {
  id: string
  name: string
  orgKind?: string
  countries?: string[]
  active?: boolean
  memberEmails?: string[]
  primaryMemberEmail?: string
  memberUids?: string[]
  invitePasswordHash?: string
  mustChangePassword?: boolean
  maxPendingApplications?: number
  [key: string]: unknown
}

export async function readOrgs(env: Env): Promise<StoredOrg[]> {
  const bucket = getAgencyBucket(env)
  const object = await bucket.get(ORGS_KEY)
  if (!object) return []
  const data = (await object.json()) as { orgs?: StoredOrg[] } | StoredOrg[]
  if (Array.isArray(data)) return data
  return Array.isArray(data.orgs) ? data.orgs : []
}

export async function writeOrgs(env: Env, orgs: StoredOrg[]): Promise<void> {
  const bucket = getAgencyBucket(env)
  await bucket.put(ORGS_KEY, JSON.stringify({ orgs }), {
    httpMetadata: { contentType: 'application/json' },
  })
}

export function findOrgByMemberEmail(orgs: StoredOrg[], email: string): StoredOrg | null {
  const normalized = email.trim().toLowerCase()
  return (
    orgs.find(
      (org) =>
        org.active !== false &&
        (org.primaryMemberEmail?.toLowerCase() === normalized ||
          org.memberEmails?.some((e) => e.toLowerCase() === normalized)),
    ) ?? null
  )
}

export function findActiveOrgById(orgs: StoredOrg[], orgId: string): StoredOrg | null {
  return orgs.find((org) => org.id === orgId && org.active !== false) ?? null
}

/** Pick an active org that covers the destination country (least pending preferred later). */
export function selectOrgForDestination(
  orgs: StoredOrg[],
  destinationIso2: string,
): StoredOrg | null {
  const iso2 = destinationIso2.toUpperCase()
  const candidates = orgs.filter(
    (org) =>
      org.active !== false &&
      (org.countries ?? []).map((c) => c.toUpperCase()).includes(iso2),
  )
  return candidates[0] ?? null
}

export function redactOrg(org: StoredOrg): Omit<StoredOrg, 'invitePasswordHash'> {
  const { invitePasswordHash: _hash, ...rest } = org
  void _hash
  return rest
}
