<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import AppModal from '@/components/AppModal.vue'
import CountryFlag from '@/components/CountryFlag.vue'
import ApplicationStatusBadge from '@/features/dashboard/components/ApplicationStatusBadge.vue'
import ApplicantInbox from '@/features/dashboard/components/ApplicantInbox.vue'
import { useDashboardStore } from '@/features/dashboard/store'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useDocumentsStore } from '@/features/documents/store'
import { getCountryName } from '@/services/visaIndexService'
import type { Interview, OnboardingDraft, VisaApplication, VisaType } from '@/types'

const router = useRouter()
const dashboardStore = useDashboardStore()
const onboardingStore = useOnboardingStore()
const documentsStore = useDocumentsStore()

const selectedCompleted = ref<VisaApplication | null>(null)

const workingOnDrafts = computed(() => {
  return onboardingStore.incompleteDrafts.filter((draft) => {
    if (!draft.destinationCountry || !draft.visaType) return false
    const hasMatchingApplication = dashboardStore.applications.some(
      (app) =>
        app.destinationCountry === draft.destinationCountry &&
        app.visaType === draft.visaType &&
        app.status !== 'rejected',
    )
    return !hasMatchingApplication
  })
})

onMounted(() => {
  dashboardStore.loadDashboard()
})

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatVisaType(visaType: string): string {
  return visaType.replace('-', ' ')
}

function startNewVisa() {
  onboardingStore.startNewVisa()
  documentsStore.resetForNewApplication()
  router.push({ name: 'OnboardingVisaType' })
}

function openDocumentsForCountry(destinationCountry: string, visaType?: VisaType | string | null) {
  if (visaType) {
    onboardingStore.activateContext(destinationCountry, visaType as VisaType)
  } else {
    onboardingStore.setDestinationCountry(destinationCountry)
  }
  router.push({ name: 'RequiredDocuments' })
}

function continueDraft(draft: OnboardingDraft) {
  if (draft.visaType && draft.destinationCountry) {
    onboardingStore.activateContext(draft.destinationCountry, draft.visaType)
  }
  if (onboardingStore.isComplete()) {
    router.push({ name: 'RequiredDocuments' })
    return
  }
  router.push({ name: onboardingStore.getResumeRouteName() })
}

function goToPayment(applicationId: string) {
  router.push({ name: 'Payment', query: { applicationId } })
}

function showCompletedDetail(app: VisaApplication) {
  selectedCompleted.value = app
}

function applicationForInterview(interview: Interview): VisaApplication | undefined {
  return dashboardStore.applications.find((a) => a.id === interview.applicationId)
}

function openInterview(interview: Interview) {
  const app = applicationForInterview(interview)
  if (!app) return
  if (app.status === 'awaiting_payment' || app.status === 'payment_processing') {
    goToPayment(app.id)
    return
  }
  openDocumentsForCountry(app.destinationCountry, app.visaType)
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-semibold text-navy lg:text-3xl">Dashboard</h1>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="outline" @click="router.push({ name: 'DashboardHistory' })">
          History
        </AppButton>
        <AppButton variant="secondary" @click="startNewVisa">Apply for new visa</AppButton>
      </div>
    </div>

    <AppErrorMessage v-if="dashboardStore.error" :message="dashboardStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="dashboardStore.isLoading" />

    <template v-else>
      <ApplicantInbox />

      <section v-if="workingOnDrafts.length > 0" class="mb-8">
        <h2 class="mb-3 text-lg font-medium text-navy">Working on</h2>
        <div class="space-y-3">
          <AppCard
            v-for="draft in workingOnDrafts"
            :key="draft.id"
            padding="sm"
            class="cursor-pointer transition-colors hover:border-accent-orange/60"
            @click="continueDraft(draft)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <CountryFlag :iso2="draft.destinationCountry!" />
                <div>
                  <p class="font-medium text-navy">
                    {{ getCountryName(draft.destinationCountry!) }}
                  </p>
                  <p class="text-sm capitalize text-navy/60">
                    {{ formatVisaType(draft.visaType!) }} visa
                  </p>
                </div>
              </div>
              <span
                class="shrink-0 rounded bg-accent-orange/25 px-2 py-1 text-xs font-medium text-navy"
              >
                In progress
              </span>
            </div>
            <p class="mt-2 text-xs font-medium text-accent-blue">Continue application →</p>
          </AppCard>
        </div>
      </section>

      <section v-if="dashboardStore.reviewingApplications.length > 0" class="mb-8">
        <h2 class="mb-3 text-lg font-medium text-navy">Pending review</h2>
        <p class="mb-3 text-sm text-navy/60">
          Your application is with an authorized reviewer. You will be notified when a decision is
          made.
        </p>
        <div class="space-y-3">
          <AppCard
            v-for="app in dashboardStore.reviewingApplications"
            :key="app.id"
            padding="sm"
            class="cursor-default transition-colors border-l-4 border-amber-400"
            @click="undefined"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <CountryFlag :iso2="app.destinationCountry" />
                <div>
                  <p class="font-medium text-navy">{{ getCountryName(app.destinationCountry) }}</p>
                  <p class="text-sm capitalize text-navy/60">{{ formatVisaType(app.visaType) }}</p>
                </div>
              </div>
              <ApplicationStatusBadge :status="app.status" />
            </div>
            <p class="mt-2 text-xs text-navy/40">Submitted {{ formatDate(app.submittedAt) }}</p>
          </AppCard>
        </div>
      </section>

      <section v-if="dashboardStore.awaitingPaymentApplications.length > 0" class="mb-8">
        <h2 class="mb-3 text-lg font-medium text-navy">Ready to pay</h2>
        <div class="space-y-3">
          <AppCard
            v-for="app in dashboardStore.awaitingPaymentApplications"
            :key="app.id"
            padding="sm"
            class="cursor-pointer transition-colors hover:border-accent-orange/50"
            @click="goToPayment(app.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <CountryFlag :iso2="app.destinationCountry" />
                <div>
                  <p class="font-medium text-navy">{{ getCountryName(app.destinationCountry) }}</p>
                  <p class="text-sm capitalize text-navy/60">{{ formatVisaType(app.visaType) }}</p>
                </div>
              </div>
              <ApplicationStatusBadge :status="app.status" />
            </div>
            <p class="mt-2 text-xs font-medium text-accent-blue">
              {{ app.status === 'payment_processing' ? 'Payment processing…' : 'Tap to pay →' }}
            </p>
          </AppCard>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="mb-3 text-lg font-medium text-navy">Upcoming interviews</h2>
        <div v-if="dashboardStore.upcomingInterviews.length > 0" class="space-y-3">
          <AppCard
            v-for="interview in dashboardStore.upcomingInterviews"
            :key="interview.id"
            padding="sm"
            class="cursor-pointer transition-colors hover:border-accent-blue/40"
            @click="openInterview(interview)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <CountryFlag
                  v-if="applicationForInterview(interview)"
                  :iso2="applicationForInterview(interview)!.destinationCountry"
                />
                <div class="min-w-0">
                  <p class="font-medium text-navy">
                    {{
                      applicationForInterview(interview)
                        ? getCountryName(applicationForInterview(interview)!.destinationCountry)
                        : interview.location
                    }}
                  </p>
                  <p class="mt-0.5 text-sm text-navy/60">{{ interview.location }}</p>
                  <p class="mt-1 text-sm text-navy/60">
                    {{ formatDateTime(interview.scheduledAt) }}
                  </p>
                  <p v-if="interview.notes" class="mt-2 text-xs text-navy/50">
                    {{ interview.notes }}
                  </p>
                </div>
              </div>
              <span
                class="shrink-0 rounded px-2 py-1 text-xs font-medium"
                :class="
                  interview.scheduledBy === 'consulate'
                    ? 'bg-accent-orange/25 text-navy'
                    : 'bg-accent-blue/20 text-navy'
                "
              >
                {{ interview.scheduledBy === 'consulate' ? 'Consulate' : 'You' }}
              </span>
            </div>
          </AppCard>
        </div>
        <AppCard v-else padding="sm" class="border-dashed border-muted">
          <p class="text-sm text-navy/60">
            No upcoming interviews yet. When a consulate schedules one—or you add your own—it will
            show up here.
          </p>
        </AppCard>
      </section>

      <section v-if="dashboardStore.completedApplications.length > 0" class="mb-8">
        <h2 class="mb-3 text-lg font-medium text-navy">Completed visas</h2>
        <div class="space-y-3">
          <AppCard
            v-for="app in dashboardStore.completedApplications"
            :key="app.id"
            padding="sm"
            class="cursor-pointer transition-colors hover:border-accent-blue/40"
            @click="showCompletedDetail(app)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <CountryFlag :iso2="app.destinationCountry" />
                <div>
                  <p class="font-medium text-navy">{{ getCountryName(app.destinationCountry) }}</p>
                  <p class="text-sm capitalize text-navy/60">{{ formatVisaType(app.visaType) }}</p>
                </div>
              </div>
              <ApplicationStatusBadge :status="app.status" />
            </div>
            <p v-if="app.expiresAt" class="mt-2 text-xs font-medium text-accent-blue">
              Valid until {{ formatDate(app.expiresAt) }}
            </p>
            <p v-else-if="app.paidAt" class="mt-2 text-xs text-navy/40">
              Paid {{ formatDate(app.paidAt) }}
            </p>
          </AppCard>
        </div>
      </section>

      <div v-if="dashboardStore.rejectedApplications.length > 0" class="mt-6">
        <RouterLink to="/rejections/why-rejected">
          <AppButton variant="outline" full-width>View rejected applications</AppButton>
        </RouterLink>
      </div>
    </template>

    <AppModal :open="!!selectedCompleted" title="Visa details" @close="selectedCompleted = null">
      <template v-if="selectedCompleted">
        <div class="mb-3 flex items-center gap-3">
          <CountryFlag :iso2="selectedCompleted.destinationCountry" size="lg" />
          <p class="text-2xl font-semibold text-navy">
            {{ getCountryName(selectedCompleted.destinationCountry) }}
          </p>
        </div>
        <p class="mb-4 text-sm capitalize text-navy/60">
          {{ formatVisaType(selectedCompleted.visaType) }} visa
        </p>
        <ApplicationStatusBadge :status="selectedCompleted.status" />
        <p v-if="selectedCompleted.expiresAt" class="mt-4 text-sm font-medium text-accent-blue">
          Valid until {{ formatDate(selectedCompleted.expiresAt) }}
        </p>
        <p v-if="selectedCompleted.paidAt" class="mt-2 text-sm text-navy/60">
          Paid on {{ formatDate(selectedCompleted.paidAt) }}
        </p>
        <p class="mt-2 text-sm text-navy/60">
          Submitted {{ formatDate(selectedCompleted.submittedAt) }}
        </p>
      </template>
    </AppModal>
  </div>
</template>
