<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { useRejectionsStore } from '@/features/admin-rejections/store'
import {
  countPendingForCountry,
  createAgencyOrg,
  getAdminAggregateStats,
  isAdminUser,
  listAgencyOrgs,
  updateAgencyOrg,
} from '@/services/agencyOrgService'
import {
  hydratePlatformFromRemote,
  loadAuditLog,
  loadPartnerApplications,
  savePartnerApplications,
} from '@/services/platformStorage'
import {
  fetchPartnerApplicationsFromR2,
  syncPartnerApplicationsToR2,
  type PartnerApplicationRecord,
} from '@/services/platformSync'
import {
  getPromoBannerConfig,
  savePromoBannerConfig,
  type PromoBannerConfig,
} from '@/services/promoBannerService'
import { getCountryName, iso2ToFlag, getAllCountries } from '@/services/visaIndexService'
import { DEFAULT_LIVE_COUNTRIES, DEFAULT_MAX_PENDING_APPLICATIONS } from '@/services/platformConfig'
import { getEveryLocalApplication } from '@/services/localDocumentStorage'
import type { AgencyOrg, AgencyOrgKind } from '@/types'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import { SUPPORT_GMAIL_COMPOSE } from '@/services/contactConfig'
import { startDashboardPoller } from '@/services/dashboardPoller'

const router = useRouter()
const authStore = useAuthStore()
const rejectionsStore = useRejectionsStore()

const orgs = ref<AgencyOrg[]>([])
const partnerApps = ref<PartnerApplicationRecord[]>([])
const stats = ref(getAdminAggregateStats())
const auditLog = ref(loadAuditLog())
const showCreateModal = ref(false)
const showPolicyModal = ref(false)
const selectedOrg = ref<AgencyOrg | null>(null)
const expandedPartnerId = ref<string | null>(null)
const partnerError = ref<string | null>(null)
const partnerMessage = ref<string | null>(null)
const partnerBusyId = ref<string | null>(null)
const provisionedCredentials = ref<{ email: string; password: string; orgName: string } | null>(null)
const editCountries = ref<string[]>([])
const editMemberEmails = ref('')
const editMaxPending = ref(String(DEFAULT_MAX_PENDING_APPLICATIONS))
const editSaving = ref(false)
const editError = ref<string | null>(null)
const createError = ref<string | null>(null)
const createSaving = ref(false)
const dataLoading = ref(true)
const promoBanner = ref<PromoBannerConfig>(getPromoBannerConfig())
const promoSaved = ref(false)

const newName = ref('')
const newKind = ref<AgencyOrgKind>('travel')
const newCountries = ref<string[]>([...DEFAULT_LIVE_COUNTRIES])
const newPrimaryEmail = ref('')
const newMemberEmails = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const newMaxPending = ref(String(DEFAULT_MAX_PENDING_APPLICATIONS))

const newCode = ref('')
const newTitle = ref('')
const newDesc = ref('')
const policyError = ref<string | null>(null)

const allCountries = getAllCountries()

async function refresh() {
  orgs.value = listAgencyOrgs()
  partnerApps.value = loadPartnerApplications()
  stats.value = getAdminAggregateStats()
  auditLog.value = loadAuditLog()
  promoBanner.value = getPromoBannerConfig()
  rejectionsStore.loadPossibleReasons()
  if (selectedOrg.value) {
    selectedOrg.value = orgs.value.find((o) => o.id === selectedOrg.value!.id) ?? null
  }
  const remotePartners = await fetchPartnerApplicationsFromR2()
  if (remotePartners) {
    partnerApps.value = remotePartners
  }
}

const pendingPartners = computed(() =>
  partnerApps.value.filter((p) => p.status === 'new' || p.status === 'contacted'),
)
const approvedPartners = computed(() =>
  partnerApps.value.filter((p) => p.status === 'approved'),
)
const rejectedPartners = computed(() =>
  partnerApps.value.filter((p) => p.status === 'rejected'),
)

function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  return `Vislet-${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10)}`
}

async function persistPartnerApps(
  next: PartnerApplicationRecord[],
  previous: PartnerApplicationRecord[],
): Promise<boolean> {
  partnerApps.value = next
  savePartnerApplications(next)
  const ok = await syncPartnerApplicationsToR2(next)
  if (!ok) {
    partnerApps.value = previous
    savePartnerApplications(previous)
    partnerError.value = 'Failed to save partner application changes to cloud storage.'
    return false
  }
  return true
}

async function markPartnerStatus(
  id: string,
  status: PartnerApplicationRecord['status'],
  notes?: string,
) {
  partnerError.value = null
  const previous = [...partnerApps.value]
  const next = partnerApps.value.map((p) =>
    p.id === id
      ? {
          ...p,
          status,
          ...(notes !== undefined ? { notes } : {}),
        }
      : p,
  )
  await persistPartnerApps(next, previous)
}

async function approvePartner(partner: PartnerApplicationRecord) {
  if (!authStore.user) return
  partnerBusyId.value = partner.id
  partnerError.value = null
  partnerMessage.value = null
  provisionedCredentials.value = null
  const previous = [...partnerApps.value]
  try {
    const tempPassword = generateTempPassword()
    const org = await createAgencyOrg({
      name: partner.companyName.trim(),
      orgKind: 'travel',
      countries: [...DEFAULT_LIVE_COUNTRIES],
      memberEmails: [],
      primaryMemberEmail: partner.contactEmail.trim().toLowerCase(),
      invitePassword: tempPassword,
      maxPendingApplications: DEFAULT_MAX_PENDING_APPLICATIONS,
      actorUid: authStore.user.id,
    })
    const next = partnerApps.value.map((p) =>
      p.id === partner.id
        ? {
            ...p,
            status: 'approved' as const,
            notes: `Provisioned org ${org.id}. Temporary password issued to admin.`,
          }
        : p,
    )
    const ok = await persistPartnerApps(next, previous)
    if (!ok) return
    provisionedCredentials.value = {
      email: partner.contactEmail.trim().toLowerCase(),
      password: tempPassword,
      orgName: org.name,
    }
    partnerMessage.value = `Approved ${partner.companyName} and created an active agency. Copy the temporary credentials below.`
    await refresh()
  } catch (e) {
    partnerError.value = e instanceof Error ? e.message : 'Failed to approve partner'
  } finally {
    partnerBusyId.value = null
  }
}

async function rejectPartner(partner: PartnerApplicationRecord) {
  const reason = window.prompt(
    `Rejection reason for ${partner.companyName} (required):`,
    partner.notes || '',
  )
  if (reason == null) return
  const trimmed = reason.trim()
  if (!trimmed) {
    partnerError.value = 'A rejection reason is required.'
    return
  }
  partnerBusyId.value = partner.id
  try {
    await markPartnerStatus(partner.id, 'rejected', trimmed)
    partnerMessage.value = `${partner.companyName} moved to Rejected.`
  } finally {
    partnerBusyId.value = null
  }
}

function togglePartnerDetail(id: string) {
  expandedPartnerId.value = expandedPartnerId.value === id ? null : id
}

function openPartnerContact(partner: PartnerApplicationRecord) {
  const url = SUPPORT_GMAIL_COMPOSE(
    partner.contactEmail,
    `Vislet partner inquiry — ${partner.companyName}`,
    `Hi ${partner.companyName},\n\nThanks for applying to partner with Vislet.\n\n`,
  )
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openOrgContact(org: AgencyOrg) {
  const email = org.primaryMemberEmail || org.memberEmails[0]
  if (!email) return
  const url = SUPPORT_GMAIL_COMPOSE(
    email,
    `Vislet agency contact — ${org.name}`,
    `Hi ${org.name},\n\n`,
  )
  window.open(url, '_blank', 'noopener,noreferrer')
}

let stopPoller: (() => void) | null = null

onMounted(async () => {
  if (!isAdminUser(authStore.user)) {
    router.push({ name: 'Login' })
    return
  }
  dataLoading.value = true
  try {
    await hydratePlatformFromRemote()
    await refresh()
  } finally {
    dataLoading.value = false
  }
  stopPoller = startDashboardPoller(async () => {
    await hydratePlatformFromRemote()
    await refresh()
  })
})

onUnmounted(() => {
  stopPoller?.()
  stopPoller = null
})

function handleSavePromoBanner() {
  savePromoBannerConfig({ ...promoBanner.value })
  promoSaved.value = true
  window.setTimeout(() => {
    promoSaved.value = false
  }, 2000)
}

async function handleCreateOrg() {
  if (!newName.value.trim() || !authStore.user) return
  createError.value = null
  if (!newPrimaryEmail.value.trim()) {
    createError.value = 'Primary member email is required'
    return
  }
  if (newPassword.value.length < 8) {
    createError.value = 'Temporary password must be at least 8 characters'
    return
  }
  if (newPassword.value !== newPasswordConfirm.value) {
    createError.value = 'Passwords do not match'
    return
  }
  if (newCountries.value.length === 0) {
    createError.value = 'Select at least one destination country'
    return
  }

  createSaving.value = true
  try {
    const extra = newMemberEmails.value
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    await createAgencyOrg({
      name: newName.value.trim(),
      orgKind: newKind.value,
      countries: newCountries.value,
      memberEmails: extra,
      primaryMemberEmail: newPrimaryEmail.value.trim(),
      invitePassword: newPassword.value,
      maxPendingApplications: Number(newMaxPending.value) || DEFAULT_MAX_PENDING_APPLICATIONS,
      actorUid: authStore.user.id,
    })
    newName.value = ''
    newPrimaryEmail.value = ''
    newMemberEmails.value = ''
    newPassword.value = ''
    newPasswordConfirm.value = ''
    newCountries.value = [...DEFAULT_LIVE_COUNTRIES]
    showCreateModal.value = false
    await refresh()
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Failed to create organization'
  } finally {
    createSaving.value = false
  }
}

function openOrgDetail(org: AgencyOrg) {
  selectedOrg.value = org
  editCountries.value = [...org.countries]
  editMemberEmails.value = org.memberEmails.join(', ')
  editMaxPending.value = String(org.maxPendingApplications ?? DEFAULT_MAX_PENDING_APPLICATIONS)
  editError.value = null
}

async function handleSaveOrgEdits() {
  if (!selectedOrg.value || !authStore.user) return
  editSaving.value = true
  editError.value = null
  try {
    const emails = editMemberEmails.value
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    await updateAgencyOrg(
      selectedOrg.value.id,
      {
        countries: editCountries.value,
        memberEmails: emails,
        maxPendingApplications:
          Number(editMaxPending.value) || DEFAULT_MAX_PENDING_APPLICATIONS,
      },
      authStore.user.id,
    )
    await refresh()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    editSaving.value = false
  }
}

async function toggleOrgActive(org: AgencyOrg) {
  if (!authStore.user) return
  try {
    await updateAgencyOrg(org.id, { active: !org.active }, authStore.user.id)
    await refresh()
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Failed to update organization'
  }
}

function rejectionUsedCount(code: string): number {
  return getEveryLocalApplication().filter((a) => a.rejectionCode === code).length
}

function handleAddRejectionCode() {
  policyError.value = null
  if (!newCode.value || !newTitle.value || !newDesc.value) {
    policyError.value = 'Fill in code, title, and description'
    return
  }
  try {
    rejectionsStore.addRejectionCode({
      code: newCode.value.trim().toUpperCase().replace(/\s+/g, '_'),
      title: newTitle.value.trim(),
      description: newDesc.value.trim(),
    })
    newCode.value = ''
    newTitle.value = ''
    newDesc.value = ''
    showPolicyModal.value = false
  } catch (e) {
    policyError.value = e instanceof Error ? e.message : 'Failed to save'
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Landing' })
}

const pendingTotal = computed(() =>
  Object.values(stats.value.pendingByCountry).reduce((a, b) => a + b, 0),
)

const activeOrgs = computed(() => orgs.value.filter((o) => o.active))
</script>

<template>
  <div class="min-h-screen bg-surface">
    <header class="border-b border-muted bg-white px-6 py-4 shadow-xs">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="font-display text-2xl font-black text-navy tracking-tight">Vislet</div>
          <span class="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
            ADMIN CONSOLE
          </span>
        </div>
        <AppButton variant="outline" size="sm" @click="handleLogout">Sign Out</AppButton>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div class="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-navy font-display">Platform operations</h1>
          <p class="text-sm text-navy/60 mt-1">
            Manage agencies and countries. Admins see counts only — visa review is agency-only.
          </p>
        </div>
        <div class="flex gap-2">
          <AppButton variant="outline" size="sm" @click="showPolicyModal = true">
            Rejection codes
          </AppButton>
          <AppButton variant="primary" size="sm" class="bg-navy text-white" @click="showCreateModal = true">
            + New agency org
          </AppButton>
        </div>
      </div>

      <div v-if="dataLoading" class="rounded-card border border-muted bg-white p-8 text-center text-sm text-navy/50">
        Loading platform data…
      </div>

      <template v-else>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AppCard class="p-5">
            <span class="text-xs font-bold text-navy/40 uppercase">Agency orgs</span>
            <span class="text-3xl font-extrabold text-navy mt-2 block">{{ stats.orgCount }}</span>
          </AppCard>
          <AppCard class="p-5">
            <span class="text-xs font-bold text-navy/40 uppercase">Active orgs</span>
            <span class="text-3xl font-extrabold text-green-600 mt-2 block">{{ stats.activeOrgs }}</span>
          </AppCard>
          <AppCard class="p-5">
            <span class="text-xs font-bold text-navy/40 uppercase">Pending review</span>
            <span class="text-3xl font-extrabold text-amber-600 mt-2 block">{{ pendingTotal }}</span>
          </AppCard>
          <AppCard class="p-5">
            <span class="text-xs font-bold text-navy/40 uppercase">Submitted today</span>
            <span class="text-3xl font-extrabold text-blue-600 mt-2 block">{{ stats.submissionsToday }}</span>
          </AppCard>
        </div>

        <AppCard class="p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-navy">Landing promo banner</h2>
              <p class="text-sm text-navy/55 mt-1">
                Controls the dismissible top bar on the public landing page.
              </p>
            </div>
            <label class="inline-flex items-center gap-2 text-sm font-semibold text-navy cursor-pointer shrink-0">
              <input v-model="promoBanner.enabled" type="checkbox" class="rounded border-muted" />
              Enabled
            </label>
          </div>
          <AppInput v-model="promoBanner.message" label="Message" />
          <div class="grid sm:grid-cols-2 gap-4">
            <AppInput v-model="promoBanner.ctaLabel" label="CTA label" />
            <AppInput v-model="promoBanner.ctaHref" label="CTA link" placeholder="/signup" />
          </div>
          <label class="inline-flex items-center gap-2 text-sm text-navy/70 cursor-pointer">
            <input v-model="promoBanner.dismissible" type="checkbox" class="rounded border-muted" />
            Allow visitors to dismiss
          </label>
          <div class="flex items-center gap-3">
            <AppButton variant="primary" class="bg-navy text-white" @click="handleSavePromoBanner">
              Save promo banner
            </AppButton>
            <span v-if="promoSaved" class="text-sm font-semibold text-green-600">Saved</span>
          </div>
        </AppCard>

        <AppCard class="p-6 space-y-4">
          <div>
            <h2 class="text-lg font-bold text-navy">Rejection codes</h2>
            <p class="text-sm text-navy/55 mt-1 max-w-2xl">
              Standardized reasons agencies select when rejecting an application. Applicants see the
              code title and description in their dashboard. Use clear, actionable wording.
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-muted text-xs uppercase text-navy/50">
                  <th class="py-2 pr-4">Code</th>
                  <th class="py-2 pr-4">Title</th>
                  <th class="py-2 pr-4">Description</th>
                  <th class="py-2">Used</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted">
                <tr v-for="reason in rejectionsStore.possibleReasons" :key="reason.code">
                  <td class="py-3 pr-4 font-mono text-xs">{{ reason.code }}</td>
                  <td class="py-3 pr-4 font-semibold text-navy">{{ reason.title }}</td>
                  <td class="py-3 pr-4 text-navy/60">{{ reason.description }}</td>
                  <td class="py-3">{{ rejectionUsedCount(reason.code) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <AppButton variant="outline" size="sm" @click="showPolicyModal = true">
            + Add rejection code
          </AppButton>
        </AppCard>

        <AppCard class="p-6">
          <h2 class="text-lg font-bold text-navy mb-4">Pending by country (counts only)</h2>
          <div v-if="Object.keys(stats.pendingByCountry).length === 0" class="text-sm text-navy/50">
            No applications pending review.
          </div>
          <div v-else class="flex flex-wrap gap-3">
            <div
              v-for="(count, iso) in stats.pendingByCountry"
              :key="iso"
              class="rounded-control border border-muted px-3 py-2 text-sm"
            >
              {{ iso2ToFlag(String(iso)) }} {{ getCountryName(String(iso)) }}:
              <span class="font-bold text-navy">{{ count }}</span>
            </div>
          </div>
        </AppCard>

        <AppCard class="p-6 space-y-5">
          <div>
            <h2 class="text-lg font-bold text-navy">Partner applications</h2>
            <p class="text-sm text-navy/55 mt-1">
              Click a company for full details. Approve provisions an active agency with login credentials.
            </p>
          </div>
          <p v-if="partnerError" class="text-sm text-red-600">{{ partnerError }}</p>
          <p v-if="partnerMessage" class="text-sm text-green-700">{{ partnerMessage }}</p>
          <div
            v-if="provisionedCredentials"
            class="rounded-control border border-green-200 bg-green-50 p-4 text-sm space-y-1"
          >
            <p class="font-semibold text-green-800">Temporary agency credentials</p>
            <p><span class="font-semibold">Org:</span> {{ provisionedCredentials.orgName }}</p>
            <p><span class="font-semibold">Email:</span> {{ provisionedCredentials.email }}</p>
            <p>
              <span class="font-semibold">Password:</span>
              <code class="font-mono">{{ provisionedCredentials.password }}</code>
            </p>
            <p class="text-xs text-green-800/70">
              Share securely. The agency will be asked to change this password on first login.
            </p>
          </div>

          <section class="space-y-2">
            <h3 class="text-sm font-bold uppercase tracking-wide text-amber-700">
              Pending review ({{ pendingPartners.length }})
            </h3>
            <div v-if="pendingPartners.length === 0" class="text-sm text-navy/45">
              No partner applications waiting for review.
            </div>
            <div
              v-for="partner in pendingPartners"
              :key="partner.id"
              class="rounded-control border border-muted overflow-hidden"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface/70"
                @click="togglePartnerDetail(partner.id)"
              >
                <div>
                  <p class="font-semibold text-navy">{{ partner.companyName }}</p>
                  <p class="text-xs text-navy/55">{{ partner.contactEmail }} · {{ partner.estimatedVolume }}</p>
                </div>
                <span class="text-xs font-semibold capitalize text-amber-700">{{ partner.status }}</span>
              </button>
              <div v-if="expandedPartnerId === partner.id" class="border-t border-muted bg-surface/40 px-4 py-3 space-y-2 text-sm">
                <p><span class="font-semibold text-navy">ID:</span> <span class="font-mono text-xs">{{ partner.id }}</span></p>
                <p><span class="font-semibold text-navy">Submitted:</span> {{ new Date(partner.createdAt).toLocaleString() }}</p>
                <p><span class="font-semibold text-navy">Estimated volume:</span> {{ partner.estimatedVolume }}</p>
                <p><span class="font-semibold text-navy">Notes:</span> {{ partner.notes || '—' }}</p>
                <div class="flex flex-wrap gap-2 pt-1">
                  <AppButton variant="outline" size="sm" @click="openPartnerContact(partner)">Contact</AppButton>
                  <AppButton
                    variant="outline"
                    size="sm"
                    :disabled="partnerBusyId === partner.id"
                    @click="markPartnerStatus(partner.id, 'contacted')"
                  >
                    Mark contacted
                  </AppButton>
                  <AppButton
                    variant="primary"
                    size="sm"
                    class="bg-green-600 text-white"
                    :loading="partnerBusyId === partner.id"
                    @click="approvePartner(partner)"
                  >
                    Approve & create agency
                  </AppButton>
                  <AppButton
                    variant="outline"
                    size="sm"
                    class="text-red-600 border-red-200"
                    :disabled="partnerBusyId === partner.id"
                    @click="rejectPartner(partner)"
                  >
                    Reject
                  </AppButton>
                </div>
              </div>
            </div>
          </section>

          <section class="space-y-2">
            <h3 class="text-sm font-bold uppercase tracking-wide text-red-700">
              Rejected ({{ rejectedPartners.length }})
            </h3>
            <div v-if="rejectedPartners.length === 0" class="text-sm text-navy/45">
              No rejected partner applications.
            </div>
            <div
              v-for="partner in rejectedPartners"
              :key="partner.id"
              class="rounded-control border border-red-100 overflow-hidden"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-red-50/50"
                @click="togglePartnerDetail(partner.id)"
              >
                <div>
                  <p class="font-semibold text-navy">{{ partner.companyName }}</p>
                  <p class="text-xs text-navy/55">{{ partner.contactEmail }}</p>
                </div>
                <span class="text-xs font-semibold text-red-600">Rejected</span>
              </button>
              <div v-if="expandedPartnerId === partner.id" class="border-t border-red-100 px-4 py-3 space-y-1 text-sm">
                <p><span class="font-semibold text-navy">ID:</span> <span class="font-mono text-xs">{{ partner.id }}</span></p>
                <p><span class="font-semibold text-navy">Submitted:</span> {{ new Date(partner.createdAt).toLocaleString() }}</p>
                <p><span class="font-semibold text-navy">Volume:</span> {{ partner.estimatedVolume }}</p>
                <p><span class="font-semibold text-navy">Rejection reason:</span> {{ partner.notes || '—' }}</p>
              </div>
            </div>
          </section>

          <section class="space-y-2">
            <h3 class="text-sm font-bold uppercase tracking-wide text-green-700">
              Approved partners ({{ approvedPartners.length }})
            </h3>
            <p class="text-xs text-navy/50">
              Approved partners become active agencies below ({{ activeOrgs.length }} active).
            </p>
            <div v-if="approvedPartners.length === 0" class="text-sm text-navy/45">
              No approved partner applications yet.
            </div>
            <div
              v-for="partner in approvedPartners"
              :key="partner.id"
              class="rounded-control border border-green-100 overflow-hidden"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-green-50/40"
                @click="togglePartnerDetail(partner.id)"
              >
                <div>
                  <p class="font-semibold text-navy">{{ partner.companyName }}</p>
                  <p class="text-xs text-navy/55">{{ partner.contactEmail }}</p>
                </div>
                <span class="text-xs font-semibold text-green-700">Approved</span>
              </button>
              <div v-if="expandedPartnerId === partner.id" class="border-t border-green-100 px-4 py-3 space-y-1 text-sm">
                <p><span class="font-semibold text-navy">ID:</span> <span class="font-mono text-xs">{{ partner.id }}</span></p>
                <p><span class="font-semibold text-navy">Submitted:</span> {{ new Date(partner.createdAt).toLocaleString() }}</p>
                <p><span class="font-semibold text-navy">Volume:</span> {{ partner.estimatedVolume }}</p>
                <p><span class="font-semibold text-navy">Notes:</span> {{ partner.notes || '—' }}</p>
              </div>
            </div>
          </section>
        </AppCard>

        <AppCard class="overflow-hidden">
          <div class="p-5 border-b border-muted bg-surface/50">
            <h2 class="text-lg font-bold text-navy">Active agency organizations</h2>
            <p class="text-xs text-navy/50 mt-1">
              Click a row for details, editing, and key reset. Approved partners appear here once provisioned.
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-muted text-xs uppercase text-navy/50">
                  <th class="px-5 py-3">Name</th>
                  <th class="px-5 py-3">Type</th>
                  <th class="px-5 py-3">Destinations</th>
                  <th class="px-5 py-3">Members</th>
                  <th class="px-5 py-3">Stats</th>
                  <th class="px-5 py-3">Status</th>
                  <th class="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted">
                <tr
                  v-for="org in orgs"
                  :key="org.id"
                  class="cursor-pointer hover:bg-surface/80"
                  @click="openOrgDetail(org)"
                >
                  <td class="px-5 py-4">
                    <div class="font-semibold text-navy">{{ org.name }}</div>
                    <div class="text-xxs text-navy/45 mt-0.5">
                      {{ org.primaryMemberEmail || org.memberEmails[0] || '—' }}
                    </div>
                  </td>
                  <td class="px-5 py-4 capitalize">{{ org.orgKind }}</td>
                  <td class="px-5 py-4">
                    <span v-for="c in org.countries" :key="c" class="mr-1" :title="getCountryName(c)">
                      {{ iso2ToFlag(c) }}
                    </span>
                  </td>
                  <td class="px-5 py-4 text-xs text-navy/60">
                    {{ org.memberEmails.join(', ') || '—' }}
                  </td>
                  <td class="px-5 py-4 text-xs font-mono">
                    P{{ org.stats.pending }} A{{ org.stats.approved }} R{{ org.stats.rejected }}
                  </td>
                  <td class="px-5 py-4">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-semibold"
                      :class="org.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
                    >
                      {{ org.active ? 'Active' : 'Disabled' }}
                    </span>
                  </td>
                  <td class="px-5 py-4 text-right space-x-2" @click.stop>
                    <AppButton
                      variant="outline"
                      size="sm"
                      :disabled="!(org.primaryMemberEmail || org.memberEmails[0])"
                      @click="openOrgContact(org)"
                    >
                      Contact
                    </AppButton>
                    <AppButton variant="outline" size="sm" @click="toggleOrgActive(org)">
                      {{ org.active ? 'Disable' : 'Enable' }}
                    </AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard class="p-6">
          <h2 class="text-lg font-bold text-navy mb-4">Audit log (metadata only)</h2>
          <ul class="space-y-2 text-xs font-mono text-navy/70 max-h-48 overflow-y-auto">
            <li v-for="entry in auditLog.slice(0, 20)" :key="entry.id">
              {{ entry.timestamp }} · {{ entry.action }}
              <span v-if="entry.applicationId"> · app {{ entry.applicationId.slice(0, 8) }}…</span>
            </li>
            <li v-if="auditLog.length === 0" class="text-navy/40">No audit entries yet.</li>
          </ul>
        </AppCard>
      </template>
    </main>

    <!-- Create org modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4"
    >
      <AppCard class="max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-navy">Create agency organization</h3>
        <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
        <AppInput v-model="newName" label="Organization name" required />
        <div>
          <label class="text-xs font-bold text-navy/70 uppercase">Type</label>
          <select v-model="newKind" class="mt-1 w-full border border-muted rounded-control p-2.5 text-sm">
            <option value="travel">Travel agency</option>
            <option value="government">Government</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-bold text-navy/70 uppercase">
            Destination countries this org reviews
          </label>
          <p class="mt-1 text-xs text-navy/50">
            e.g. IT = visas destined for Italy. Applicants can apply once this org is active.
          </p>
          <select
            v-model="newCountries"
            multiple
            class="mt-2 w-full border border-muted rounded-control p-2.5 text-sm h-32"
          >
            <option v-for="c in allCountries" :key="c.iso2" :value="c.iso2">
              {{ c.flag }} {{ c.name }}
            </option>
          </select>
        </div>
        <AppInput
          v-model="newPrimaryEmail"
          label="Primary login email"
          type="email"
          placeholder="lead@agency.com"
          required
        />
        <AppInput
          v-model="newPassword"
          label="Temporary password (min 8 chars)"
          type="password"
          required
        />
        <AppInput
          v-model="newPasswordConfirm"
          label="Confirm temporary password"
          type="password"
          required
        />
        <AppInput
          v-model="newMemberEmails"
          label="Additional member emails (optional, comma-separated)"
          placeholder="agent2@example.com"
        />
        <AppInput
          v-model="newMaxPending"
          label="Max pending applications (overflow capacity)"
          type="number"
        />
        <div class="flex justify-end gap-2">
          <AppButton variant="outline" @click="showCreateModal = false">Cancel</AppButton>
          <AppButton
            variant="primary"
            class="bg-navy text-white"
            :loading="createSaving"
            @click="handleCreateOrg"
          >
            Create & save
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Org detail modal -->
    <div
      v-if="selectedOrg"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4"
    >
      <AppCard class="max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-bold text-navy">{{ selectedOrg.name }}</h3>
            <p class="text-sm text-navy/55 capitalize mt-1">
              {{ selectedOrg.orgKind }} ·
              {{ selectedOrg.active ? 'Active' : 'Disabled' }} ·
              Created {{ selectedOrg.createdAt.slice(0, 10) }}
            </p>
          </div>
          <AppButton variant="outline" size="sm" @click="selectedOrg = null">Close</AppButton>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="rounded-control border border-muted p-3">
            <div class="text-xs text-navy/45 uppercase">Pending</div>
            <div class="text-xl font-bold text-amber-600">{{ selectedOrg.stats.pending }}</div>
          </div>
          <div class="rounded-control border border-muted p-3">
            <div class="text-xs text-navy/45 uppercase">Approved</div>
            <div class="text-xl font-bold text-green-600">{{ selectedOrg.stats.approved }}</div>
          </div>
          <div class="rounded-control border border-muted p-3">
            <div class="text-xs text-navy/45 uppercase">Rejected</div>
            <div class="text-xl font-bold text-red-600">{{ selectedOrg.stats.rejected }}</div>
          </div>
          <div class="rounded-control border border-muted p-3">
            <div class="text-xs text-navy/45 uppercase">Completed</div>
            <div class="text-xl font-bold text-navy">{{ selectedOrg.stats.completed }}</div>
          </div>
        </div>

        <p class="text-sm text-navy/60">
          Primary login: <span class="font-semibold text-navy">{{ selectedOrg.primaryMemberEmail || '—' }}</span>
        </p>

        <div>
          <label class="text-xs font-bold text-navy/70 uppercase">Assigned destinations</label>
          <select
            v-model="editCountries"
            multiple
            class="mt-2 w-full border border-muted rounded-control p-2.5 text-sm h-28"
          >
            <option v-for="c in allCountries" :key="c.iso2" :value="c.iso2">
              {{ c.flag }} {{ c.name }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <p class="text-xs font-bold text-navy/70 uppercase">Destination workload</p>
          <div
            v-for="iso in editCountries"
            :key="iso"
            class="flex flex-wrap items-center justify-between gap-2 rounded-control border border-muted px-3 py-2 text-sm"
          >
            <span>
              {{ iso2ToFlag(iso) }} {{ getCountryName(iso) }}
              <span class="text-navy/40 text-xs ml-1">
                ({{ countPendingForCountry(iso) }} pending)
              </span>
            </span>
          </div>
        </div>

        <AppInput v-model="editMemberEmails" label="Member emails (comma-separated)" />
        <AppInput
          v-model="editMaxPending"
          label="Max pending (overflow capacity)"
          type="number"
        />
        <p v-if="editError" class="text-sm text-red-600">{{ editError }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <AppButton variant="outline" @click="toggleOrgActive(selectedOrg)">
            {{ selectedOrg.active ? 'Disable org' : 'Enable org' }}
          </AppButton>
          <AppButton
            variant="primary"
            class="bg-navy text-white"
            :loading="editSaving"
            @click="handleSaveOrgEdits"
          >
            Save changes
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Add rejection code modal -->
    <div
      v-if="showPolicyModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4"
    >
      <AppCard class="max-w-md w-full p-6 space-y-4">
        <h3 class="text-lg font-bold text-navy">Add rejection code</h3>
        <p class="text-xs text-navy/55">
          Applicants will see the title and description when an agency rejects their application with
          this code.
        </p>
        <p v-if="policyError" class="text-sm text-red-600">{{ policyError }}</p>
        <AppInput v-model="newCode" label="Code" placeholder="DOCUMENT_QUALITY" required />
        <AppInput v-model="newTitle" label="Title" required />
        <textarea
          v-model="newDesc"
          rows="3"
          class="w-full border border-muted rounded-control p-2.5 text-sm"
          placeholder="Description for applicants"
        />
        <div class="flex justify-end gap-2">
          <AppButton variant="outline" @click="showPolicyModal = false">Cancel</AppButton>
          <AppButton variant="primary" class="bg-navy text-white" @click="handleAddRejectionCode">
            Save
          </AppButton>
        </div>
      </AppCard>
    </div>
  </div>
</template>
