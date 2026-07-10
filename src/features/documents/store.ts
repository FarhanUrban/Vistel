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

  async function uploadDocument(file: File, documentTypeId?: string) {
    const auth = useAuthStore()
    if (!auth.user?.id) {
      error.value = 'You must be logged in to upload documents'
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const uploaded = await documentsService.uploadDocument(file, auth.user.id, documentTypeId)
      uploadedDocuments.value = [
        ...uploadedDocuments.value.filter((doc) => doc.documentTypeId !== documentTypeId),
        uploaded,
      ]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Upload failed'
    } finally {
      isLoading.value = false
    }
  }

  function isDocumentUploaded(documentTypeId: string): boolean {
    return uploadedDocuments.value.some((doc) => doc.documentTypeId === documentTypeId)
  }

  async function submitApplication() {
    const auth = useAuthStore()
    const onboarding = useOnboardingStore()

    if (!auth.user?.id) {
      error.value = 'You must be logged in to submit an application'
      return
    }
    if (!onboarding.visaType || !onboarding.destinationCountry) {
      error.value = 'Please complete onboarding first'
      return
    }
    if (!allRequiredUploaded()) {
      error.value = 'Please upload all required documents before submitting'
      return
    }

    isSubmitting.value = true
    error.value = null
    try {
      await documentsService.submitApplication({
        userId: auth.user.id,
        destinationCountry: onboarding.destinationCountry,
        visaType: onboarding.visaType,
        documents: uploadedDocuments.value,
      })
      isSubmitted.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Submission failed'
    } finally {
      isSubmitting.value = false
    }
  }

  function allRequiredUploaded(): boolean {
    const required = requiredDocuments.value.filter((d) => d.required)
    return required.every((req) => isDocumentUploaded(req.id))
  }

  function reset() {
    requiredDocuments.value = []
    uploadedDocuments.value = []
    isLoading.value = false
    isSubmitting.value = false
    error.value = null
    isSubmitted.value = false
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
    isDocumentUploaded,
    reset,
  }
})
