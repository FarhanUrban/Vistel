import type {
  AgencyOrg,
  AgencyOrgKind,
  AgencyOrgStats,
  CountryKeyRegistryEntry,
  User,
  VisaApplication,
} from '@/types'
import { generateCountryKeyPair, downloadPrivateKeyFile } from './countryCrypto'
import { DEFAULT_MAX_PENDING_APPLICATIONS } from './platformConfig'
import {
  appendAuditEntry,
  clearAllPrivateKeysForCountry,
  emptyOrgStats,
  ensurePlatformSeed,
  getUserPrivateKey,
  loadAgencyOrgs,
  loadCountryKeys,
  saveAgencyOrgs,
  saveCountryKeys,
  setInvitePasswordHash,
  setUserPrivateKey,
} from './platformStorage'
import { deleteCountryKeyFromR2 } from './platformSync'
import { PORTAL_DEMO_ACCOUNTS } from './portalAuth'
import { getEveryLocalApplication } from './localDocumentStorage'

ensurePlatformSeed()

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password)
  return computed === hash
}

export function getAgencyOrg(orgId: string): AgencyOrg | null {
  return loadAgencyOrgs().find((o) => o.id === orgId) ?? null
}

export function listAgencyOrgs(): AgencyOrg[] {
  return loadAgencyOrgs()
}

export function resolveOrgForUser(user: User): AgencyOrg | null {
  if (user.orgId) {
    const org = getAgencyOrg(user.orgId)
    if (org?.active) return org
  }
  const email = user.email.trim().toLowerCase()
  return (
    loadAgencyOrgs().find(
      (org) =>
        org.active &&
        (org.memberUids.includes(user.id) ||
          org.memberEmails.some((e) => e.toLowerCase() === email) ||
          org.primaryMemberEmail?.toLowerCase() === email),
    ) ?? null
  )
}

export function findOrgByMemberEmail(email: string): AgencyOrg | null {
  const normalized = email.trim().toLowerCase()
  return (
    loadAgencyOrgs().find(
      (org) =>
        org.active &&
        (org.primaryMemberEmail?.toLowerCase() === normalized ||
          org.memberEmails.some((e) => e.toLowerCase() === normalized)),
    ) ?? null
  )
}

export function attachUserToOrg(user: User): User {
  if (user.role === 'admin') return user
  const org = resolveOrgForUser(user)
  if (!org) return user
  if (!org.memberUids.includes(user.id)) {
    org.memberUids = [...org.memberUids, user.id]
    void saveAgencyOrgs(loadAgencyOrgs().map((o) => (o.id === org.id ? org : o)))
  }
  return {
    ...user,
    role: 'agency',
    orgId: org.id,
    orgKind: org.orgKind,
    mustChangePassword: org.mustChangePassword ?? user.mustChangePassword,
  }
}

export async function createAgencyOrg(input: {
  name: string
  orgKind: AgencyOrgKind
  countries: string[]
  memberEmails: string[]
  primaryMemberEmail: string
  invitePassword: string
  maxPendingApplications?: number
  actorUid: string
}): Promise<AgencyOrg> {
  const primary = input.primaryMemberEmail.trim().toLowerCase()
  if (!primary) throw new Error('Primary member email is required')
  if (!input.invitePassword || input.invitePassword.length < 8) {
    throw new Error('Temporary password must be at least 8 characters')
  }

  const invitePasswordHash = await hashPassword(input.invitePassword)
  const emails = [
    ...new Set([
      primary,
      ...input.memberEmails.map((e) => e.trim().toLowerCase()).filter(Boolean),
    ]),
  ]

  const org: AgencyOrg = {
    id: `org-${Date.now()}`,
    name: input.name,
    orgKind: input.orgKind,
    countries: input.countries.map((c) => c.toUpperCase()),
    memberUids: [],
    memberEmails: emails,
    primaryMemberEmail: primary,
    invitePasswordHash,
    mustChangePassword: true,
    maxPendingApplications: input.maxPendingApplications ?? DEFAULT_MAX_PENDING_APPLICATIONS,
    active: true,
    stats: emptyOrgStats(),
    createdAt: new Date().toISOString(),
  }
  const orgs = [...loadAgencyOrgs(), org]
  setInvitePasswordHash(org.id, invitePasswordHash)

  // Register countries as assigned but not live until encryption is set up.
  const keys = loadCountryKeys()
  for (const iso2 of org.countries) {
    if (!keys.some((k) => k.iso2 === iso2)) {
      keys.push({
        iso2,
        publicKeyJwk: { kty: 'RSA' },
        registeredByOrgId: org.id,
        registeredAt: new Date().toISOString(),
        live: false,
      })
    }
  }
  saveCountryKeys(keys)

  const synced = await saveAgencyOrgs(orgs)
  if (!synced) {
    throw new Error(
      'Organization saved in this session but failed to write to cloud storage (R2). Check you are logged in as admin and try again.',
    )
  }

  appendAuditEntry({
    actorUid: input.actorUid,
    orgId: org.id,
    action: 'org_created',
  })

  return org
}

export async function updateAgencyOrg(
  orgId: string,
  patch: Partial<
    Pick<
      AgencyOrg,
      | 'name'
      | 'orgKind'
      | 'countries'
      | 'memberEmails'
      | 'active'
      | 'maxPendingApplications'
      | 'primaryMemberEmail'
      | 'mustChangePassword'
      | 'invitePasswordHash'
    >
  >,
  actorUid: string,
): Promise<AgencyOrg> {
  const orgs = [...loadAgencyOrgs()]
  const index = orgs.findIndex((o) => o.id === orgId)
  if (index === -1) throw new Error('Agency organization not found')
  const updated: AgencyOrg = {
    ...orgs[index],
    ...patch,
    countries: patch.countries?.map((c) => c.toUpperCase()) ?? orgs[index].countries,
    memberEmails:
      patch.memberEmails?.map((e) => e.trim().toLowerCase()) ?? orgs[index].memberEmails,
    primaryMemberEmail: patch.primaryMemberEmail
      ? patch.primaryMemberEmail.trim().toLowerCase()
      : orgs[index].primaryMemberEmail,
  }
  orgs[index] = updated

  if (patch.countries) {
    const keys = loadCountryKeys()
    for (const iso2 of updated.countries) {
      if (!keys.some((k) => k.iso2 === iso2)) {
        keys.push({
          iso2,
          publicKeyJwk: { kty: 'RSA' },
          registeredByOrgId: orgId,
          registeredAt: new Date().toISOString(),
          live: false,
        })
      }
    }
    saveCountryKeys(keys)
  }

  const synced = await saveAgencyOrgs(orgs)
  if (!synced) {
    throw new Error('Failed to save organization changes to cloud storage (R2).')
  }

  appendAuditEntry({ actorUid, orgId, action: 'org_updated' })
  return updated
}

export async function setOrgInvitePassword(
  orgId: string,
  password: string,
  actorUid: string,
): Promise<void> {
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  const hash = await hashPassword(password)
  await updateAgencyOrg(orgId, { invitePasswordHash: hash, mustChangePassword: true }, actorUid)
  setInvitePasswordHash(orgId, hash)
}

export async function clearMustChangePassword(orgId: string, newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword)
  const orgs = [...loadAgencyOrgs()]
  const idx = orgs.findIndex((o) => o.id === orgId)
  if (idx < 0) throw new Error('Organization not found')
  orgs[idx] = {
    ...orgs[idx],
    invitePasswordHash: hash,
    mustChangePassword: false,
  }
  const synced = await saveAgencyOrgs(orgs)
  if (!synced) throw new Error('Failed to save password change to cloud storage (R2).')
  setInvitePasswordHash(orgId, hash)
}

export function getCountryKeyEntry(iso2: string): CountryKeyRegistryEntry | null {
  const upper = iso2.toUpperCase()
  return (
    loadCountryKeys().find((k) => k.iso2 === upper && Boolean(k.publicKeyJwk?.n)) ??
    loadCountryKeys().find((k) => k.iso2 === upper) ??
    null
  )
}

/** Prefer the assigned agency's current/live public key for encryption. */
export function getOrgCountryKeyEntry(
  orgId: string,
  iso2: string,
): CountryKeyRegistryEntry | null {
  const upper = iso2.toUpperCase()
  const matches = loadCountryKeys().filter(
    (k) =>
      k.iso2 === upper &&
      (k.orgId === orgId || k.registeredByOrgId === orgId) &&
      Boolean(k.publicKeyJwk?.n),
  )
  return matches.find((k) => k.live !== false) ?? matches[0] ?? null
}

async function getAuthHeader(): Promise<string | null> {
  try {
    const { getFirebaseAuth } = await import('./api')
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (token) return `Bearer ${token}`
  } catch {
    // portal
  }
  const { buildPortalAuthHeader, readPortalSession } = await import('./portalToken')
  const { useAuthStore } = await import('@/features/auth/store')
  const user = useAuthStore().user ?? readPortalSession()
  if (user) return buildPortalAuthHeader(user)
  return null
}

/**
 * Fetch an escrowed private key for an org/destination (version-aware via keyId).
 * Caches in the in-memory agency vault for the current session.
 */
export async function getEscrowedPrivateKey(
  userId: string,
  orgId: string,
  countryIso2: string,
  keyId?: string,
): Promise<JsonWebKey> {
  const iso2 = countryIso2.toUpperCase()
  const cached = getUserPrivateKey(userId, iso2, keyId)
  if (cached?.d) return cached

  const authHeader = await getAuthHeader()
  if (!authHeader) throw new Error('You must be signed in to decrypt applications')

  const params = new URLSearchParams({ orgId, iso2 })
  if (keyId) params.set('keyId', keyId)
  const response = await fetch(`/api/platform/country-keys/private?${params.toString()}`, {
    credentials: 'include',
    headers: { Authorization: authHeader },
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    privateKeyJwk?: JsonWebKey
    keyId?: string
  }
  if (!response.ok || !payload.privateKeyJwk?.d) {
    throw new Error(payload.error || 'Could not load escrowed decryption key')
  }
  setUserPrivateKey(userId, iso2, payload.privateKeyJwk, payload.keyId ?? keyId)
  return payload.privateKeyJwk
}

export function isCountryLive(iso2: string): boolean {
  return hasActiveAgencyForDestination(iso2)
}

export function isCountryKeyReady(iso2: string): boolean {
  // Legacy helper — destinations no longer require encryption keys.
  return hasActiveAgencyForDestination(iso2)
}

/** Destination is selectable when an active agency covers it. */
export function hasActiveAgencyForDestination(iso2: string): boolean {
  const upper = iso2.toUpperCase()
  return loadAgencyOrgs().some(
    (org) => org.active && org.countries.map((c) => c.toUpperCase()).includes(upper),
  )
}

export function isDestinationAvailable(iso2: string): boolean {
  return hasActiveAgencyForDestination(iso2)
}

export function getDestinationAvailability(
  iso2: string,
): 'available' | 'onboarding' | 'coming_soon' {
  if (hasActiveAgencyForDestination(iso2)) return 'available'
  const entry = getCountryKeyEntry(iso2)
  if (entry?.registeredByOrgId || entry) return 'onboarding'
  return 'coming_soon'
}

export function listLiveCountries(): string[] {
  return listAvailableDestinations()
}

export function listAvailableDestinations(): string[] {
  const set = new Set<string>()
  for (const org of loadAgencyOrgs()) {
    if (!org.active) continue
    for (const c of org.countries) set.add(c.toUpperCase())
  }
  return [...set]
}

export async function setupCountryKeyForAgency(
  userId: string,
  orgId: string,
  countryIso2: string,
  options?: { downloadBackup?: boolean },
): Promise<{ publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey; keyId: string }> {
  const iso2 = countryIso2.toUpperCase()
  const org = getAgencyOrg(orgId)
  if (!org || !org.countries.includes(iso2)) {
    throw new Error('Your organization is not assigned to this country')
  }

  const existing = getOrgCountryKeyEntry(orgId, iso2)
  if (existing?.publicKeyJwk?.n) {
    try {
      const escrowed = await getEscrowedPrivateKey(userId, orgId, iso2, existing.keyId)
      return {
        publicKeyJwk: existing.publicKeyJwk,
        privateKeyJwk: escrowed,
        keyId: existing.keyId ?? 'current',
      }
    } catch {
      throw new Error(
        'A key already exists for this destination. Use Rotate (max once every 7 days) or ask an admin to reset it.',
      )
    }
  }

  const keyId = crypto.randomUUID()
  const { publicKeyJwk, privateKeyJwk } = await generateCountryKeyPair()
  const keys = loadCountryKeys().filter(
    (k) => !(k.iso2 === iso2 && (k.orgId === orgId || k.registeredByOrgId === orgId)),
  )
  const entry: CountryKeyRegistryEntry = {
    iso2,
    publicKeyJwk,
    registeredByOrgId: orgId,
    orgId,
    keyId,
    registeredAt: new Date().toISOString(),
    live: true,
  }
  keys.push(entry)
  saveCountryKeys(keys)
  setUserPrivateKey(userId, iso2, privateKeyJwk, keyId)

  const { registerCountryPublicKey } = await import('./r2Storage')
  await registerCountryPublicKey(iso2, publicKeyJwk, orgId, keyId, privateKeyJwk)

  if (options?.downloadBackup) {
    downloadPrivateKeyFile(iso2, privateKeyJwk, { orgId, keyId })
  }

  appendAuditEntry({
    actorUid: userId,
    orgId,
    action: 'country_key_setup',
  })

  return { publicKeyJwk, privateKeyJwk, keyId }
}

/**
 * Rotates a keypair, escrows the private key server-side (7-day cooldown enforced).
 */
export async function rotateAgencyCountryKey(
  userId: string,
  orgId: string,
  countryIso2: string,
  options?: { downloadBackup?: boolean; force?: boolean },
): Promise<{ keyId: string; retryAt?: string }> {
  const iso2 = countryIso2.toUpperCase()
  const org = getAgencyOrg(orgId)
  if (!org || !org.countries.includes(iso2)) {
    throw new Error('Your organization is not assigned to this country')
  }

  const keyId = crypto.randomUUID()
  const { publicKeyJwk, privateKeyJwk } = await generateCountryKeyPair()

  const authHeader = await getAuthHeader()
  if (!authHeader) throw new Error('You must be signed in to rotate keys')

  const response = await fetch('/api/platform/country-key-reset', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orgId,
      iso2,
      keyId,
      publicKeyJwk,
      privateKeyJwk,
      force: options?.force === true,
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    retryAt?: string
    keyId?: string
  }
  if (!response.ok) {
    if (response.status === 429 && payload.retryAt) {
      throw new Error(
        `Key rotation is limited to once every 7 days. Try again after ${payload.retryAt}.`,
      )
    }
    throw new Error(payload.error || 'Key rotation failed')
  }

  const keys = loadCountryKeys().filter(
    (k) =>
      !(
        k.iso2 === iso2 &&
        (k.orgId === orgId || k.registeredByOrgId === orgId) &&
        k.keyId === keyId
      ),
  )
  // Keep prior versions in memory for decrypt; mark this org's previous current as non-live.
  const next = keys.map((k) =>
    k.iso2 === iso2 && (k.orgId === orgId || k.registeredByOrgId === orgId)
      ? { ...k, live: false }
      : k,
  )
  next.push({
    iso2,
    publicKeyJwk,
    registeredByOrgId: orgId,
    orgId,
    keyId,
    registeredAt: new Date().toISOString(),
    lastRotatedAt: new Date().toISOString(),
    live: true,
  })
  saveCountryKeys(next)
  setUserPrivateKey(userId, iso2, privateKeyJwk, keyId)

  if (options?.downloadBackup) {
    downloadPrivateKeyFile(iso2, privateKeyJwk, { orgId, keyId })
  }

  appendAuditEntry({
    actorUid: userId,
    orgId,
    action: 'agency_key_rotate',
  })

  return { keyId }
}

export async function importCountryPrivateKey(
  userId: string,
  countryIso2: string,
  privateKeyJwk: JsonWebKey,
  orgId?: string,
): Promise<void> {
  const iso2 = countryIso2.toUpperCase()
  const { validatePrivateKeyJwk } = await import('./countryCrypto')
  const publicEntry = orgId
    ? getOrgCountryKeyEntry(orgId, iso2)
    : getCountryKeyEntry(iso2)
  const clean = await validatePrivateKeyJwk(privateKeyJwk, publicEntry?.publicKeyJwk)
  setUserPrivateKey(userId, iso2, clean)
}

export async function resetCountryEncryption(
  iso2: string,
  actorUid: string,
  options?: { force?: boolean; orgId?: string },
): Promise<{ pendingCount: number }> {
  const country = iso2.toUpperCase()
  const orgId =
    options?.orgId ??
    loadCountryKeys().find((k) => k.iso2 === country && (k.orgId || k.registeredByOrgId))
      ?.orgId ??
    loadCountryKeys().find((k) => k.iso2 === country)?.registeredByOrgId

  if (!orgId) {
    throw new Error('No organization is associated with this destination key')
  }

  const apps = getEveryLocalApplication().filter(
    (a) =>
      a.destinationCountry.toUpperCase() === country &&
      (a.status === 'submitted' || a.status === 'reviewing') &&
      (!a.orgId || a.orgId === orgId),
  )
  if (apps.length > 0 && !options?.force) {
    return { pendingCount: apps.length }
  }

  const ok = await deleteCountryKeyFromR2(orgId, country)
  if (!ok) {
    throw new Error('Failed to reset encryption keys in cloud storage')
  }

  const keys = loadCountryKeys().filter(
    (k) =>
      !(
        k.iso2 === country &&
        (k.orgId === orgId || k.registeredByOrgId === orgId)
      ),
  )
  keys.push({
    iso2: country,
    publicKeyJwk: { kty: 'RSA' },
    registeredByOrgId: orgId,
    orgId,
    registeredAt: new Date().toISOString(),
    live: false,
  })
  saveCountryKeys(keys)
  clearAllPrivateKeysForCountry(country)

  appendAuditEntry({
    actorUid,
    orgId,
    action: 'country_key_reset',
  })

  return { pendingCount: apps.length }
}

/**
 * Assign an org for a destination: prefer orgs covering that country with available capacity,
 * ordered by current pending load (least loaded first).
 */
export function assignOrgForDestination(destinationIso2: string): string | null {
  const iso2 = destinationIso2.toUpperCase()
  const candidates = loadAgencyOrgs().filter(
    (org) => org.active && org.countries.map((c) => c.toUpperCase()).includes(iso2),
  )
  if (candidates.length === 0) return null

  const scored = candidates
    .map((org) => {
      const pending = getApplicationsForOrg(org).filter(
        (a) => a.status === 'submitted' || a.status === 'reviewing',
      ).length
      const cap = org.maxPendingApplications ?? DEFAULT_MAX_PENDING_APPLICATIONS
      return { org, pending, cap, hasRoom: pending < cap }
    })
    .sort((a, b) => a.pending - b.pending)

  const withRoom = scored.find((s) => s.hasRoom)
  if (withRoom) return withRoom.org.id
  // All full — still assign to least-loaded (overflow) so applications aren't stranded.
  return scored[0]?.org.id ?? null
}

export function getApplicationsForOrg(org: AgencyOrg): VisaApplication[] {
  const countries = new Set(org.countries.map((c) => c.toUpperCase()))
  return getEveryLocalApplication().filter((app) => {
    const dest = app.destinationCountry.toUpperCase()
    if (!countries.has(dest)) return false
    // Prefer explicit org assignment; legacy apps without orgId stay visible to matching orgs.
    if (app.orgId) return app.orgId === org.id
    return true
  })
}

export function recomputeOrgStats(orgId: string): AgencyOrgStats {
  const org = getAgencyOrg(orgId)
  if (!org) return emptyOrgStats()
  const apps = getApplicationsForOrg(org)
  const stats = emptyOrgStats()
  stats.submitted = apps.length
  for (const app of apps) {
    if (app.status === 'submitted' || app.status === 'reviewing') stats.pending += 1
    else if (app.status === 'awaiting_payment') {
      stats.awaitingPayment += 1
      stats.approved += 1
    } else if (app.status === 'completed') stats.completed += 1
    else if (app.status === 'rejected') stats.rejected += 1
  }
  return stats
}

export function syncOrgStats(orgId: string): AgencyOrgStats {
  const stats = recomputeOrgStats(orgId)
  const orgs = [...loadAgencyOrgs()]
  const idx = orgs.findIndex((o) => o.id === orgId)
  if (idx >= 0) {
    orgs[idx] = { ...orgs[idx], stats }
    void saveAgencyOrgs(orgs)
  }
  return stats
}

export function getAdminAggregateStats(): {
  orgCount: number
  activeOrgs: number
  pendingByCountry: Record<string, number>
  submissionsToday: number
} {
  const orgs = loadAgencyOrgs()
  const apps = getEveryLocalApplication()
  const today = new Date().toISOString().slice(0, 10)
  const pendingByCountry: Record<string, number> = {}
  for (const app of apps) {
    if (app.status === 'submitted' || app.status === 'reviewing') {
      const c = app.destinationCountry.toUpperCase()
      pendingByCountry[c] = (pendingByCountry[c] ?? 0) + 1
    }
  }
  return {
    orgCount: orgs.length,
    activeOrgs: orgs.filter((o) => o.active).length,
    pendingByCountry,
    submissionsToday: apps.filter((a) => a.submittedAt.startsWith(today)).length,
  }
}

export function isAdminUser(user: User | null): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return (PORTAL_DEMO_ACCOUNTS.admin.emails as readonly string[]).includes(
    user.email.trim().toLowerCase(),
  )
}

export function countPendingForCountry(iso2: string): number {
  const country = iso2.toUpperCase()
  return getEveryLocalApplication().filter(
    (a) =>
      a.destinationCountry.toUpperCase() === country &&
      (a.status === 'submitted' || a.status === 'reviewing'),
  ).length
}
