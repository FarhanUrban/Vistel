import { useOnboardingStore } from '@/features/onboarding/store'
import { useDocumentsStore } from '@/features/documents/store'
import { usePaymentsStore } from '@/features/payments/store'
import { useDashboardStore } from '@/features/dashboard/store'
import { wipeAllVisletLocalData } from '@/services/localDocumentStorage'

export function resetAllPiniaStores(): void {
  useOnboardingStore().reset()
  useDocumentsStore().reset()
  usePaymentsStore().reset()
  useDashboardStore().reset()
}

export function wipeAllAppData(): void {
  wipeAllVisletLocalData()
  resetAllPiniaStores()
}
