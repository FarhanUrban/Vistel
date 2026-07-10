import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OnboardingData } from '@/types'

const STORAGE_KEY = 'vislet_onboarding'

function loadFromStorage(): OnboardingData {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    return JSON.parse(stored) as OnboardingData
  }
  return {
    visaType: null,
    passportType: null,
    hasAdditionalDocs: null,
    destinationCountry: null,
  }
}

function saveToStorage(data: OnboardingData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const visaType = ref(loadFromStorage().visaType)
  const passportType = ref(loadFromStorage().passportType)
  const hasAdditionalDocs = ref(loadFromStorage().hasAdditionalDocs)
  const destinationCountry = ref(loadFromStorage().destinationCountry)

  function persist() {
    saveToStorage({
      visaType: visaType.value,
      passportType: passportType.value,
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

  function setHasAdditionalDocs(value: boolean) {
    hasAdditionalDocs.value = value
    persist()
  }

  function setDestinationCountry(value: string) {
    destinationCountry.value = value
    persist()
  }

  function isComplete(): boolean {
    return (
      visaType.value !== null &&
      passportType.value !== null &&
      hasAdditionalDocs.value !== null &&
      destinationCountry.value !== null
    )
  }

  function reset() {
    visaType.value = null
    passportType.value = null
    hasAdditionalDocs.value = null
    destinationCountry.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    visaType,
    passportType,
    hasAdditionalDocs,
    destinationCountry,
    setVisaType,
    setPassportType,
    setHasAdditionalDocs,
    setDestinationCountry,
    isComplete,
    reset,
  }
})
