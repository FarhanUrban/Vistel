<script setup lang="ts">
import { onMounted } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import { useDashboardStore } from '@/features/dashboard/store'
import { getCountryName } from '@/services/visaIndexService'

const dashboardStore = useDashboardStore()

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
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-6 lg:text-3xl">Dashboard</h1>

    <AppErrorMessage v-if="dashboardStore.error" :message="dashboardStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="dashboardStore.isLoading" />

    <template v-else>
      <section class="mb-8">
        <h2 class="text-lg font-medium text-navy mb-3">Waiting on E-Visa</h2>
        <div v-if="dashboardStore.waitingApplications.length === 0" class="text-gray-500 text-sm">
          No pending applications.
        </div>
        <div v-else class="space-y-3">
          <AppCard v-for="app in dashboardStore.waitingApplications" :key="app.id" padding="sm">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-navy">{{ getCountryName(app.destinationCountry) }}</p>
                <p class="text-sm text-gray-500 capitalize">{{ app.visaType.replace('-', ' ') }}</p>
              </div>
              <span class="text-xs font-medium px-2 py-1 rounded bg-accent-orange/20 text-navy">
                Pending
              </span>
            </div>
            <p class="text-xs text-gray-400 mt-2">Submitted {{ formatDate(app.submittedAt) }}</p>
          </AppCard>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-lg font-medium text-navy mb-3">Upcoming Interviews</h2>
        <div v-if="dashboardStore.upcomingInterviews.length === 0" class="text-gray-500 text-sm">
          No upcoming interviews.
        </div>
        <div v-else class="space-y-3">
          <AppCard v-for="interview in dashboardStore.upcomingInterviews" :key="interview.id" padding="sm">
            <p class="font-medium text-navy">{{ interview.location }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ formatDate(interview.scheduledAt) }}</p>
            <p class="text-xs text-gray-400 mt-1 capitalize">
              Scheduled by {{ interview.scheduledBy }}
            </p>
            <p v-if="interview.notes" class="text-xs text-gray-500 mt-2">{{ interview.notes }}</p>
          </AppCard>
        </div>
      </section>

      <section>
        <h2 class="text-lg font-medium text-navy mb-3">Completed E-Visas</h2>
        <div v-if="dashboardStore.completedApplications.length === 0" class="text-gray-500 text-sm">
          No completed applications yet.
        </div>
        <div v-else class="space-y-3">
          <AppCard v-for="app in dashboardStore.completedApplications" :key="app.id" padding="sm">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-navy">{{ getCountryName(app.destinationCountry) }}</p>
                <p class="text-sm text-gray-500 capitalize">{{ app.visaType.replace('-', ' ') }}</p>
              </div>
              <span class="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                Approved
              </span>
            </div>
          </AppCard>
        </div>
      </section>

      <div v-if="dashboardStore.rejectedApplications.length > 0" class="mt-6">
        <RouterLink to="/rejections/why-rejected">
          <AppButton variant="outline" full-width>View Rejected Application</AppButton>
        </RouterLink>
      </div>
    </template>
  </div>
</template>
