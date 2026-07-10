import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RejectionReason, VisaApplication } from '@/types'
import * as visaService from '@/services/visaService'
import {
  mockGetRejectionReasons,
  mockGetRejectionReasonByCode,
} from '@/services/mocks/rejectionsMocks'
import { useAuthStore } from '@/features/auth/store'

export const useRejectionsStore = defineStore('rejections', () => {
  const possibleReasons = ref<RejectionReason[]>([])
  const currentApplication = ref<VisaApplication | null>(null)
  const rejectionReason = ref<RejectionReason | null>(null)
  const isLoading = ref(false)
  const isPolling = ref(false)
  const error = ref<string | null>(null)

  function loadPossibleReasons() {
    possibleReasons.value = mockGetRejectionReasons()
  }

  async function loadRejectedApplication() {
    const auth = useAuthStore()
    const userId = auth.user?.id ?? 'mock-user-1'

    isLoading.value = true
    error.value = null
    try {
      const apps = await visaService.getApplications(userId)
      const rejected = apps.find((a) => a.status === 'rejected')
      currentApplication.value = rejected ?? null
      if (rejected?.rejectionCode) {
        rejectionReason.value = mockGetRejectionReasonByCode(rejected.rejectionCode) ?? null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load rejection details'
    } finally {
      isLoading.value = false
    }
  }

  async function pollStatus(applicationId: string) {
    isPolling.value = true
    error.value = null
    try {
      currentApplication.value = await visaService.pollApplicationStatus(applicationId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to check status'
    } finally {
      isPolling.value = false
    }
  }

  return {
    possibleReasons,
    currentApplication,
    rejectionReason,
    isLoading,
    isPolling,
    error,
    loadPossibleReasons,
    loadRejectedApplication,
    pollStatus,
  }
})
