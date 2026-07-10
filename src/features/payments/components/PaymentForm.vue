<script setup lang="ts">
import { onMounted } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import { PAYMENT_METHODS } from '@/features/payments/types'
import { usePaymentsStore } from '@/features/payments/store'

const paymentsStore = usePaymentsStore()

const emit = defineEmits<{
  success: []
}>()

onMounted(() => {
  paymentsStore.loadFees()
})

async function handlePay() {
  await paymentsStore.processPayment()
  if (paymentsStore.status === 'success') {
    emit('success')
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2">Pay for your E-Visa</h1>
    <p class="text-gray-500 mb-6">Review the fee breakdown and select a payment method.</p>

    <AppErrorMessage v-if="paymentsStore.error" :message="paymentsStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="paymentsStore.isLoading" />

    <AppCard v-if="paymentsStore.feeBreakdown" class="mb-6">
      <h2 class="font-medium text-navy mb-4">Fee breakdown</h2>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Visa fee</span>
          <span class="text-navy">${{ paymentsStore.feeBreakdown.visaFee.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Service fee</span>
          <span class="text-navy">${{ paymentsStore.feeBreakdown.serviceFee.toFixed(2) }}</span>
        </div>
        <div class="border-t border-gray-200 pt-2 flex justify-between font-semibold">
          <span class="text-navy">Total</span>
          <span class="text-navy">${{ paymentsStore.feeBreakdown.total.toFixed(2) }}</span>
        </div>
      </div>
    </AppCard>

    <h2 class="font-medium text-navy mb-3">Payment method</h2>
    <div class="space-y-2 mb-6">
      <button
        v-for="method in PAYMENT_METHODS"
        :key="method.id"
        type="button"
        class="w-full flex items-center gap-3 p-4 rounded-card border-2 transition-colors text-left"
        :class="
          paymentsStore.selectedMethod === method.id
            ? 'border-accent-blue bg-accent-blue/10'
            : 'border-gray-200 bg-white'
        "
        @click="paymentsStore.selectMethod(method.id)"
      >
        <span class="text-xl">{{ method.icon }}</span>
        <span class="font-medium text-navy">{{ method.label }}</span>
      </button>
    </div>

    <AppButton
      full-width
      :loading="paymentsStore.status === 'processing'"
      @click="handlePay"
    >
      Pay Now
    </AppButton>
  </div>
</template>
