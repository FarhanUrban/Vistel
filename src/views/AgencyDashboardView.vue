<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { useRejectionsStore } from '@/features/admin-rejections/store'
import {
  getAgencyOrg,
  importCountryPrivateKey,
  isCountryKeyReady,
  resolveOrgForUser,
  setupCountryKeyForAgency,
  syncOrgStats,
} from '@/services/agencyOrgService'
import { getUserPrivateKey } from '@/services/platformStorage'
import { decryptApplicationPayload } from '@/services/documentsService'
import { getAgencyApplications, reviewApplication } from '@/services/visaService'
import { getCountryName, iso2ToFlag } from '@/services/visaIndexService'
import type { EncryptedApplicationPayload } from '@/services/documentsService'
import type { VisaApplication } from '@/types'
import { changeAgencyPassword } from '@/services/authService'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'

const router = useRouter()
const authStore = useAuthStore()
const rejectionsStore = useRejectionsStore()

const applications = ref<VisaApplication[]>([])
const isLoading = ref(true)
const org = ref(resolveOrgForUser(authStore.user!))

const searchQuery = ref('')
const statusFilter = ref('all')
/** ISO2 filter within org.countries; empty string = all assigned destinations */
const destinationFilter = ref('')

const showKeySetup = ref(false)
const keySetupCountry = ref('')
const keySetupStep = ref(1)
const keyImportText = ref('')
const keyError = ref<string | null>(null)
const keyLoading = ref(false)
const keyConfirmed = ref(false)

const showPasswordChange = ref(false)
const newAgencyPassword = ref('')
const newAgencyPasswordConfirm = ref('')
const passwordError = ref<string | null>(null)
const passwordSaving = ref(false)

const selectedApp = ref<VisaApplication | null>(null)
const decrypted = ref<EncryptedApplicationPayload | null>(null)
const decryptError = ref<string | null>(null)
const reviewLoading = ref(false)
const showRejectionHelp = ref(false)

const rejectionCode = ref('')
const rejectionOther = ref('')
const rejectionDetails = ref('')

async function loadData() {
  if (!authStore.user) return
  org.value = resolveOrgForUser(authStore.user)
  if (!org.value) {
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    applications.value = await getAgencyApplications(org.value.id)
    syncOrgStats(org.value.id)
    org.value = getAgencyOrg(org.value.id) ?? org.value
    rejectionsStore.loadPossibleReasons()
    if (authStore.user.mustChangePassword || org.value.mustChangePassword) {
      showPasswordChange.value = true
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!authStore.user || authStore.user.role !== 'agency') {
    router.push({ name: 'Login', query: { redirect: '/agency/dashboard' } })
    return
  }
  const { hydratePlatformFromRemote } = await import('@/services/platformStorage')
  await hydratePlatformFromRemote()
  await loadData()
})

const stats = computed(() => org.value?.stats ?? {
  submitted: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  awaitingPayment: 0,
  completed: 0,
})

const countriesNeedingKeys = computed(() => {
  if (!org.value) return []
  return org.value.countries.filter((c) => !isCountryKeyReady(c))
})

const assignedDestinationsLabel = computed(() => {
  if (!org.value?.countries.length) return ''
  return org.value.countries.map((iso) => getCountryName(iso)).join(', ')
})

const pendingByDestination = computed(() => {
  const counts: Record<string, number> = {}
  for (const app of applications.value) {
    if (app.status !== 'submitted' && app.status !== 'reviewing') continue
    const iso = app.destinationCountry.toUpperCase()
    counts[iso] = (counts[iso] ?? 0) + 1
  }
  return counts
})

const filteredApps = computed(() => {
  return applications.value.filter((app) => {
    const dest = app.destinationCountry.toUpperCase()
    const matchesDestination =
      !destinationFilter.value || dest === destinationFilter.value.toUpperCase()
    const matchesSearch =
      app.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      dest.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value === 'all' || app.status === statusFilter.value
    return matchesDestination && matchesSearch && matchesStatus
  })
})

const pendingQueue = computed(() =>
  filteredApps.value.filter((a) => a.status === 'submitted' || a.status === 'reviewing'),
)

const filteredPendingCount = computed(() => pendingQueue.value.length)

function openKeyWizard(countryIso2: string) {
  keySetupCountry.value = countryIso2
  keySetupStep.value = 1
  keyConfirmed.value = false
  keyError.value = null
  keyImportText.value = ''
  showKeySetup.value = true
}

async function handleGenerateKey() {
  if (!authStore.user || !org.value || !keySetupCountry.value) return
  keyLoading.value = true
  keyError.value = null
  try {
    await setupCountryKeyForAgency(authStore.user.id, org.value.id, keySetupCountry.value)
    keySetupStep.value = 2
  } catch (e) {
    keyError.value = e instanceof Error ? e.message : 'Key setup failed'
  } finally {
    keyLoading.value = false
  }
}

function handleImportKey() {
  if (!authStore.user || !keySetupCountry.value) return
  keyLoading.value = true
  keyError.value = null
  try {
    const jwk = JSON.parse(keyImportText.value) as JsonWebKey
    importCountryPrivateKey(authStore.user.id, keySetupCountry.value, jwk)
    keyImportText.value = ''
    keySetupStep.value = 3
  } catch {
    keyError.value = 'Invalid private key JSON'
  } finally {
    keyLoading.value = false
  }
}

async function finishKeyWizard() {
  if (!keyConfirmed.value && keySetupStep.value === 2) {
    keyError.value = 'Confirm you saved the private key file before continuing.'
    return
  }
  showKeySetup.value = false
  await loadData()
}

async function handleChangePassword() {
  if (!org.value) return
  passwordError.value = null
  if (newAgencyPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters'
    return
  }
  if (newAgencyPassword.value !== newAgencyPasswordConfirm.value) {
    passwordError.value = 'Passwords do not match'
    return
  }
  passwordSaving.value = true
  try {
    const updated = await changeAgencyPassword(org.value.id, newAgencyPassword.value)
    if (updated) {
      // Pinia setup store exposes `user` as writable
      ;(authStore as { user: typeof updated }).user = updated
    }
    showPasswordChange.value = false
    newAgencyPassword.value = ''
    newAgencyPasswordConfirm.value = ''
  } catch (e) {
    passwordError.value = e instanceof Error ? e.message : 'Failed to update password'
  } finally {
    passwordSaving.value = false
  }
}

async function openReview(app: VisaApplication) {
  selectedApp.value = app
  decrypted.value = null
  decryptError.value = null
  rejectionCode.value = app.rejectionCode ?? ''
  rejectionOther.value = app.rejectionOther ?? ''
  rejectionDetails.value = app.rejectionDetails ?? ''

  if (!authStore.user || !app.encrypted) return
  const privateKey = getUserPrivateKey(authStore.user.id, app.destinationCountry)
  if (!privateKey) {
    decryptError.value = 'Set up or import the country private key first.'
    return
  }
  try {
    decrypted.value = await decryptApplicationPayload(app.id, privateKey)
  } catch (e) {
    decryptError.value = e instanceof Error ? e.message : 'Decryption failed'
  }
}

async function handleApprove() {
  if (!selectedApp.value || !authStore.user || !org.value) return
  reviewLoading.value = true
  decryptError.value = null
  try {
    await reviewApplication({
      applicationId: selectedApp.value.id,
      orgId: org.value.id,
      actorUid: authStore.user.id,
      actorEmail: authStore.user.email,
      actorRole: authStore.user.role,
      decision: 'approve',
    })
    selectedApp.value = null
    await loadData()
  } catch (e) {
    decryptError.value = e instanceof Error ? e.message : 'Approve failed'
  } finally {
    reviewLoading.value = false
  }
}

async function handleReject() {
  if (!selectedApp.value || !authStore.user || !org.value) return
  if (!rejectionCode.value && !rejectionOther.value) {
    decryptError.value = 'Select a rejection code or enter a custom reason.'
    return
  }
  reviewLoading.value = true
  try {
    await reviewApplication({
      applicationId: selectedApp.value.id,
      orgId: org.value.id,
      actorUid: authStore.user.id,
      actorEmail: authStore.user.email,
      actorRole: authStore.user.role,
      decision: 'reject',
      rejectionCode: rejectionCode.value || 'OTHER',
      rejectionOther: rejectionOther.value || undefined,
      rejectionDetails: rejectionDetails.value || undefined,
    })
    selectedApp.value = null
    await loadData()
  } catch (e) {
    decryptError.value = e instanceof Error ? e.message : 'Reject failed'
  } finally {
    reviewLoading.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'AgencyLanding' })
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-700'
    case 'rejected':
      return 'bg-red-500/10 text-red-700'
    case 'submitted':
    case 'reviewing':
      return 'bg-amber-500/10 text-amber-700'
    case 'awaiting_payment':
      return 'bg-blue-500/10 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface">
    <header class="border-b border-muted bg-white px-6 py-4">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="font-display text-2xl font-black text-navy">Vislet</div>
          <span class="text-xs font-bold text-accent-orange bg-accent-orange/15 px-2.5 py-1 rounded-full">
            AGENCY REVIEW
          </span>
        </div>
        <AppButton variant="outline" size="sm" @click="handleLogout">Sign Out</AppButton>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div v-if="!org" class="text-center py-16">
        <p class="text-navy font-semibold">No agency organization assigned to your account.</p>
        <p class="text-sm text-navy/60 mt-2">Contact your administrator to be invited.</p>
      </div>

      <template v-else>
        <div>
          <h1 class="text-3xl font-black text-navy">{{ org.name }}</h1>
          <p class="text-sm text-navy/60 capitalize">{{ org.orgKind }} · Review queue</p>
        </div>

        <AppCard class="p-5 border-l-4 border-accent-blue">
          <p class="text-xs font-bold uppercase tracking-wider text-navy/40">Assigned destinations</p>
          <p class="mt-1 text-sm text-navy">
            You review visas destined for
            <span class="font-semibold">{{ assignedDestinationsLabel }}</span>
            <span class="text-navy/55"> (any passport nationality).</span>
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-control border px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="
                !destinationFilter
                  ? 'border-navy bg-navy text-white'
                  : 'border-muted bg-white text-navy/70 hover:border-navy/30'
              "
              @click="destinationFilter = ''"
            >
              All assigned
              <span v-if="stats.pending" class="ml-1 opacity-80">({{ stats.pending }})</span>
            </button>
            <button
              v-for="iso in org.countries"
              :key="iso"
              type="button"
              class="rounded-control border px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="
                destinationFilter === iso
                  ? 'border-navy bg-navy text-white'
                  : 'border-muted bg-white text-navy/70 hover:border-navy/30'
              "
              @click="destinationFilter = iso"
            >
              {{ iso2ToFlag(iso) }} {{ getCountryName(iso) }}
              <span
                v-if="pendingByDestination[iso]"
                class="ml-1 opacity-80"
              >({{ pendingByDestination[iso] }})</span>
            </button>
          </div>
        </AppCard>

        <AppCard
          v-if="countriesNeedingKeys.length > 0"
          class="p-5 border-l-4 border-amber-500"
        >
          <h2 class="font-bold text-navy">Encryption setup required</h2>
          <p class="text-sm text-navy/60 mt-1 mb-3">
            Complete the setup wizard for each destination before applicants can apply and before you can decrypt submissions.
          </p>
          <div class="flex flex-wrap gap-2">
            <AppButton
              v-for="iso in countriesNeedingKeys"
              :key="iso"
              variant="outline"
              size="sm"
              @click="openKeyWizard(iso)"
            >
              Set up {{ iso2ToFlag(iso) }} {{ getCountryName(iso) }}
            </AppButton>
          </div>
        </AppCard>

        <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <AppCard class="p-4"><span class="text-xxs uppercase text-navy/40">Total</span><p class="text-2xl font-bold">{{ stats.submitted }}</p></AppCard>
          <AppCard class="p-4"><span class="text-xxs uppercase text-navy/40">Pending</span><p class="text-2xl font-bold text-amber-600">{{ stats.pending }}</p></AppCard>
          <AppCard class="p-4"><span class="text-xxs uppercase text-navy/40">Approved</span><p class="text-2xl font-bold text-green-600">{{ stats.approved }}</p></AppCard>
          <AppCard class="p-4"><span class="text-xxs uppercase text-navy/40">Rejected</span><p class="text-2xl font-bold text-red-600">{{ stats.rejected }}</p></AppCard>
          <AppCard class="p-4"><span class="text-xxs uppercase text-navy/40">Awaiting pay</span><p class="text-2xl font-bold text-blue-600">{{ stats.awaitingPayment }}</p></AppCard>
          <AppCard class="p-4"><span class="text-xxs uppercase text-navy/40">Completed</span><p class="text-2xl font-bold">{{ stats.completed }}</p></AppCard>
        </div>

        <AppCard class="overflow-hidden">
          <div class="p-4 border-b border-muted flex flex-wrap gap-3 justify-between">
            <AppInput v-model="searchQuery" placeholder="Search by ID or country..." class="max-w-xs" />
            <select v-model="statusFilter" class="border border-muted rounded-control p-2 text-sm">
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewing">Reviewing</option>
              <option value="awaiting_payment">Awaiting payment</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div v-if="isLoading" class="p-12 text-center text-navy/50">Loading queue…</div>
          <div v-else-if="pendingQueue.length === 0" class="p-12 text-center text-navy/50">
            <template v-if="destinationFilter">
              No applications pending for
              {{ getCountryName(destinationFilter) }}.
            </template>
            <template v-else>
              No applications for your assigned destinations yet.
            </template>
            <p v-if="filteredPendingCount === 0 && destinationFilter" class="mt-2 text-xs text-navy/40">
              Try “All assigned” to see other destinations.
            </p>
          </div>
          <table v-else class="w-full text-sm text-left">
            <thead>
              <tr class="border-b border-muted text-xs uppercase text-navy/50">
                <th class="px-5 py-3">Application</th>
                <th class="px-5 py-3">Destination</th>
                <th class="px-5 py-3">Visa</th>
                <th class="px-5 py-3">Submitted</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted">
              <tr v-for="app in pendingQueue" :key="app.id">
                <td class="px-5 py-3 font-mono text-xs">{{ app.id }}</td>
                <td class="px-5 py-3">{{ iso2ToFlag(app.destinationCountry) }} {{ getCountryName(app.destinationCountry) }}</td>
                <td class="px-5 py-3 capitalize">{{ app.visaType.replace('-', ' ') }}</td>
                <td class="px-5 py-3 text-xs">{{ new Date(app.submittedAt).toLocaleDateString() }}</td>
                <td class="px-5 py-3">
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="getStatusClasses(app.status)">
                    {{ app.status }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right">
                  <AppButton variant="primary" size="sm" @click="openReview(app)">Review</AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </AppCard>
      </template>
    </main>

    <div
      v-if="showPasswordChange"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
    >
      <AppCard class="max-w-md w-full p-6 space-y-4">
        <h3 class="font-bold text-navy">Set a new password</h3>
        <p class="text-sm text-navy/60">
          Your administrator gave you a temporary password. Choose a new one to continue.
        </p>
        <p v-if="passwordError" class="text-sm text-red-600">{{ passwordError }}</p>
        <AppInput v-model="newAgencyPassword" label="New password" type="password" />
        <AppInput v-model="newAgencyPasswordConfirm" label="Confirm password" type="password" />
        <AppButton
          variant="primary"
          class="bg-navy text-white"
          full-width
          :loading="passwordSaving"
          @click="handleChangePassword"
        >
          Save password
        </AppButton>
      </AppCard>
    </div>

    <div
      v-if="showKeySetup"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
    >
      <AppCard class="max-w-md w-full p-6 space-y-4">
        <h3 class="font-bold text-navy">
          Set up {{ keySetupCountry ? getCountryName(keySetupCountry) : '' }}
        </h3>
        <p class="text-xs text-navy/50">Step {{ keySetupStep }} of 3</p>

        <template v-if="keySetupStep === 1">
          <p class="text-sm text-navy/70">
            Generate a country encryption keypair, or import the private key from your organization lead.
          </p>
          <AppButton full-width :loading="keyLoading" @click="handleGenerateKey">
            Generate new keypair & download backup
          </AppButton>
          <p class="text-xs text-navy/50 text-center">— or import from org lead —</p>
          <textarea
            v-model="keyImportText"
            rows="4"
            class="w-full border border-muted rounded-control p-2 text-xs font-mono"
            placeholder="Paste private key JSON…"
          />
          <AppButton variant="outline" full-width :loading="keyLoading" @click="handleImportKey">
            Import private key
          </AppButton>
        </template>

        <template v-else-if="keySetupStep === 2">
          <p class="text-sm text-navy/70">
            A private key file was downloaded. Store it securely — Vislet cannot recover it if lost.
            An admin can reset the country key if needed.
          </p>
          <label class="flex items-start gap-2 text-sm text-navy cursor-pointer">
            <input v-model="keyConfirmed" type="checkbox" class="mt-1 rounded border-muted" />
            I saved the private key backup in a secure place
          </label>
          <AppButton full-width class="bg-navy text-white" @click="finishKeyWizard">
            Confirm & finish
          </AppButton>
        </template>

        <template v-else>
          <p class="text-sm text-green-700 font-semibold">Key imported successfully.</p>
          <AppButton full-width class="bg-navy text-white" @click="finishKeyWizard">Done</AppButton>
        </template>

        <AppButton v-if="keySetupStep === 1" variant="outline" full-width @click="showKeySetup = false">
          Cancel
        </AppButton>
        <p v-if="keyError" class="text-xs text-red-600">{{ keyError }}</p>
      </AppCard>
    </div>

    <div
      v-if="selectedApp"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 overflow-y-auto"
    >
      <AppCard class="max-w-2xl w-full p-6 space-y-4 my-8">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-navy">Review application</h3>
            <p class="text-xs font-mono text-navy/50">{{ selectedApp.id }}</p>
          </div>
          <button type="button" class="text-navy/50 text-xl" @click="selectedApp = null">×</button>
        </div>

        <p v-if="decryptError" class="text-sm text-red-600">{{ decryptError }}</p>

        <template v-if="decrypted">
          <div class="rounded border border-muted p-4 space-y-2 text-sm max-h-64 overflow-y-auto">
            <p v-for="(val, key) in decrypted.answers" :key="key">
              <span class="font-semibold text-navy">{{ key }}:</span> {{ val }}
            </p>
            <ul v-if="decrypted.documents?.length" class="mt-2 space-y-1">
              <li v-for="doc in decrypted.documents" :key="doc.id">📄 {{ doc.name }}</li>
            </ul>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppButton variant="primary" class="bg-green-600 text-white" :loading="reviewLoading" @click="handleApprove">
              Approve
            </AppButton>
            <div class="space-y-2 sm:col-span-2 border-t border-muted pt-3">
              <div class="flex items-center justify-between gap-2">
                <label class="text-xs font-bold text-navy/70 uppercase">Rejection code</label>
                <button
                  type="button"
                  class="text-xs font-medium text-accent-blue hover:underline"
                  @click="showRejectionHelp = !showRejectionHelp"
                >
                  What is this?
                </button>
              </div>
              <div
                v-if="showRejectionHelp"
                class="rounded-control border border-accent-blue/30 bg-accent-blue/10 p-3 text-xs text-navy/70 space-y-2"
              >
                <p>
                  Rejection codes are standardized reasons applicants see when an application is
                  rejected. Pick the closest match so they know what to fix.
                </p>
                <ul class="space-y-1">
                  <li v-for="r in rejectionsStore.possibleReasons" :key="r.code">
                    <span class="font-semibold">{{ r.title }}:</span> {{ r.description }}
                  </li>
                </ul>
              </div>
              <select v-model="rejectionCode" class="w-full border border-muted rounded-control p-2 text-sm">
                <option value="">Select a code</option>
                <option v-for="r in rejectionsStore.possibleReasons" :key="r.code" :value="r.code">
                  {{ r.title }}
                </option>
                <option value="OTHER">Other (custom)</option>
              </select>
              <AppInput v-model="rejectionOther" placeholder="Custom reason (if Other)" />
              <textarea
                v-model="rejectionDetails"
                rows="2"
                class="w-full border border-muted rounded-control p-2 text-sm"
                placeholder="Additional details for the applicant"
              />
              <AppButton variant="outline" class="text-red-600 border-red-200" :loading="reviewLoading" @click="handleReject">
                Reject
              </AppButton>
            </div>
          </div>
        </template>
      </AppCard>
    </div>
  </div>
</template>
