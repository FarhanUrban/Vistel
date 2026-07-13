import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Interview, VisaApplication } from '@/types'
import * as visaService from '@/services/visaService'
import * as interviewsService from '@/services/interviewsService'
import { useAuthStore } from '@/features/auth/store'

function isExpired(app: VisaApplication): boolean {
  if (!app.expiresAt) return false
  return new Date(app.expiresAt).getTime() < Date.now()
}

export const useDashboardStore = defineStore('dashboard', () => {
  const applications = ref<VisaApplication[]>([])
  const interviews = ref<Interview[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const reviewingApplications = computed(() =>
    applications.value.filter((a) => a.status === 'submitted' || a.status === 'reviewing'),
  )

  const awaitingPaymentApplications = computed(() =>
    applications.value.filter(
      (a) => a.status === 'awaiting_payment' || a.status === 'payment_processing',
    ),
  )

  const completedApplications = computed(() =>
    applications.value.filter((a) => a.status === 'completed' && !isExpired(a)),
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
    if (!auth.user?.id) {
      applications.value = []
      interviews.value = []
      return
    }
    const userId = auth.user.id

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

  async function scheduleInterview(interview: Omit<Interview, 'id'>) {
    const auth = useAuthStore()
    if (!auth.user?.id) {
      error.value = 'You must be logged in to schedule an interview'
      return null
    }
    try {
      const created = await interviewsService.addInterview(auth.user.id, interview)
      interviews.value = [...interviews.value, created]
      return created
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to schedule interview'
      return null
    }
  }

  function reset() {
    applications.value = []
    interviews.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    applications,
    interviews,
    isLoading,
    error,
    reviewingApplications,
    awaitingPaymentApplications,
    completedApplications,
    rejectedApplications,
    upcomingInterviews,
    loadDashboard,
    scheduleInterview,
    reset,
  }
})
