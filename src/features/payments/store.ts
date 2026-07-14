import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FeeBreakdown, PaymentStatus, VisaApplication } from '@/types'
import * as paymentsService from '@/services/paymentsService'
import { getApplication, updateApplication } from '@/services/visaService'
import { visaExpiryFromPaidAt } from '@/services/localDocumentStorage'

export const usePaymentsStore = defineStore('payments', () => {
  const feeBreakdown = ref<FeeBreakdown | null>(null)
  const selectedMethod = ref<string>('card')
  const status = ref<PaymentStatus>('idle')
  const transactionId = ref<string | null>(null)
  const applicationId = ref<string | null>(null)
  const checkoutApplication = ref<VisaApplication | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadFeesForApplication(id: string) {
    isLoading.value = true
    error.value = null
    applicationId.value = id

    try {
      const app = await getApplication(id)
      if (!app) {
        error.value = 'Application not found'
        feeBreakdown.value = null
        checkoutApplication.value = null
        return
      }
      if (app.status !== 'awaiting_payment') {
        error.value = 'This application is not ready for payment'
        feeBreakdown.value = null
        checkoutApplication.value = null
        return
      }

      checkoutApplication.value = app
      feeBreakdown.value = await paymentsService.calculateFee(app.visaType, app.destinationCountry)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to calculate fees'
      feeBreakdown.value = null
    } finally {
      isLoading.value = false
    }
  }

  function clearCart() {
    applicationId.value = null
    checkoutApplication.value = null
    feeBreakdown.value = null
    error.value = null
  }

  async function processPayment() {
    if (!applicationId.value) return

    status.value = 'processing'
    error.value = null
    try {
      await updateApplication(applicationId.value, { status: 'payment_processing' })
      const result = await paymentsService.processPayment(selectedMethod.value)
      transactionId.value = result.transactionId
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const paidAt = new Date().toISOString()
      const app = checkoutApplication.value
      await updateApplication(applicationId.value, {
        status: 'completed',
        paidAt,
        expiresAt: app ? visaExpiryFromPaidAt(paidAt, app.visaType) : undefined,
      })
      status.value = 'success'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Payment failed'
      status.value = 'failed'
      if (applicationId.value) {
        await updateApplication(applicationId.value, { status: 'awaiting_payment' }).catch(() => {})
      }
    }
  }

  function selectMethod(method: string) {
    selectedMethod.value = method
  }

  function reset() {
    status.value = 'idle'
    transactionId.value = null
    error.value = null
    applicationId.value = null
    checkoutApplication.value = null
    feeBreakdown.value = null
    isLoading.value = false
  }

  return {
    feeBreakdown,
    selectedMethod,
    status,
    transactionId,
    applicationId,
    checkoutApplication,
    isLoading,
    error,
    loadFeesForApplication,
    clearCart,
    processPayment,
    selectMethod,
    reset,
  }
})
