import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { OnboardingData, OnboardingDraft, PassportType, VisaType } from '@/types'

function emptyData(): OnboardingData {
  return {
    visaType: null,
    passportType: null,
    passportCountry: null,
    hasAdditionalDocs: null,
    destinationCountry: null,
  }
}

function draftKey(destinationCountry: string, visaType: VisaType): string {
  return `${destinationCountry.toUpperCase()}::${visaType}`
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const initial = emptyData()
  const visaType = ref(initial.visaType)
  const passportType = ref(initial.passportType)
  const passportCountry = ref(initial.passportCountry)
  const hasAdditionalDocs = ref(initial.hasAdditionalDocs)
  const destinationCountry = ref(initial.destinationCountry)
  const drafts = ref<OnboardingDraft[]>([])
  const activeDraftId = ref<string | null>(null)

  function syncActiveDraft() {
    if (!visaType.value || !destinationCountry.value) return

    const id = draftKey(destinationCountry.value, visaType.value)
    const existing = drafts.value.findIndex((d) => d.id === id)
    const next: OnboardingDraft = {
      id,
      visaType: visaType.value,
      passportType: passportType.value,
      passportCountry: passportCountry.value,
      hasAdditionalDocs: hasAdditionalDocs.value,
      destinationCountry: destinationCountry.value,
      updatedAt: new Date().toISOString(),
    }

    if (existing >= 0) {
      drafts.value[existing] = next
    } else {
      drafts.value = [...drafts.value, next]
    }
    activeDraftId.value = id
  }

  function setVisaType(value: VisaType | null) {
    visaType.value = value
    syncActiveDraft()
  }

  function setPassportType(value: PassportType | null) {
    passportType.value = value
    syncActiveDraft()
  }

  function setPassportCountry(value: string) {
    passportCountry.value = value.toUpperCase()
    syncActiveDraft()
  }

  function clearPassportCountry() {
    passportCountry.value = null
    syncActiveDraft()
  }

  function setHasAdditionalDocs(value: boolean) {
    hasAdditionalDocs.value = value
    syncActiveDraft()
  }

  function setDestinationCountry(value: string) {
    destinationCountry.value = value.toUpperCase()
    syncActiveDraft()
  }

  function activateContext(destination: string, type: VisaType) {
    const id = draftKey(destination, type)
    const draft = drafts.value.find((d) => d.id === id)
    destinationCountry.value = destination.toUpperCase()
    visaType.value = type
    if (draft) {
      passportType.value = draft.passportType
      passportCountry.value = draft.passportCountry
      hasAdditionalDocs.value = draft.hasAdditionalDocs
      activeDraftId.value = draft.id
    } else {
      activeDraftId.value = id
      syncActiveDraft()
    }
  }

  function startNewVisa() {
    visaType.value = null
    passportType.value = null
    passportCountry.value = null
    hasAdditionalDocs.value = null
    destinationCountry.value = null
    activeDraftId.value = null
  }

  function removeDraft(destination: string, type: VisaType) {
    const id = draftKey(destination, type)
    drafts.value = drafts.value.filter((d) => d.id !== id)
    if (activeDraftId.value === id) activeDraftId.value = null
  }

  function isComplete(): boolean {
    return (
      visaType.value !== null &&
      passportType.value !== null &&
      passportCountry.value !== null &&
      destinationCountry.value !== null
    )
  }

  function hasVisaSelection(): boolean {
    return visaType.value !== null && destinationCountry.value !== null
  }

  const incompleteDrafts = computed(() =>
    drafts.value.filter((d) => d.visaType && d.destinationCountry),
  )

  function getResumeRouteName():
    | 'OnboardingVisaType'
    | 'OnboardingPassportType'
    | 'OnboardingPassportCountry'
    | 'OnboardingDestination'
    | 'RequiredDocuments' {
    if (!visaType.value) return 'OnboardingVisaType'
    if (!passportType.value) return 'OnboardingPassportType'
    if (!passportCountry.value) return 'OnboardingPassportCountry'
    if (!destinationCountry.value) return 'OnboardingDestination'
    return 'RequiredDocuments'
  }

  function reset() {
    visaType.value = null
    passportType.value = null
    passportCountry.value = null
    hasAdditionalDocs.value = null
    destinationCountry.value = null
    drafts.value = []
    activeDraftId.value = null
  }

  return {
    visaType,
    passportType,
    passportCountry,
    hasAdditionalDocs,
    destinationCountry,
    drafts,
    activeDraftId,
    incompleteDrafts,
    setVisaType,
    setPassportType,
    setPassportCountry,
    clearPassportCountry,
    setHasAdditionalDocs,
    setDestinationCountry,
    activateContext,
    startNewVisa,
    removeDraft,
    isComplete,
    hasVisaSelection,
    getResumeRouteName,
    reset,
  }
})
