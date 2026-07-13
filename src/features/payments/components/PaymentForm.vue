<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import { PAYMENT_METHODS } from '@/features/payments/types'
import { usePaymentsStore } from '@/features/payments/store'
import { useAuthStore } from '@/features/auth/store'
import { getCountryName } from '@/services/visaIndexService'
import * as visaService from '@/services/visaService'
import type { VisaApplication } from '@/types'

const route = useRoute()
const router = useRouter()
const paymentsStore = usePaymentsStore()
const authStore = useAuthStore()

const emit = defineEmits<{
  success: []
}>()

const awaitingPaymentApps = ref<VisaApplication[]>([])
const loadingApps = ref(false)

const selectedApplicationId = computed(() => {
  const id = route.query.applicationId
  return typeof id === 'string' && id.length > 0 ? id : null
})

const canPay = computed(
  () =>
    selectedApplicationId.value &&
    paymentsStore.checkoutApplication &&
    paymentsStore.feeBreakdown &&
    paymentsStore.status !== 'processing',
)

const showApplicationPicker = computed(
  () => awaitingPaymentApps.value.length > 1 && !selectedApplicationId.value,
)

async function loadAwaitingPaymentApps() {
  if (!authStore.user?.id) {
    awaitingPaymentApps.value = []
    return
  }

  loadingApps.value = true
  try {
    const apps = await visaService.getApplications(authStore.user.id)
    awaitingPaymentApps.value = apps.filter((app) => app.status === 'awaiting_payment')
  } finally {
    loadingApps.value = false
  }
}

function loadFromRoute() {
  paymentsStore.clearCart()
  const id = selectedApplicationId.value
  if (id) {
    paymentsStore.loadFeesForApplication(id)
  }
}

function selectApplication(id: string) {
  router.replace({ name: 'Payment', query: { applicationId: id } })
}

function formatVisaType(visaType: string): string {
  return visaType.replace('-', ' ')
}

onMounted(async () => {
  await loadAwaitingPaymentApps()
  if (!selectedApplicationId.value && awaitingPaymentApps.value.length === 1) {
    selectApplication(awaitingPaymentApps.value[0].id)
    return
  }
  loadFromRoute()
})

watch(() => route.query.applicationId, loadFromRoute)

async function handlePay() {
  await paymentsStore.processPayment()
  if (paymentsStore.status === 'success') {
    emit('success')
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2">Payment</h1>

    <AppErrorMessage v-if="paymentsStore.error" :message="paymentsStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="loadingApps || paymentsStore.isLoading" />

    <template v-else>
      <p v-if="!selectedApplicationId && awaitingPaymentApps.length === 0" class="text-gray-500 mb-6">
        Your cart is empty. Complete document submission and get approved to pay.
      </p>
      <p v-else-if="showApplicationPicker" class="text-gray-500 mb-6">
        Select which visa you want to pay for.
      </p>
      <p v-else-if="paymentsStore.checkoutApplication" class="text-gray-500 mb-6">
        Review the fee breakdown and select a payment method.
      </p>

      <AppCard v-if="!selectedApplicationId && awaitingPaymentApps.length === 0" class="mb-6">
        <p class="text-sm text-gray-500">
          Once your application is approved on the dashboard, you can pay from there.
        </p>
      </AppCard>

      <section v-if="showApplicationPicker" class="mb-6">
        <h2 class="font-medium text-navy mb-3">Select a visa to pay for</h2>
        <div class="space-y-3">
          <AppCard
            v-for="app in awaitingPaymentApps"
            :key="app.id"
            padding="sm"
            class="cursor-pointer hover:border-accent-blue/40 transition-colors"
            @click="selectApplication(app.id)"
          >
            <p class="font-medium text-navy">{{ getCountryName(app.destinationCountry) }}</p>
            <p class="text-sm text-gray-500 capitalize">{{ formatVisaType(app.visaType) }} visa</p>
          </AppCard>
        </div>
      </section>

      <AppCard v-else-if="paymentsStore.checkoutApplication" class="mb-6">
        <h2 class="font-medium text-navy mb-1">You are paying for</h2>
        <p class="text-xl text-navy mb-1">
          {{ getCountryName(paymentsStore.checkoutApplication.destinationCountry) }}
        </p>
        <p class="text-sm text-gray-500 capitalize mb-4">
          {{ formatVisaType(paymentsStore.checkoutApplication.visaType) }} visa
        </p>

        <div
          v-if="awaitingPaymentApps.length > 1"
          class="mb-4 pb-4 border-b border-gray-200"
        >
          <button
            type="button"
            class="text-sm text-accent-blue hover:underline"
            @click="router.replace({ name: 'Payment' })"
          >
            Choose a different visa
          </button>
        </div>

        <template v-if="paymentsStore.feeBreakdown">
          <h3 class="font-medium text-navy mb-4">Fee breakdown</h3>
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
        </template>
      </AppCard>

      <template v-if="canPay">
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
          :disabled="!canPay"
          :loading="paymentsStore.status === 'processing'"
          @click="handlePay"
        >
          Pay Now
        </AppButton>
      </template>
    </template>
  </div>
</template>
