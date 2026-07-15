<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { getAgencyApplications } from '@/services/visaService'
import { saveLocalAgencyApplication } from '@/services/localDocumentStorage'
import { getAllCountries, iso2ToFlag, getCountryName } from '@/services/visaIndexService'
import type { VisaApplication, VisaType } from '@/types'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'

const router = useRouter()
const authStore = useAuthStore()

const applications = ref<VisaApplication[]>([])
const isLoading = ref(true)

// Client Form Modal
const showFormModal = ref(false)
const clientName = ref('')
const clientEmail = ref('')
const passportCountry = ref('')
const destinationCountry = ref('')
const visaType = ref<VisaType>('e-visa')
const simulatedFiles = ref<string[]>([])
const fileError = ref<string | null>(null)
const submitting = ref(false)

const countries = getAllCountries()

async function loadData() {
  if (!authStore.user) return
  isLoading.value = true
  try {
    applications.value = await getAgencyApplications(authStore.user.id)
  } catch (e) {
    console.error('Failed to load agency applications', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (!authStore.user || authStore.user.role !== 'agency') {
    router.push({ name: 'Login' })
    return
  }
  loadData()
})

// Search & Filter
const searchQuery = ref('')
const statusFilter = ref('all')

const filteredApps = computed(() => {
  return applications.value.filter((app) => {
    const matchesSearch =
      (app.clientName?.toLowerCase().includes(searchQuery.value.toLowerCase()) || false) ||
      (app.clientEmail?.toLowerCase().includes(searchQuery.value.toLowerCase()) || false) ||
      app.id.includes(searchQuery.value)

    const matchesStatus = statusFilter.value === 'all' || app.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

// Stats
const stats = computed(() => {
  const total = applications.value.length
  const completed = applications.value.filter((a) => a.status === 'completed').length
  const reviewing = applications.value.filter((a) => a.status === 'reviewing' || a.status === 'submitted').length
  const rejected = applications.value.filter((a) => a.status === 'rejected').length
  const pendingPayment = applications.value.filter((a) => a.status === 'awaiting_payment').length

  return { total, completed, reviewing, rejected, pendingPayment }
})

// File simulation
function triggerFileMock(type: string) {
  simulatedFiles.value.push(type)
}

function handleAddApplication() {
  if (!clientName.value || !clientEmail.value || !passportCountry.value || !destinationCountry.value) {
    fileError.value = 'Please fill out all client details'
    return
  }
  if (simulatedFiles.value.length === 0) {
    fileError.value = 'Please upload at least one required client document'
    return
  }

  submitting.value = true
  fileError.value = null

  setTimeout(async () => {
    try {
      const documentsList = simulatedFiles.value.map((name, index) => ({
        id: `local_agency_${Date.now()}_${index}`,
        name: `${name}_upload.pdf`,
        uploadedAt: new Date().toISOString(),
        documentTypeId: name.toLowerCase(),
      }))

      saveLocalAgencyApplication(
        authStore.user?.id || 'mock-agency',
        clientName.value,
        clientEmail.value,
        destinationCountry.value,
        visaType.value,
        documentsList,
        {
          passport_nationality: passportCountry.value,
          visa_purpose: 'Tourism & Leisure',
        }
      )

      // Reset
      clientName.value = ''
      clientEmail.value = ''
      passportCountry.value = ''
      destinationCountry.value = ''
      visaType.value = 'e-visa'
      simulatedFiles.value = []
      showFormModal.value = false

      await loadData()
    } catch (e) {
      console.error(e)
    } finally {
      submitting.value = false
    }
  }, 800)
}

// Export CSV simulated
function exportToCSV() {
  let csvContent = 'data:text/csv;charset=utf-8,ID,Client Name,Client Email,Destination,Visa Type,Status,Submitted At\n'
  applications.value.forEach((app) => {
    csvContent += `"${app.id}","${app.clientName || ''}","${app.clientEmail || ''}","${getCountryName(app.destinationCountry)}","${app.visaType}","${app.status}","${app.submittedAt}"\n`
  })
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `vislet_agency_clients_${Date.now()}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
    <header class="border-b border-muted bg-white px-6 py-4">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="font-display text-2xl font-black text-navy tracking-tight">Vislet</div>
          <span class="text-xs font-bold text-accent-orange bg-accent-orange/15 px-2.5 py-1 rounded-full">AGENCY BOARD</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <div class="text-sm font-semibold text-navy">{{ authStore.user?.displayName }}</div>
            <div class="text-xs text-navy/55">{{ authStore.user?.email }}</div>
          </div>
          <AppButton variant="outline" size="sm" @click="handleLogout">
            Sign Out
          </AppButton>
        </div>
      </div>
    </header>

    <!-- Main Workspace -->
    <main class="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <!-- Title & Actions -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-3xl font-black tracking-tight text-navy font-display">Client Registries</h1>
          <p class="text-navy/60 text-sm">Submit and track consolidated passenger visa records.</p>
        </div>
        <div class="flex gap-3">
          <AppButton variant="outline" size="md" @click="exportToCSV" :disabled="applications.length === 0">
            Export Records
          </AppButton>
          <AppButton variant="primary" size="md" class="bg-accent-orange hover:bg-accent-orange/90 text-navy font-bold" @click="showFormModal = true">
            + New Client Visa
          </AppButton>
        </div>
      </div>

      <!-- Statistics Dashboard -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <AppCard class="p-5 flex flex-col justify-between">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Total Clients</span>
          <span class="text-3xl font-extrabold text-navy mt-2">{{ stats.total }}</span>
        </AppCard>
        <AppCard class="p-5 flex flex-col justify-between border-l-4 border-green-500">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Approved</span>
          <span class="text-3xl font-extrabold text-green-600 mt-2">{{ stats.completed }}</span>
        </AppCard>
        <AppCard class="p-5 flex flex-col justify-between border-l-4 border-amber-500">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Under Review</span>
          <span class="text-3xl font-extrabold text-amber-600 mt-2">{{ stats.reviewing }}</span>
        </AppCard>
        <AppCard class="p-5 flex flex-col justify-between border-l-4 border-blue-500">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Pending Pay</span>
          <span class="text-3xl font-extrabold text-blue-600 mt-2">{{ stats.pendingPayment }}</span>
        </AppCard>
        <AppCard class="p-5 flex flex-col justify-between border-l-4 border-red-500 col-span-2 lg:col-span-1">
          <span class="text-xs font-bold text-navy/40 uppercase tracking-wider">Rejected / Flags</span>
          <span class="text-3xl font-extrabold text-red-600 mt-2">{{ stats.rejected }}</span>
        </AppCard>
      </div>

      <!-- Filters & Registry list -->
      <div class="bg-white rounded-card border border-muted/70 overflow-hidden shadow-sm">
        <div class="p-5 border-b border-muted flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface/50">
          <!-- Search input -->
          <div class="relative w-full sm:max-w-xs">
            <AppInput v-model="searchQuery" placeholder="Search by name, email, ID..." class="w-full" />
          </div>
          <!-- Filter Select -->
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <label class="text-sm font-semibold text-navy/60 shrink-0">Filter Status:</label>
            <select v-model="statusFilter" class="bg-white border border-muted hover:border-navy/30 rounded-control p-2.5 text-sm font-medium outline-none transition-colors">
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewing">Under Review</option>
              <option value="awaiting_payment">Awaiting Payment</option>
              <option value="completed">Completed / Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div v-if="isLoading" class="p-12 text-center text-navy/50">
          Loading client applications...
        </div>

        <div v-else-if="filteredApps.length === 0" class="p-12 text-center text-navy/50">
          No records found matching filters.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface border-b border-muted text-xs font-bold text-navy/50 uppercase">
                <th class="px-6 py-4">Client Details</th>
                <th class="px-6 py-4">Destination</th>
                <th class="px-6 py-4">Visa Category</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4">Date Submitted</th>
                <th class="px-6 py-4 text-right">Remarks</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted/65 text-sm">
              <tr v-for="app in filteredApps" :key="app.id" class="hover:bg-surface/40 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-navy">{{ app.clientName }}</div>
                  <div class="text-xs text-navy/60">{{ app.clientEmail }}</div>
                  <div class="text-xxs text-navy/40 font-mono mt-0.5">ID: {{ app.id }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ iso2ToFlag(app.destinationCountry) }}</span>
                    <span>{{ getCountryName(app.destinationCountry) }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 font-medium text-navy/85">
                  {{ app.visaType.toUpperCase() }}
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="getStatusClasses(app.status)">
                    {{ app.status.replace('_', ' ') }}
                  </span>
                </td>
                <td class="px-6 py-4 text-navy/60 text-xs">
                  {{ new Date(app.submittedAt).toLocaleDateString() }}
                </td>
                <td class="px-6 py-4 text-right">
                  <span v-if="app.status === 'rejected'" class="text-red-500 font-semibold text-xs bg-red-50 p-1.5 rounded">
                    Code: {{ app.rejectionCode }}
                  </span>
                  <span v-else-if="app.status === 'completed'" class="text-green-600 text-xs bg-green-50 p-1.5 rounded">
                    Approved
                  </span>
                  <span v-else class="text-navy/40 text-xs">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Client Submission Drawer / Modal -->
    <div v-if="showFormModal" class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4 overflow-y-auto">
      <AppCard class="max-w-xl w-full p-6 space-y-4">
        <div class="flex justify-between items-center border-b border-muted pb-3">
          <h3 class="text-lg font-bold text-navy">Submit Client Visa Application</h3>
          <button @click="showFormModal = false" class="text-navy/50 hover:text-navy text-xl">&times;</button>
        </div>

        <form @submit.prevent="handleAddApplication" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppInput v-model="clientName" label="Client Full Name" placeholder="John Doe" required />
            <AppInput v-model="clientEmail" label="Client Email Address" type="email" placeholder="john@example.com" required />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold text-navy/70 uppercase">Passport Nationality</label>
              <select v-model="passportCountry" required class="w-full bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-sm font-medium outline-none transition-colors">
                <option value="" disabled selected>Select</option>
                <option v-for="c in countries" :key="c.iso2" :value="c.iso2">{{ c.flag }} {{ c.name }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-navy/70 uppercase">Destination</label>
              <select v-model="destinationCountry" required class="w-full bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-sm font-medium outline-none transition-colors">
                <option value="" disabled selected>Select</option>
                <option v-for="c in countries" :key="c.iso2" :value="c.iso2">{{ c.flag }} {{ c.name }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-navy/70 uppercase">Visa Category</label>
              <select v-model="visaType" required class="w-full bg-white border border-muted hover:border-navy/20 rounded-control p-2.5 text-sm font-medium outline-none transition-colors">
                <option value="e-visa">E-Visa</option>
                <option value="tourist">Tourist Visa</option>
                <option value="business">Business Visa</option>
                <option value="student">Student Visa</option>
              </select>
            </div>
          </div>

          <!-- Document Upload Simulations -->
          <div class="space-y-2">
            <span class="text-xs font-bold text-navy/70 uppercase">Consulate Required Attachments</span>
            <div class="grid grid-cols-3 gap-3">
              <button type="button" @click="triggerFileMock('Passport')" class="p-3 border border-dashed rounded-control text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors"
                :class="simulatedFiles.includes('Passport') ? 'bg-green-50 border-green-500 text-green-600' : 'border-muted hover:border-navy/35 text-navy/60'">
                <span>📄</span>
                <span>Passport Scans</span>
              </button>
              <button type="button" @click="triggerFileMock('Photo')" class="p-3 border border-dashed rounded-control text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors"
                :class="simulatedFiles.includes('Photo') ? 'bg-green-50 border-green-500 text-green-600' : 'border-muted hover:border-navy/35 text-navy/60'">
                <span>📷</span>
                <span>Photo Portrait</span>
              </button>
              <button type="button" @click="triggerFileMock('Itinerary')" class="p-3 border border-dashed rounded-control text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors"
                :class="simulatedFiles.includes('Itinerary') ? 'bg-green-50 border-green-500 text-green-600' : 'border-muted hover:border-navy/35 text-navy/60'">
                <span>✈️</span>
                <span>Flight Details</span>
              </button>
            </div>
            <div v-if="simulatedFiles.length > 0" class="text-xxs text-navy/55 flex flex-wrap gap-1.5 mt-1.5">
              <span v-for="file in simulatedFiles" :key="file" class="bg-muted px-2 py-0.5 rounded font-medium">{{ file }} Attached ✓</span>
            </div>
          </div>

          <div v-if="fileError" class="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-200">
            {{ fileError }}
          </div>

          <div class="flex justify-end gap-3 pt-3">
            <AppButton variant="outline" type="button" @click="showFormModal = false">Cancel</AppButton>
            <AppButton variant="primary" type="submit" class="bg-accent-orange text-navy font-bold hover:bg-accent-orange/90" :loading="submitting">
              Submit Record
            </AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  </div>
</template>
