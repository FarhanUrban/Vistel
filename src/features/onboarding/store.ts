import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OnboardingData } from '@/types'
import { normalizeCountryCode } from '@/services/visaIndexService'

const STORAGE_KEY = 'vislet_onboarding'

function loadFromStorage(): OnboardingData {
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
  return {
    visaType: null,
    passportType: null,
    passportCountry: null,
    hasAdditionalDocs: null,
    destinationCountry: null,
  }
}

function saveToStorage(data: OnboardingData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const initial = loadFromStorage()
  const visaType = ref(initial.visaType)
  const passportType = ref(initial.passportType)
  const passportCountry = ref(initial.passportCountry)
  const hasAdditionalDocs = ref(initial.hasAdditionalDocs)
  const destinationCountry = ref(initial.destinationCountry)

  function persist() {
    saveToStorage({
      visaType: visaType.value,
      passportType: passportType.value,
      passportCountry: passportCountry.value,
      hasAdditionalDocs: hasAdditionalDocs.value,
      destinationCountry: destinationCountry.value,
    })
  }

  function setVisaType(value: OnboardingData['visaType']) {
    visaType.value = value
    persist()
  }

  function setPassportType(value: OnboardingData['passportType']) {
    passportType.value = value
    persist()
  }

  function setPassportCountry(value: string) {
    passportCountry.value = value.toUpperCase()
    persist()
  }

  function setHasAdditionalDocs(value: boolean) {
    hasAdditionalDocs.value = value
    persist()
  }

  function setDestinationCountry(value: string) {
    destinationCountry.value = value.toUpperCase()
    persist()
  }

  function isComplete(): boolean {
    return (
      visaType.value !== null &&
      passportType.value !== null &&
      passportCountry.value !== null &&
      hasAdditionalDocs.value !== null &&
      destinationCountry.value !== null
    )
  }

  function reset() {
    visaType.value = null
    passportType.value = null
    passportCountry.value = null
    hasAdditionalDocs.value = null
    destinationCountry.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    visaType,
    passportType,
    passportCountry,
    hasAdditionalDocs,
    destinationCountry,
    setVisaType,
    setPassportType,
    setPassportCountry,
    setHasAdditionalDocs,
    setDestinationCountry,
    isComplete,
    reset,
  }
})
