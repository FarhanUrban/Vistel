import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Interview, VisaApplication } from '@/types'
import * as visaService from '@/services/visaService'
import * as interviewsService from '@/services/interviewsService'
import { useAuthStore } from '@/features/auth/store'

export const useDashboardStore = defineStore('dashboard', () => {
  const applications = ref<VisaApplication[]>([])
  const interviews = ref<Interview[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const waitingApplications = computed(() =>
    applications.value.filter((a) => a.status === 'pending' || a.status === 'submitted'),
  )

  const completedApplications = computed(() =>
    applications.value.filter((a) => a.status === 'approved'),
  )

  const rejectedApplications = computed(() =>
    applications.value.filter((a) => a.status === 'rejected'),
  )

  const upcomingInterviews = computed(() => {
    const now = new Date()
    return interviews.value
      .filter((i) => new Date(i.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  })

  async function loadDashboard() {
    const auth = useAuthStore()
    const userId = auth.user?.id ?? 'mock-user-1'

    isLoading.value = true
    error.value = null
    try {
      const [apps, ints] = await Promise.all([
        visaService.getApplications(userId),
        interviewsService.getInterviews(userId),
      ])
      applications.value = apps
      interviews.value = ints
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load dashboard'
    } finally {
      isLoading.value = false
    }
  }

  return {
    applications,
    interviews,
    isLoading,
    error,
    waitingApplications,
    completedApplications,
    rejectedApplications,
    upcomingInterviews,
    loadDashboard,
  }
})
