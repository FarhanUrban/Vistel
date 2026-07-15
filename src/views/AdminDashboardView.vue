<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { useRejectionsStore } from '@/features/admin-rejections/store'
import { getAllApplications, updateApplication } from '@/services/visaService'
import { addInterview } from '@/services/interviewsService'
import { getCountryName, iso2ToFlag } from '@/services/visaIndexService'
import type { VisaApplication, VisaApplicationStatus } from '@/types'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'

const router = useRouter()
const authStore = useAuthStore()
const rejectionsStore = useRejectionsStore()

const applications = ref<VisaApplication[]>([])
const selectedApp = ref<VisaApplication | null>(null)
const isLoading = ref(true)

// Search & Filter
const searchQuery = ref('')
const statusFilter = ref('all')

// Review form
const reviewStatus = ref<VisaApplicationStatus>('submitted')
const selectedRejectionCode = ref('')
const internalNotes = ref('')
const updatingStatus = ref(false)

// Interview form
const interviewDate = ref('')
const interviewLocation = ref('')
const interviewNotes = ref('')
const schedulingInterview = ref(false)

// Custom Rejection Config
const showPolicyModal = ref(false)
const newCode = ref('')
const newTitle = ref('')
const newDesc = ref('')

async function loadData() {
  isLoading.value = true
  try {
    applications.value = await getAllApplications()
    rejectionsStore.loadPossibleReasons()
  } catch (e) {
    console.error('Failed to load admin applications', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (!authStore.user || authStore.user.role !== 'admin') {
    router.push({ name: 'Login' })
    return
  }
  loadData()
})

const filteredApps = computed(() => {
  return applications.value.filter((app) => {
    const isAgencyLabel = app.agencyId ? 'agency' : 'user'
    const nameStr = app.clientName || 'Standard User'
    const emailStr = app.clientEmail || 'demo@gmail.com'
    const matchesSearch =
      nameStr.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      isAgencyLabel.includes(searchQuery.value.toLowerCase())

    const matchesStatus = statusFilter.value === 'all' || app.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

const stats = computed(() => {
  const total = applications.value.length
  const submitted = applications.value.filter((a) => a.status === 'submitted').length
  const reviewing = applications.value.filter((a) => a.status === 'reviewing').length
  const completed = applications.value.filter((a) => a.status === 'completed').length
  const rejected = applications.value.filter((a) => a.status === 'rejected').length

  return { total, submitted, reviewing, completed, rejected }
})

function selectApplication(app: VisaApplication) {
  selectedApp.value = app
  reviewStatus.value = app.status
  selectedRejectionCode.value = app.rejectionCode || ''
  internalNotes.value = app.notes || ''
  // Clear interview inputs
  interviewDate.value = ''
  interviewLocation.value = ''
  interviewNotes.value = ''
}

async function handleUpdateStatus() {
  if (!selectedApp.value) return
  updatingStatus.value = true
  try {
    const patch: Partial<VisaApplication> = {
      status: reviewStatus.value,
      notes: internalNotes.value,
    }
    if (reviewStatus.value === 'rejected') {
      patch.rejectionCode = selectedRejectionCode.value
    } else {
      patch.rejectionCode = undefined
    }

    if (reviewStatus.value === 'completed') {
      patch.paidAt = new Date().toISOString()
      patch.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // default 90 days validity
    }

    const updated = await updateApplication(selectedApp.value.id, patch)
    selectedApp.value = updated

    // Reload list
    const index = applications.value.findIndex((a) => a.id === updated.id)
    if (index !== -1) {
      applications.value[index] = updated
    }
    alert('Application status updated successfully!')
  } catch (e) {
    console.error('Update status failed', e)
  } finally {
    updatingStatus.value = false
  }
}

async function handleScheduleInterview() {
  if (!selectedApp.value || !interviewDate.value || !interviewLocation.value) return
  schedulingInterview.value = true
  try {
    await addInterview(selectedApp.value.userId, {
      applicationId: selectedApp.value.id,
      scheduledAt: new Date(interviewDate.value).toISOString(),
      location: interviewLocation.value,
      scheduledBy: 'consulate',
      notes: interviewNotes.value,
    })

    alert('Consulate interview scheduled successfully!')
    interviewDate.value = ''
    interviewLocation.value = ''
    interviewNotes.value = ''
  } catch (e) {
    console.error(e)
  } finally {
    schedulingInterview.value = false
  }
}

function handleAddRejectionCode() {
  if (!newCode.value || !newTitle.value || !newDesc.value) return
  rejectionsStore.possibleReasons.push({
    code: newCode.value,
    title: newTitle.value,
    description: newDesc.value,
  })
  newCode.value = ''
  newTitle.value = ''
  newDesc.value = ''
  showPolicyModal.value = false
  alert('Custom Rejection Code Policy registered!')
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Landing' })
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500/10 text-green-700'
    case 'rejected': return 'bg-red-500/10 text-red-700'
    case 'reviewing':
    case 'submitted':
    case 'payment_processing': return 'bg-amber-500/10 text-amber-700'
    case 'awaiting_payment': return 'bg-blue-500/10 text-blue-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface">
    <!-- Header -->
    <header class="border-b border-muted bg-white px-6 py-4 shadow-xs">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="font-display text-2xl font-black text-navy tracking-tight">Vislet</div>
          <span class="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">SYSTEM CONSOLE</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <div class="text-sm font-semibold text-navy">Admin Operator</div>
            <div class="text-xs text-navy/55">{{ authStore.user?.email }}</div>
          </div>
          <AppButton variant="outline" size="sm" @click="handleLogout">
            Sign Out
          </AppButton>
        </div>
      </div>
    </header>

    <!-- Content Workspace -->
    <main class="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-black tracking-tight text-navy font-display">Visa Processing Registry</h1>
          <p class="text-navy/60 text-sm">Review uploaded passenger documentation and approve consulate clearance files.</p>
        </div>
        <AppButton variant="outline" size="sm" @click="showPolicyModal = true">
          ⚙ Configure Policy Codes
        </AppButton>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <AppCard class="p-5 flex flex-col justify-between">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Total Filed</span>
          <span class="text-3xl font-extrabold text-navy mt-2">{{ stats.total }}</span>
        </AppCard>
        <AppCard class="p-5 flex flex-col justify-between border-l-4 border-blue-500">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Submitted</span>
          <span class="text-3xl font-extrabold text-blue-600 mt-2">{{ stats.submitted }}</span>
        </AppCard>
        <AppCard class="p-5 flex flex-col justify-between border-l-4 border-amber-500">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Under Review</span>
          <span class="text-3xl font-extrabold text-amber-600 mt-2">{{ stats.reviewing }}</span>
        </AppCard>
        <AppCard class="p-5 flex flex-col justify-between border-l-4 border-green-500">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Approved</span>
          <span class="text-3xl font-extrabold text-green-600 mt-2">{{ stats.completed }}</span>
        </AppCard>
        <AppCard class="p-5 flex flex-col justify-between border-l-4 border-red-500 col-span-2 lg:col-span-1">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Rejected</span>
          <span class="text-3xl font-extrabold text-red-600 mt-2">{{ stats.rejected }}</span>
        </AppCard>
      </div>

      <!-- Left Table / Right Detail layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- List Panel -->
        <div class="lg:col-span-7 bg-white border border-muted rounded-card overflow-hidden shadow-sm">
          <div class="p-5 border-b border-muted flex flex-col sm:flex-row gap-4 justify-between bg-surface/50">
            <AppInput v-model="searchQuery" placeholder="Filter by passenger name, agency..." class="w-full sm:max-w-xs" />
            <select v-model="statusFilter" class="bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-sm font-medium outline-none transition-colors">
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewing">Reviewing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div v-if="isLoading" class="p-12 text-center text-navy/55">
            Loading registry...
          </div>
          <div v-else-if="filteredApps.length === 0" class="p-12 text-center text-navy/55">
            No applications match the search query.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface border-b border-muted text-xs font-bold text-navy/50 uppercase">
                  <th class="px-5 py-4">Client</th>
                  <th class="px-5 py-4">Source</th>
                  <th class="px-5 py-4">Destination</th>
                  <th class="px-5 py-4">Status</th>
                  <th class="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted text-xs font-semibold">
                <tr v-for="app in filteredApps" :key="app.id" class="hover:bg-surface/30 cursor-pointer transition-colors"
                  :class="selectedApp?.id === app.id ? 'bg-accent-blue/10' : ''" @click="selectApplication(app)">
                  <td class="px-5 py-4">
                    <div class="font-bold text-navy text-sm">{{ app.clientName || 'Standard User' }}</div>
                    <div class="text-navy/50 text-xxs font-mono">{{ app.id }}</div>
                  </td>
                  <td class="px-5 py-4">
                    <span v-if="app.agencyId" class="bg-accent-orange/15 text-accent-orange border border-accent-orange/20 px-2 py-0.5 rounded font-bold uppercase text-xxs">Agency</span>
                    <span v-else class="bg-navy/10 text-navy/70 px-2 py-0.5 rounded uppercase text-xxs">Direct B2C</span>
                  </td>
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-1.5">
                      <span>{{ iso2ToFlag(app.destinationCountry) }}</span>
                      <span>{{ app.destinationCountry }}</span>
                    </div>
                  </td>
                  <td class="px-5 py-4">
                    <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="getStatusClasses(app.status)">
                      {{ app.status }}
                    </span>
                  </td>
                  <td class="px-5 py-4 text-right">
                    <button class="text-accent-blue hover:underline font-bold text-xs" @click.stop="selectApplication(app)">
                      Select &rarr;
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Detail Panel -->
        <div class="lg:col-span-5">
          <AppCard v-if="selectedApp" class="p-6 space-y-6">
            <div>
              <div class="flex justify-between items-start">
                <h2 class="text-xl font-bold text-navy font-display">{{ selectedApp.clientName || 'Standard User' }}</h2>
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="getStatusClasses(selectedApp.status)">{{ selectedApp.status }}</span>
              </div>
              <p class="text-xs text-navy/50 font-mono mt-1">Application ID: {{ selectedApp.id }}</p>
            </div>

            <!-- Client & Passport Details -->
            <div class="grid grid-cols-2 gap-4 bg-surface p-3.5 rounded border border-muted text-xs">
              <div>
                <span class="text-navy/40 font-bold uppercase text-xxs block">Destination</span>
                <span class="font-semibold text-navy">{{ iso2ToFlag(selectedApp.destinationCountry) }} {{ getCountryName(selectedApp.destinationCountry) }}</span>
              </div>
              <div>
                <span class="text-navy/40 font-bold uppercase text-xxs block">Visa Category</span>
                <span class="font-semibold text-navy capitalize">{{ selectedApp.visaType }}</span>
              </div>
              <div>
                <span class="text-navy/40 font-bold uppercase text-xxs block">Submitted Date</span>
                <span class="font-semibold text-navy">{{ new Date(selectedApp.submittedAt).toLocaleDateString() }}</span>
              </div>
              <div>
                <span class="text-navy/40 font-bold uppercase text-xxs block">Filing Mode</span>
                <span class="font-semibold text-navy">{{ selectedApp.agencyId ? 'Agency B2B' : 'Individual Direct' }}</span>
              </div>
            </div>

            <!-- Uploaded Documents Review -->
            <div class="space-y-2">
              <span class="text-xs font-bold text-navy/70 uppercase">Consulate Attachment Records</span>
              <div v-if="!selectedApp.documents || selectedApp.documents.length === 0" class="text-xs text-navy/40 italic">
                No documents uploaded.
              </div>
              <div v-else class="space-y-1.5">
                <div v-for="doc in selectedApp.documents" :key="doc.id" class="flex justify-between items-center border border-muted p-2 rounded text-xs bg-white">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">📄</span>
                    <span class="font-semibold text-navy truncate max-w-xs">{{ doc.name }}</span>
                  </div>
                  <a href="#" @click.prevent class="text-accent-blue font-semibold hover:underline text-xxs">Preview Doc</a>
                </div>
              </div>
            </div>

            <!-- Review Actions Form -->
            <div class="space-y-4 pt-4 border-t border-muted">
              <h3 class="text-sm font-bold text-navy uppercase">Consulate Evaluation Action</h3>
              <form @submit.prevent="handleUpdateStatus" class="space-y-3.5">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-xxs font-bold text-navy/55 uppercase">Assign Status</label>
                    <select v-model="reviewStatus" class="w-full bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-xs font-medium outline-none transition-colors">
                      <option value="submitted">Submitted</option>
                      <option value="reviewing">Under Review</option>
                      <option value="completed">Completed / Approve</option>
                      <option value="rejected">Rejected / Flag</option>
                    </select>
                  </div>
                  <div v-if="reviewStatus === 'rejected'" class="space-y-1">
                    <label class="text-xxs font-bold text-navy/55 uppercase">Rejection Reason Code</label>
                    <select v-model="selectedRejectionCode" class="w-full bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-xs font-medium outline-none transition-colors">
                      <option value="" disabled>Select Reason</option>
                      <option v-for="reason in rejectionsStore.possibleReasons" :key="reason.code" :value="reason.code">
                        {{ reason.title }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-xxs font-bold text-navy/55 uppercase">Feedback / Remarks</label>
                  <textarea v-model="internalNotes" rows="2" class="w-full border border-muted hover:border-navy/20 rounded-control p-2.5 text-xs outline-none text-navy focus:border-accent-blue transition-colors" placeholder="Add consulate evaluation summary..."></textarea>
                </div>

                <AppButton type="submit" variant="primary" class="w-full bg-navy text-white hover:bg-black py-2.5 text-xs font-bold" :loading="updatingStatus">
                  Update Clearance Record
                </AppButton>
              </form>
            </div>

            <!-- Schedule Interview Form -->
            <div class="space-y-4 pt-4 border-t border-muted">
              <h3 class="text-sm font-bold text-navy uppercase">Consulate Interview Dispatcher</h3>
              <form @submit.prevent="handleScheduleInterview" class="space-y-3.5">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-xxs font-bold text-navy/55 uppercase">Date & Time</label>
                    <input type="datetime-local" v-model="interviewDate" required class="w-full bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-xs font-medium outline-none transition-colors" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xxs font-bold text-navy/55 uppercase">Consulate Location</label>
                    <input type="text" v-model="interviewLocation" required placeholder="Consulate NY, Virtual Room 2..." class="w-full bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-xs font-medium outline-none transition-colors" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-xxs font-bold text-navy/55 uppercase">Consulate Operator Notes</label>
                  <input type="text" v-model="interviewNotes" placeholder="Bring original documentation files..." class="w-full bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-xs font-medium outline-none transition-colors" />
                </div>
                <AppButton type="submit" variant="outline" class="w-full text-navy border-navy hover:bg-navy/5 py-2 text-xs font-bold" :loading="schedulingInterview">
                  Dispatch Consulate Interview
                </AppButton>
              </form>
            </div>
          </AppCard>

          <AppCard v-else class="p-12 text-center text-navy/40 italic">
            Select a client record from the registry table to trigger review actions.
          </AppCard>
        </div>
      </div>
    </main>

    <!-- Configure Policy Modal -->
    <div v-if="showPolicyModal" class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
      <AppCard class="max-w-md w-full p-6 space-y-4">
        <div class="flex justify-between items-center border-b border-muted pb-3">
          <h3 class="text-lg font-bold text-navy">Add Custom Rejection Code Policy</h3>
          <button @click="showPolicyModal = false" class="text-navy/50 hover:text-navy text-xl">&times;</button>
        </div>
        <form @submit.prevent="handleAddRejectionCode" class="space-y-4">
          <AppInput v-model="newCode" label="Policy Short Code" placeholder="INSUFFICIENT_PHOTO_CONTRAST" required />
          <AppInput v-model="newTitle" label="Policy Rule Title" placeholder="Low Photo Contrast" required />
          <div class="space-y-1">
            <label class="text-xs font-bold text-navy/70 uppercase">Detailed Directive Description</label>
            <textarea v-model="newDesc" required rows="3" class="w-full border border-muted hover:border-navy/20 rounded-control p-2.5 text-xs outline-none text-navy focus:border-accent-blue transition-colors" placeholder="Explain the custom consulate rejection condition..."></textarea>
          </div>
          <div class="flex justify-end gap-3 pt-3">
            <AppButton variant="outline" type="button" @click="showPolicyModal = false">Cancel</AppButton>
            <AppButton variant="primary" type="submit" class="bg-navy text-white hover:bg-black font-bold">Register Code</AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  </div>
</template>
