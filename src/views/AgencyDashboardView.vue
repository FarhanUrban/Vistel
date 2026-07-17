<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { useRejectionsStore } from '@/features/admin-rejections/store'
import {
  getAgencyOrg,
  resolveOrgForUser,
  syncOrgStats,
} from '@/services/agencyOrgService'
import { startDashboardPoller } from '@/services/dashboardPoller'
import {
  fetchSubmittedDocument,
  getVisaQuestions,
} from '@/services/documentsService'
import { getAgencyApplications, reviewApplication } from '@/services/visaService'
import { getCountryName, iso2ToFlag } from '@/services/visaIndexService'
import type { VisaApplication, VisaQuestion } from '@/types'
import { changeAgencyPassword } from '@/services/authService'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'

interface ReviewDocumentView {
  id: string
  name: string
  uploadedAt: string
  documentTypeId?: string
  loading: boolean
  error: string | null
  previewUrl: string | null
  previewKind: 'image' | 'pdf' | 'download' | null
  objectUrl: string | null
}

const router = useRouter()
const authStore = useAuthStore()
const rejectionsStore = useRejectionsStore()

const applications = ref<VisaApplication[]>([])
const isLoading = ref(true)
const loggingOut = ref(false)
const org = ref(authStore.user ? resolveOrgForUser(authStore.user) : null)

const searchQuery = ref('')
const statusFilter = ref('all')
const destinationFilter = ref('')

const showPasswordChange = ref(false)
const newAgencyPassword = ref('')
const newAgencyPasswordConfirm = ref('')
const passwordError = ref<string | null>(null)
const passwordSaving = ref(false)

const selectedApp = ref<VisaApplication | null>(null)
const reviewAnswers = ref<Record<string, string>>({})
const reviewError = ref<string | null>(null)
const reviewNotice = ref<string | null>(null)
const reviewLoading = ref(false)
const showRejectionHelp = ref(false)
const acceptanceNote = ref('')
const questionCatalog = ref<VisaQuestion[]>([])
const reviewDocuments = ref<ReviewDocumentView[]>([])
const isLegacyEncrypted = ref(false)

const rejectionCode = ref('')
const rejectionOther = ref('')
const rejectionDetails = ref('')

const labeledAnswers = computed(() => {
  const answers = reviewAnswers.value
  const byId = new Map(questionCatalog.value.map((q) => [q.id, q]))
  return Object.entries(answers).map(([id, value]) => {
    const question = byId.get(id)
    return {
      id,
      label: question?.label || id,
      category: question?.category || 'Other',
      value: value?.trim() ? value : '— (empty)',
    }
  })
})

const answersByCategory = computed(() => {
  const groups = new Map<string, typeof labeledAnswers.value>()
  for (const item of labeledAnswers.value) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  return [...groups.entries()]
})

function unavailable(value: string | undefined | null | boolean): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value == null || value === '') return 'Not provided in this submission'
  return String(value)
}

function isPending(app: VisaApplication): boolean {
  return app.status === 'submitted' || app.status === 'reviewing'
}

function revokeDocumentUrls() {
  for (const doc of reviewDocuments.value) {
    if (doc.objectUrl) URL.revokeObjectURL(doc.objectUrl)
  }
  reviewDocuments.value = []
}

function closeReview() {
  revokeDocumentUrls()
  selectedApp.value = null
  reviewAnswers.value = {}
  reviewError.value = null
  reviewNotice.value = null
  acceptanceNote.value = ''
  questionCatalog.value = []
  isLegacyEncrypted.value = false
}

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

let stopPoller: (() => void) | null = null

onMounted(async () => {
  if (!authStore.user || authStore.user.role !== 'agency') {
    router.push({ name: 'Login', query: { redirect: '/agency/dashboard' } })
    return
  }
  const { hydratePlatformFromRemote } = await import('@/services/platformStorage')
  await hydratePlatformFromRemote()
  await loadData()
  stopPoller = startDashboardPoller(async () => {
    await hydratePlatformFromRemote()
    await loadData()
  })
})

onUnmounted(() => {
  stopPoller?.()
  stopPoller = null
  revokeDocumentUrls()
})

const stats = computed(() => org.value?.stats ?? {
  submitted: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  awaitingPayment: 0,
  completed: 0,
})

const assignedDestinationsLabel = computed(() => {
  if (!org.value?.countries.length) return ''
  return org.value.countries.map((iso) => getCountryName(iso)).join(', ')
})

const pendingByDestination = computed(() => {
  const counts: Record<string, number> = {}
  for (const app of applications.value) {
    if (!isPending(app)) continue
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
    const haystack = `${app.id} ${app.clientName ?? ''} ${app.clientEmail ?? ''} ${dest}`.toLowerCase()
    const matchesSearch = haystack.includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value === 'all' || app.status === statusFilter.value
    return matchesDestination && matchesSearch && matchesStatus
  })
})

const pendingQueue = computed(() => filteredApps.value.filter((a) => isPending(a)))
const approvedQueue = computed(() =>
  filteredApps.value.filter(
    (a) => a.status === 'awaiting_payment' || a.status === 'completed',
  ),
)
const rejectedQueue = computed(() =>
  filteredApps.value.filter((a) => a.status === 'rejected'),
)

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

async function openDocument(doc: ReviewDocumentView) {
  if (!selectedApp.value) return
  if (isLegacyEncrypted.value) {
    doc.error = 'This legacy encrypted document cannot be opened without the original key.'
    return
  }
  doc.loading = true
  doc.error = null
  try {
    const { bytes, fileName, contentType } = await fetchSubmittedDocument(doc.id)
    const lower = (doc.name || fileName).toLowerCase()
    let mime = contentType || 'application/octet-stream'
    let kind: ReviewDocumentView['previewKind'] = 'download'
    if (/\.(png|jpe?g|gif|webp)$/i.test(lower) || mime.startsWith('image/')) {
      mime = mime.startsWith('image/')
        ? mime
        : lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.webp')
            ? 'image/webp'
            : lower.endsWith('.gif')
              ? 'image/gif'
              : 'image/jpeg'
      kind = 'image'
    } else if (lower.endsWith('.pdf') || mime === 'application/pdf') {
      mime = 'application/pdf'
      kind = 'pdf'
    }
    if (doc.objectUrl) URL.revokeObjectURL(doc.objectUrl)
    const blob = new Blob([bytes], { type: mime })
    const url = URL.createObjectURL(blob)
    doc.objectUrl = url
    doc.previewUrl = url
    doc.previewKind = kind
  } catch (e) {
    doc.error = e instanceof Error ? e.message : 'Could not open document'
  } finally {
    doc.loading = false
  }
}

async function openReview(app: VisaApplication) {
  revokeDocumentUrls()
  selectedApp.value = app
  reviewAnswers.value = {}
  reviewError.value = null
  reviewNotice.value = null
  acceptanceNote.value = app.acceptanceNote ?? ''
  rejectionCode.value = app.rejectionCode ?? ''
  rejectionOther.value = app.rejectionOther ?? ''
  rejectionDetails.value = app.rejectionDetails ?? ''
  questionCatalog.value = await getVisaQuestions(app.destinationCountry, app.visaType)

  const legacy =
    app.storageFormat === 'legacy-encrypted-v1' ||
    (app.encrypted === true && app.storageFormat !== 'server-readable-v1')
  isLegacyEncrypted.value = legacy

  if (legacy) {
    reviewNotice.value =
      'This is a legacy encrypted application. Answers and documents are unavailable without the original key. You can still accept or reject it.'
  } else {
    reviewAnswers.value = { ...(app.answers ?? {}) }
  }

  const docs = app.documents ?? []
  reviewDocuments.value = docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    uploadedAt: doc.uploadedAt,
    documentTypeId: doc.documentTypeId,
    loading: false,
    error: null,
    previewUrl: null,
    previewKind: null,
    objectUrl: null,
  }))

  if (!legacy) {
    await Promise.all(reviewDocuments.value.slice(0, 4).map((doc) => openDocument(doc)))
  }
}

async function handleApprove() {
  if (!selectedApp.value || !authStore.user || !org.value) return
  if (!isPending(selectedApp.value)) {
    reviewError.value = 'This application has already been decided.'
    return
  }
  reviewLoading.value = true
  reviewError.value = null
  try {
    await reviewApplication({
      applicationId: selectedApp.value.id,
      orgId: org.value.id,
      actorUid: authStore.user.id,
      actorEmail: authStore.user.email,
      actorRole: authStore.user.role,
      decision: 'approve',
      acceptanceNote: acceptanceNote.value.trim() || undefined,
    })
    closeReview()
    await loadData()
  } catch (e) {
    reviewError.value = e instanceof Error ? e.message : 'Approve failed'
  } finally {
    reviewLoading.value = false
  }
}

async function handleReject() {
  if (!selectedApp.value || !authStore.user || !org.value) return
  if (!isPending(selectedApp.value)) {
    reviewError.value = 'This application has already been decided.'
    return
  }
  if (!rejectionCode.value && !rejectionOther.value.trim()) {
    reviewError.value = 'Select a rejection code or enter a custom reason.'
    return
  }
  if (rejectionCode.value === 'OTHER' && !rejectionOther.value.trim()) {
    reviewError.value = 'Enter a custom reason when using Other.'
    return
  }
  reviewLoading.value = true
  reviewError.value = null
  try {
    await reviewApplication({
      applicationId: selectedApp.value.id,
      orgId: org.value.id,
      actorUid: authStore.user.id,
      actorEmail: authStore.user.email,
      actorRole: authStore.user.role,
      decision: 'reject',
      rejectionCode: rejectionCode.value || 'OTHER',
      rejectionOther: rejectionOther.value.trim() || undefined,
      rejectionDetails: rejectionDetails.value.trim() || undefined,
    })
    closeReview()
    await loadData()
  } catch (e) {
    reviewError.value = e instanceof Error ? e.message : 'Reject failed'
  } finally {
    reviewLoading.value = false
  }
}

async function handleLogout() {
  loggingOut.value = true
  try {
    await authStore.logout()
  } finally {
    loggingOut.value = false
    router.push({ name: 'AgencyLanding' })
  }
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

function applicantLabel(app: VisaApplication): string {
  return app.clientName?.trim() || 'Name not provided'
}
</script>

<template>
  <div class="min-h-screen bg-surface">
    <header class="border-b border-muted bg-white px-4 py-4 sm:px-6">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="font-display text-2xl font-black text-navy">Vislet</div>
          <span class="text-xs font-bold text-accent-orange bg-accent-orange/15 px-2.5 py-1 rounded-full">
            AGENCY REVIEW
          </span>
        </div>
        <AppButton variant="outline" size="sm" :loading="loggingOut" @click="handleLogout">
          Sign Out
        </AppButton>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-8 space-y-8 sm:px-6">
      <div v-if="!org" class="text-center py-16">
        <p class="text-navy font-semibold">No agency organization assigned to your account.</p>
        <p class="text-sm text-navy/60 mt-2">Contact your administrator to be invited.</p>
        <AppButton class="mt-4" variant="outline" :loading="loggingOut" @click="handleLogout">
          Sign Out
        </AppButton>
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
              <span v-if="pendingByDestination[iso]" class="ml-1 opacity-80">
                ({{ pendingByDestination[iso] }})
              </span>
            </button>
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

        <div class="p-4 border border-muted rounded-card bg-white flex flex-wrap gap-3 justify-between">
          <AppInput v-model="searchQuery" placeholder="Search by name, email, ID..." class="max-w-xs" />
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

        <template v-else>
          <AppCard class="overflow-hidden">
            <div class="p-4 border-b border-muted bg-amber-50/60">
              <h2 class="font-bold text-navy">Pending review</h2>
              <p class="text-xs text-navy/55 mt-0.5">
                New applicants wait here until you accept or reject ({{ pendingQueue.length }}).
              </p>
            </div>
            <div v-if="pendingQueue.length === 0" class="p-8 text-center text-navy/50 text-sm">
              No applications waiting for review.
            </div>
            <table v-else class="w-full text-sm text-left">
              <thead>
                <tr class="border-b border-muted text-xs uppercase text-navy/50">
                  <th class="px-5 py-3">Applicant</th>
                  <th class="px-5 py-3">Destination</th>
                  <th class="px-5 py-3">Visa</th>
                  <th class="px-5 py-3">Submitted</th>
                  <th class="px-5 py-3">Status</th>
                  <th class="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted">
                <tr v-for="app in pendingQueue" :key="app.id">
                  <td class="px-5 py-3">
                    <p class="font-semibold text-navy">{{ applicantLabel(app) }}</p>
                    <p class="text-xs text-navy/50">{{ app.clientEmail || app.id }}</p>
                  </td>
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

          <AppCard class="overflow-hidden">
            <div class="p-4 border-b border-muted bg-green-50/60">
              <h2 class="font-bold text-navy">Approved</h2>
              <p class="text-xs text-navy/55 mt-0.5">Accepted applications ({{ approvedQueue.length }})</p>
            </div>
            <div v-if="approvedQueue.length === 0" class="p-6 text-center text-navy/45 text-sm">
              No approved applications yet.
            </div>
            <table v-else class="w-full text-sm text-left">
              <thead>
                <tr class="border-b border-muted text-xs uppercase text-navy/50">
                  <th class="px-5 py-3">Applicant</th>
                  <th class="px-5 py-3">Destination</th>
                  <th class="px-5 py-3">Status</th>
                  <th class="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted">
                <tr v-for="app in approvedQueue" :key="app.id">
                  <td class="px-5 py-3">
                    <p class="font-semibold text-navy">{{ applicantLabel(app) }}</p>
                    <p class="text-xs text-navy/50">{{ app.clientEmail || app.id }}</p>
                  </td>
                  <td class="px-5 py-3">{{ iso2ToFlag(app.destinationCountry) }} {{ getCountryName(app.destinationCountry) }}</td>
                  <td class="px-5 py-3">
                    <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="getStatusClasses(app.status)">
                      {{ app.status.replace('_', ' ') }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <AppButton variant="outline" size="sm" @click="openReview(app)">View</AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </AppCard>

          <AppCard class="overflow-hidden">
            <div class="p-4 border-b border-muted bg-red-50/60">
              <h2 class="font-bold text-navy">Rejected</h2>
              <p class="text-xs text-navy/55 mt-0.5">Rejected applications ({{ rejectedQueue.length }})</p>
            </div>
            <div v-if="rejectedQueue.length === 0" class="p-6 text-center text-navy/45 text-sm">
              No rejected applications.
            </div>
            <table v-else class="w-full text-sm text-left">
              <thead>
                <tr class="border-b border-muted text-xs uppercase text-navy/50">
                  <th class="px-5 py-3">Applicant</th>
                  <th class="px-5 py-3">Destination</th>
                  <th class="px-5 py-3">Reason</th>
                  <th class="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted">
                <tr v-for="app in rejectedQueue" :key="app.id">
                  <td class="px-5 py-3">
                    <p class="font-semibold text-navy">{{ applicantLabel(app) }}</p>
                    <p class="text-xs text-navy/50">{{ app.clientEmail || app.id }}</p>
                  </td>
                  <td class="px-5 py-3">{{ iso2ToFlag(app.destinationCountry) }} {{ getCountryName(app.destinationCountry) }}</td>
                  <td class="px-5 py-3 text-xs text-navy/70">
                    {{ app.rejectionOther || app.rejectionCode || '—' }}
                  </td>
                  <td class="px-5 py-3 text-right">
                    <AppButton variant="outline" size="sm" @click="openReview(app)">View</AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </AppCard>
        </template>
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
      v-if="selectedApp"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 overflow-y-auto"
    >
      <AppCard class="max-w-3xl w-full p-6 space-y-5 my-8">
        <div class="flex justify-between items-start gap-3">
          <div>
            <h3 class="font-bold text-navy text-lg">Review application</h3>
            <p class="text-xs font-mono text-navy/50">{{ selectedApp.id }}</p>
          </div>
          <button type="button" class="text-navy/50 text-xl leading-none" @click="closeReview">×</button>
        </div>

        <p v-if="reviewError" class="text-sm text-red-600">{{ reviewError }}</p>
        <p v-if="reviewNotice" class="text-sm text-amber-700">{{ reviewNotice }}</p>

        <section class="rounded-control border border-muted p-4 space-y-2 text-sm">
          <h4 class="text-xs font-bold uppercase tracking-wide text-navy/50">Customer</h4>
          <p>
            <span class="font-semibold text-navy">Name:</span>
            {{ unavailable(selectedApp.clientName) }}
          </p>
          <p>
            <span class="font-semibold text-navy">Email:</span>
            {{ unavailable(selectedApp.clientEmail) }}
          </p>
          <p>
            <span class="font-semibold text-navy">Applicant ID:</span>
            <span class="font-mono text-xs">{{ selectedApp.userId }}</span>
          </p>
        </section>

        <section class="rounded-control border border-muted p-4 space-y-2 text-sm">
          <h4 class="text-xs font-bold uppercase tracking-wide text-navy/50">Application details</h4>
          <p>
            <span class="font-semibold text-navy">Destination:</span>
            {{ iso2ToFlag(selectedApp.destinationCountry) }}
            {{ getCountryName(selectedApp.destinationCountry) }}
          </p>
          <p class="capitalize">
            <span class="font-semibold text-navy">Visa type:</span>
            {{ selectedApp.visaType.replace('-', ' ') }}
          </p>
          <p>
            <span class="font-semibold text-navy">Passport country:</span>
            {{ unavailable(selectedApp.passportCountry) }}
          </p>
          <p class="capitalize">
            <span class="font-semibold text-navy">Passport type:</span>
            {{ unavailable(selectedApp.passportType) }}
          </p>
          <p>
            <span class="font-semibold text-navy">Additional documents:</span>
            {{ unavailable(selectedApp.hasAdditionalDocs) }}
          </p>
          <p>
            <span class="font-semibold text-navy">Submitted:</span>
            {{ new Date(selectedApp.submittedAt).toLocaleString() }}
          </p>
          <p>
            <span class="font-semibold text-navy">Status:</span>
            <span class="capitalize">{{ selectedApp.status.replace('_', ' ') }}</span>
          </p>
        </section>

        <section
          v-if="!isLegacyEncrypted"
          class="rounded-control border border-muted p-4 space-y-4 text-sm max-h-80 overflow-y-auto"
        >
          <h4 class="text-xs font-bold uppercase tracking-wide text-navy/50">
            Questionnaire answers
          </h4>
          <div v-if="answersByCategory.length === 0" class="text-navy/50">
            No questionnaire answers were included in this submission.
          </div>
          <div v-for="[category, items] in answersByCategory" :key="category" class="space-y-2">
            <p class="text-xs font-bold uppercase text-navy/40">{{ category }}</p>
            <div v-for="item in items" :key="item.id" class="rounded bg-surface/70 px-3 py-2">
              <p class="font-semibold text-navy">{{ item.label }}</p>
              <p class="mt-0.5 whitespace-pre-wrap text-navy/80">{{ item.value }}</p>
            </div>
          </div>
        </section>

        <section
          v-if="!isLegacyEncrypted"
          class="rounded-control border border-muted p-4 space-y-3 text-sm"
        >
          <h4 class="text-xs font-bold uppercase tracking-wide text-navy/50">
            Submitted documents
          </h4>
          <div v-if="reviewDocuments.length === 0" class="text-navy/50">
            No documents were included in this submission.
          </div>
          <div
            v-for="doc in reviewDocuments"
            :key="doc.id"
            class="rounded border border-muted/80 p-3 space-y-2"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-navy">{{ doc.name }}</p>
                <p class="text-xs text-navy/45">
                  Type: {{ doc.documentTypeId || 'unknown' }} ·
                  Uploaded {{ doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—' }}
                </p>
              </div>
              <AppButton
                variant="outline"
                size="sm"
                :loading="doc.loading"
                @click="openDocument(doc)"
              >
                {{ doc.previewUrl ? 'Reload' : 'Open' }}
              </AppButton>
            </div>
            <p v-if="doc.error" class="text-xs text-red-600">{{ doc.error }}</p>
            <img
              v-if="doc.previewKind === 'image' && doc.previewUrl"
              :src="doc.previewUrl"
              :alt="doc.name"
              class="max-h-72 w-full rounded object-contain bg-white"
            />
            <iframe
              v-else-if="doc.previewKind === 'pdf' && doc.previewUrl"
              :src="doc.previewUrl"
              class="h-80 w-full rounded border border-muted"
              title="PDF preview"
            />
            <a
              v-else-if="doc.previewUrl"
              :href="doc.previewUrl"
              :download="doc.name"
              class="inline-block text-xs font-semibold text-accent-blue hover:underline"
            >
              Download file
            </a>
          </div>
        </section>

        <section
          v-if="isPending(selectedApp)"
          class="space-y-3 border-t border-muted pt-4"
        >
          <h4 class="text-xs font-bold uppercase tracking-wide text-navy/50">Decision</h4>
          <p class="text-xs text-navy/55">
            Accepting notifies the applicant to continue to payment. Rejecting sends the reason so they can resubmit documents.
          </p>
          <AppInput
            v-model="acceptanceNote"
            label="Acceptance note (optional)"
            placeholder="Optional note for the applicant if you approve"
          />
          <AppButton
            variant="primary"
            class="bg-green-600 text-white"
            :loading="reviewLoading"
            :disabled="reviewLoading"
            @click="handleApprove"
          >
            Accept application
          </AppButton>

          <div class="space-y-2 border-t border-muted pt-3">
            <div class="flex items-center justify-between gap-2">
              <label class="text-xs font-bold text-navy/70 uppercase">Rejection reason (required)</label>
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
            <AppInput
              v-model="rejectionOther"
              :placeholder="rejectionCode === 'OTHER' ? 'Custom reason (required)' : 'Custom reason (optional)'"
            />
            <textarea
              v-model="rejectionDetails"
              rows="2"
              class="w-full border border-muted rounded-control p-2 text-sm"
              placeholder="Additional details for the applicant (optional)"
            />
            <AppButton
              variant="outline"
              class="text-red-600 border-red-200"
              :loading="reviewLoading"
              :disabled="reviewLoading"
              @click="handleReject"
            >
              Reject application
            </AppButton>
          </div>
        </section>
      </AppCard>
    </div>
  </div>
</template>
