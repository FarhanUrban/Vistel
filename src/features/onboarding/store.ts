import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { OnboardingData, OnboardingDraft, PassportType, VisaType } from '@/types'
import { normalizeCountryCode } from '@/services/visaIndexService'

const STORAGE_KEY = 'vislet_onboarding'
const DRAFTS_KEY = 'vislet_onboarding_drafts'

function emptyData(): OnboardingData {
  return {
    visaType: null,
    passportType: null,
    passportCountry: null,
    hasAdditionalDocs: null,
    destinationCountry: null,
  }
}

function loadActiveFromStorage(): OnboardingData {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored) as Partial<OnboardingData>
    return {
      visaType: parsed.visaType ?? null,
      passportType: parsed.passportType ?? null,
      passportCountry: normalizeCountryCode(parsed.passportCountry ?? null),
      hasAdditionalDocs: parsed.hasAdditionalDocs ?? null,
      destinationCountry: normalizeCountryCode(parsed.destinationCountry ?? null),
    }
  }
  return emptyData()
}

function loadDraftsFromStorage(): OnboardingDraft[] {
  const stored = localStorage.getItem(DRAFTS_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored) as OnboardingDraft[]
    return parsed.map((d) => ({
      ...d,
      passportCountry: normalizeCountryCode(d.passportCountry),
      destinationCountry: normalizeCountryCode(d.destinationCountry),
    }))
  } catch {
    return []
  }
}

function draftKey(destinationCountry: string, visaType: VisaType): string {
  return `${destinationCountry.toUpperCase()}::${visaType}`
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const initial = loadActiveFromStorage()
  const visaType = ref(initial.visaType)
  const passportType = ref(initial.passportType)
  const passportCountry = ref(initial.passportCountry)
  const hasAdditionalDocs = ref(initial.hasAdditionalDocs)
  const destinationCountry = ref(initial.destinationCountry)
  const drafts = ref<OnboardingDraft[]>(loadDraftsFromStorage())
  const activeDraftId = ref<string | null>(null)

  function persistActive() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        visaType: visaType.value,
        passportType: passportType.value,
        passportCountry: passportCountry.value,
        hasAdditionalDocs: hasAdditionalDocs.value,
        destinationCountry: destinationCountry.value,
      }),
    )
  }

  function persistDrafts() {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.value))
  }

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
    persistDrafts()
  }

  function setVisaType(value: VisaType | null) {
    visaType.value = value
    persistActive()
    syncActiveDraft()
  }

  function setPassportType(value: PassportType | null) {
    passportType.value = value
    persistActive()
    syncActiveDraft()
  }

  function setPassportCountry(value: string) {
    passportCountry.value = value.toUpperCase()
    persistActive()
    syncActiveDraft()
  }

  function clearPassportCountry() {
    passportCountry.value = null
    persistActive()
    syncActiveDraft()
  }

  function setHasAdditionalDocs(value: boolean) {
    hasAdditionalDocs.value = value
    persistActive()
    syncActiveDraft()
  }

  function setDestinationCountry(value: string) {
    destinationCountry.value = value.toUpperCase()
    persistActive()
    syncActiveDraft()
  }

  /** Switch active context without wiping other drafts. */
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
      // Keep passport fields from current session when opening submitted apps
      activeDraftId.value = id
      syncActiveDraft()
    }
    persistActive()
  }

  function startNewVisa() {
    // Keep existing drafts; clear active slot for a fresh flow
    visaType.value = null
    passportType.value = null
    passportCountry.value = null
    hasAdditionalDocs.value = null
    destinationCountry.value = null
    activeDraftId.value = null
    persistActive()
  }

  function removeDraft(destination: string, type: VisaType) {
    const id = draftKey(destination, type)
    drafts.value = drafts.value.filter((d) => d.id !== id)
    if (activeDraftId.value === id) activeDraftId.value = null
    persistDrafts()
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
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(DRAFTS_KEY)
  }

  // Migrate legacy single onboarding into drafts once
  if (initial.visaType && initial.destinationCountry && drafts.value.length === 0) {
    syncActiveDraft()
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
