import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RejectionReason, VisaApplication } from '@/types'
import * as visaService from '@/services/visaService'
import { mockGetRejectionReasonByCode } from '@/services/mocks/rejectionsMocks'
import { useAuthStore } from '@/features/auth/store'
import { loadRejectionCodes, saveRejectionCodes } from '@/services/platformStorage'

export const useRejectionsStore = defineStore('rejections', () => {
  const possibleReasons = ref<RejectionReason[]>([])
  const currentApplication = ref<VisaApplication | null>(null)
  const rejectionReason = ref<RejectionReason | null>(null)
  const isLoading = ref(false)
  const isPolling = ref(false)
  const error = ref<string | null>(null)

  function loadPossibleReasons() {
    possibleReasons.value = loadRejectionCodes()
  }

  function addRejectionCode(reason: RejectionReason) {
    const codes = loadRejectionCodes()
    if (codes.some((c) => c.code === reason.code)) {
      throw new Error('A rejection code with this identifier already exists')
    }
    codes.push(reason)
    saveRejectionCodes(codes)
    possibleReasons.value = codes
  }

  function getReasonByCode(code: string): RejectionReason | undefined {
    return (
      possibleReasons.value.find((r) => r.code === code) ??
      loadRejectionCodes().find((r) => r.code === code) ??
      mockGetRejectionReasonByCode(code)
    )
  }

  async function loadRejectedApplication(applicationId?: string | null) {
    const auth = useAuthStore()
    const userId = auth.user?.id ?? 'mock-user-1'

    isLoading.value = true
    error.value = null
    try {
      const apps = await visaService.getApplications(userId)
      const rejected = applicationId
        ? apps.find((a) => a.id === applicationId && a.status === 'rejected') ?? null
        : apps
            .filter((a) => a.status === 'rejected')
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null
      currentApplication.value = rejected
      if (rejected?.rejectionCode) {
        rejectionReason.value = getReasonByCode(rejected.rejectionCode) ?? null
      } else if (rejected?.rejectionOther) {
        rejectionReason.value = {
          code: 'OTHER',
          title: 'Custom rejection reason',
          description: rejected.rejectionOther,
        }
      } else {
        rejectionReason.value = null
      }
      if (applicationId && !rejected) {
        error.value = 'That rejected application was not found.'
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
    addRejectionCode,
    getReasonByCode,
    loadRejectedApplication,
    pollStatus,
  }
})
