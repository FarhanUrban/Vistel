import type {
  AdminAuditEntry,
  AgencyOrg,
  AgencyOrgStats,
  ApplicantNotification,
  CountryKeyRegistryEntry,
  EncryptedEnvelope,
  PaymentRecord,
  RejectionReason,
  VisaApplication,
} from '@/types'
import { ref } from 'vue'
import { DEFAULT_LIVE_COUNTRIES, DEFAULT_MAX_PENDING_APPLICATIONS } from './platformConfig'
import { PORTAL_DEMO_ACCOUNTS } from './portalAuth'
import { mockGetRejectionReasons } from './mocks/rejectionsMocks'
import type { PartnerApplicationRecord } from './platformSync'
import {
  fetchApplicationsFromR2,
  fetchCountryKeysFromR2,
  fetchEnvelopeFromR2,
  fetchOrgsFromR2,
  fetchPartnerApplicationsFromR2,
  fetchPromoBannerFromR2,
  fetchRejectionCodesFromR2,
  syncApplicationsToR2,
  syncEnvelopeToR2,
  syncOrgsToR2,
  syncPromoBannerToR2,
  syncRejectionCodesToR2,
} from './platformSync'

/** Bump so Vue UIs recompute destination availability after R2 hydrate/mutations. */
export const platformRevision = ref(0)

function bump(): void {
  platformRevision.value += 1
}

const memory = {
  orgs: [] as AgencyOrg[],
  countryKeys: [] as CountryKeyRegistryEntry[],
  notifications: [] as ApplicantNotification[],
  auditLog: [] as AdminAuditEntry[],
  submissionLog: [] as SubmissionLogEntry[],
  agencyVault: {} as AgencyKeyVault,
  encryptedPayloads: {} as Record<string, EncryptedEnvelope>,
  rejectionCodes: [] as RejectionReason[],
  paymentHistory: [] as PaymentRecord[],
  invitePasswords: {} as Record<string, string>,
  applications: [] as VisaApplication[],
  partnerApplications: [] as PartnerApplicationRecord[],
  promoBanner: null as unknown,
  seeded: false,
  hydrated: false,
}

export interface SubmissionLogEntry {
  userId: string
  applicationId: string
  submittedAt: string
}

export type AgencyKeyVault = Record<string, Record<string, JsonWebKey>>

export function emptyOrgStats(): AgencyOrgStats {
  return {
    submitted: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    awaitingPayment: 0,
    completed: 0,
  }
}

export function loadAgencyOrgs(): AgencyOrg[] {
  return memory.orgs
}

export async function saveAgencyOrgs(orgs: AgencyOrg[]): Promise<boolean> {
  memory.orgs = orgs
  bump()
  const ok = await syncOrgsToR2(orgs)
  return ok
}

export function loadCountryKeys(): CountryKeyRegistryEntry[] {
  return memory.countryKeys
}

export function saveCountryKeys(entries: CountryKeyRegistryEntry[]): void {
  memory.countryKeys = entries
  bump()
}

/** Merge public keys from R2 into memory and notify Vue. */
export function applyRemoteCountryKeys(remoteKeys: CountryKeyRegistryEntry[]): void {
  if (!remoteKeys.length) return
  const byIso = new Map(memory.countryKeys.map((k) => [k.iso2.toUpperCase(), k]))
  for (const remote of remoteKeys) {
    const iso = remote.iso2.toUpperCase()
    const existing = byIso.get(iso)
    byIso.set(iso, {
      ...existing,
      ...remote,
      iso2: iso,
      live: Boolean(remote.publicKeyJwk?.n && remote.publicKeyJwk?.e) || remote.live,
      publicKeyJwk: remote.publicKeyJwk?.n
        ? remote.publicKeyJwk
        : (existing?.publicKeyJwk ?? remote.publicKeyJwk),
    })
  }
  memory.countryKeys = [...byIso.values()]
  bump()
}

export function loadRejectionCodes(): RejectionReason[] {
  if (memory.rejectionCodes.length > 0) return memory.rejectionCodes
  const seeded = mockGetRejectionReasons()
  memory.rejectionCodes = seeded
  return seeded
}

export function saveRejectionCodes(codes: RejectionReason[]): void {
  memory.rejectionCodes = codes
  bump()
  void syncRejectionCodesToR2(codes)
}

export function loadPaymentHistory(userId?: string): PaymentRecord[] {
  if (!userId) return memory.paymentHistory
  return memory.paymentHistory.filter((p) => p.userId === userId)
}

export function appendPaymentRecord(record: PaymentRecord): void {
  memory.paymentHistory = [record, ...memory.paymentHistory].slice(0, 500)
  bump()
}

export function loadInvitePasswordHashes(): Record<string, string> {
  return memory.invitePasswords
}

export function setInvitePasswordHash(orgId: string, hash: string): void {
  memory.invitePasswords = { ...memory.invitePasswords, [orgId]: hash }
}

export function loadNotifications(): ApplicantNotification[] {
  return memory.notifications
}

export function saveNotifications(items: ApplicantNotification[]): void {
  memory.notifications = items
  bump()
}

export function loadAuditLog(): AdminAuditEntry[] {
  return memory.auditLog
}

export function appendAuditEntry(entry: Omit<AdminAuditEntry, 'id' | 'timestamp'>): void {
  memory.auditLog = [
    {
      ...entry,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
    },
    ...memory.auditLog,
  ].slice(0, 500)
}

export function loadSubmissionLog(): SubmissionLogEntry[] {
  return memory.submissionLog
}

export function appendSubmissionLog(entry: SubmissionLogEntry): void {
  memory.submissionLog = [...memory.submissionLog, entry].slice(-500)
}

export function loadAgencyKeyVault(): AgencyKeyVault {
  return memory.agencyVault
}

export function saveAgencyKeyVault(vault: AgencyKeyVault): void {
  memory.agencyVault = vault
}

export function getUserPrivateKey(userId: string, countryIso2: string): JsonWebKey | null {
  return memory.agencyVault[userId]?.[countryIso2.toUpperCase()] ?? null
}

export function setUserPrivateKey(userId: string, countryIso2: string, jwk: JsonWebKey): void {
  const vault = { ...memory.agencyVault }
  const uidVault = { ...(vault[userId] ?? {}) }
  uidVault[countryIso2.toUpperCase()] = jwk
  vault[userId] = uidVault
  memory.agencyVault = vault
}

export function clearAllPrivateKeysForCountry(countryIso2: string): void {
  const iso2 = countryIso2.toUpperCase()
  const vault = { ...memory.agencyVault }
  for (const uid of Object.keys(vault)) {
    if (vault[uid]?.[iso2]) {
      const next = { ...vault[uid] }
      delete next[iso2]
      vault[uid] = next
    }
  }
  memory.agencyVault = vault
}

export function clearPlatformDataForUser(userId: string): void {
  const vault = { ...memory.agencyVault }
  delete vault[userId]
  memory.agencyVault = vault
  memory.notifications = memory.notifications.filter((n) => n.userId !== userId)
  memory.submissionLog = memory.submissionLog.filter((e) => e.userId !== userId)
  bump()
}

export function loadApplicationsMemory(): VisaApplication[] {
  return memory.applications
}

export async function saveApplicationsMemory(apps: VisaApplication[]): Promise<boolean> {
  memory.applications = apps
  bump()
  return syncApplicationsToR2(apps)
}

export function loadPartnerApplications(): PartnerApplicationRecord[] {
  return memory.partnerApplications
}

export function savePartnerApplications(apps: PartnerApplicationRecord[]): void {
  memory.partnerApplications = apps
  bump()
}

export function ensurePlatformSeed(): void {
  if (memory.seeded) return

  if (memory.orgs.length === 0) {
    memory.orgs = [
      {
        id: 'org-demo-agency',
        name: 'Global Visa Agency',
        orgKind: 'travel',
        countries: [...DEFAULT_LIVE_COUNTRIES],
        memberUids: [PORTAL_DEMO_ACCOUNTS.agency.id],
        memberEmails: [...PORTAL_DEMO_ACCOUNTS.agency.emails],
        primaryMemberEmail: PORTAL_DEMO_ACCOUNTS.agency.emails[0],
        maxPendingApplications: DEFAULT_MAX_PENDING_APPLICATIONS,
        active: true,
        stats: emptyOrgStats(),
        createdAt: new Date().toISOString(),
      },
    ]
  }

  if (memory.countryKeys.length === 0) {
    memory.countryKeys = DEFAULT_LIVE_COUNTRIES.map((iso2) => ({
      iso2,
      publicKeyJwk: { kty: 'RSA' },
      registeredByOrgId: memory.orgs[0]?.id ?? 'org-demo-agency',
      registeredAt: new Date().toISOString(),
      live: false,
    }))
  }

  loadRejectionCodes()
  memory.seeded = true
  bump()
}

/**
 * Hydrate from R2. Country public keys are fetched without auth so the landing
 * page can unlock destinations before login.
 */
export async function hydratePlatformFromRemote(): Promise<void> {
  ensurePlatformSeed()

  try {
    // Public keys — no auth required.
    const remoteKeys = await fetchCountryKeysFromR2()
    if (remoteKeys && remoteKeys.length > 0) {
      applyRemoteCountryKeys(remoteKeys)
    }

    const remotePromo = await fetchPromoBannerFromR2()
    if (remotePromo) {
      memory.promoBanner = remotePromo
      bump()
    }

    // Authenticated platform documents (best-effort when session exists).
    const remoteOrgs = await fetchOrgsFromR2()
    if (remoteOrgs && remoteOrgs.length > 0) {
      memory.orgs = remoteOrgs
      bump()
    }

    const remoteCodes = await fetchRejectionCodesFromR2()
    if (remoteCodes && remoteCodes.length > 0) {
      memory.rejectionCodes = remoteCodes
      bump()
    }

    const remoteApps = await fetchApplicationsFromR2()
    if (remoteApps) {
      memory.applications = remoteApps
      bump()
    }

    const remotePartners = await fetchPartnerApplicationsFromR2()
    if (remotePartners) {
      memory.partnerApplications = remotePartners
      bump()
    }
  } catch (error) {
    console.error('[platform] hydrate failed', error)
  }

  memory.hydrated = true
  bump()
}

export function isPlatformHydrated(): boolean {
  return memory.hydrated
}

export function getCachedPromoBanner(): unknown {
  return memory.promoBanner
}

export function setCachedPromoBanner(config: unknown): void {
  memory.promoBanner = config
  bump()
}

export function wipePlatformLocalData(): void {
  memory.orgs = []
  memory.countryKeys = []
  memory.notifications = []
  memory.auditLog = []
  memory.submissionLog = []
  memory.agencyVault = {}
  memory.encryptedPayloads = {}
  memory.rejectionCodes = []
  memory.paymentHistory = []
  memory.invitePasswords = {}
  memory.applications = []
  memory.partnerApplications = []
  memory.promoBanner = null
  memory.seeded = false
  memory.hydrated = false
  bump()
}

export function saveEncryptedPayload(applicationId: string, envelope: EncryptedEnvelope): void {
  memory.encryptedPayloads[applicationId] = envelope
  void syncEnvelopeToR2(applicationId, envelope)
}

export function getEncryptedPayload(applicationId: string): EncryptedEnvelope | null {
  return memory.encryptedPayloads[applicationId] ?? null
}

export async function getEncryptedPayloadAsync(
  applicationId: string,
): Promise<EncryptedEnvelope | null> {
  const local = memory.encryptedPayloads[applicationId]
  if (local) return local
  const remote = await fetchEnvelopeFromR2(applicationId)
  if (remote) memory.encryptedPayloads[applicationId] = remote
  return remote
}

export function deleteEncryptedPayload(applicationId: string): void {
  delete memory.encryptedPayloads[applicationId]
}

export { syncPromoBannerToR2 }
