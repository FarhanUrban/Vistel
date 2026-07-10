import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FeeBreakdown, PaymentStatus } from '@/types'
import * as paymentsService from '@/services/paymentsService'
import { useOnboardingStore } from '@/features/onboarding/store'

export const usePaymentsStore = defineStore('payments', () => {
  const feeBreakdown = ref<FeeBreakdown | null>(null)
  const selectedMethod = ref<string>('card')
  const status = ref<PaymentStatus>('idle')
  const transactionId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadFees() {
    const onboarding = useOnboardingStore()
    if (!onboarding.visaType || !onboarding.destinationCountry) {
      error.value = 'Please complete onboarding first'
      return
    }

    isLoading.value = true
    error.value = null
    try {
      feeBreakdown.value = await paymentsService.calculateFee(
        onboarding.visaType,
        onboarding.destinationCountry,
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to calculate fees'
    } finally {
      isLoading.value = false
    }
  }

  async function processPayment() {
    status.value = 'processing'
    error.value = null
    try {
      const result = await paymentsService.processPayment(selectedMethod.value)
      transactionId.value = result.transactionId
      status.value = 'success'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Payment failed'
      status.value = 'failed'
    }
  }

  function selectMethod(method: string) {
    selectedMethod.value = method
  }

  function reset() {
    status.value = 'idle'
    transactionId.value = null
    error.value = null
  }

  return {
    feeBreakdown,
    selectedMethod,
    status,
    transactionId,
    isLoading,
    error,
    loadFees,
    processPayment,
    selectMethod,
    reset,
  }
})
