import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RequiredDocument, UploadedDocument } from '@/types'
import * as documentsService from '@/services/documentsService'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useAuthStore } from '@/features/auth/store'

export const useDocumentsStore = defineStore('documents', () => {
  const requiredDocuments = ref<RequiredDocument[]>([])
  const uploadedDocuments = ref<UploadedDocument[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)
  const isSubmitted = ref(false)

  async function loadRequiredDocuments() {
    const onboarding = useOnboardingStore()
    if (!onboarding.visaType || !onboarding.destinationCountry) {
      error.value = 'Please complete onboarding first'
      return
    }

    isLoading.value = true
    error.value = null
    try {
      requiredDocuments.value = await documentsService.getRequiredDocuments(
        onboarding.destinationCountry,
        onboarding.visaType,
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load required documents'
    } finally {
      isLoading.value = false
    }
  }

  async function uploadDocument(file: File) {
    const auth = useAuthStore()
    const userId = auth.user?.id ?? 'anonymous'

    isLoading.value = true
    error.value = null
    try {
      const uploaded = await documentsService.uploadDocument(file, userId)
      uploadedDocuments.value.push(uploaded)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Upload failed'
    } finally {
      isLoading.value = false
    }
  }

  async function submitApplication() {
    isSubmitting.value = true
    error.value = null
    try {
      const applicationId = `app-${Date.now()}`
      await documentsService.submitApplication(applicationId)
      isSubmitted.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Submission failed'
    } finally {
      isSubmitting.value = false
    }
  }

  function allRequiredUploaded(): boolean {
    const required = requiredDocuments.value.filter((d) => d.required)
    return required.every((req) =>
      uploadedDocuments.value.some((up) => up.name.toLowerCase().includes(req.id)),
    )
  }

  return {
    requiredDocuments,
    uploadedDocuments,
    isLoading,
    isSubmitting,
    error,
    isSubmitted,
    loadRequiredDocuments,
    uploadDocument,
    submitApplication,
    allRequiredUploaded,
  }
})
