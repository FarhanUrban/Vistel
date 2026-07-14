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

const isProcessing = computed(() => paymentsStore.status === 'processing')

async function loadAwaitingPaymentApps() {
  if (!authStore.user?.id) {
    awaitingPaymentApps.value = []
    return
  }

  loadingApps.value = true
  try {
    const apps = await visaService.getApplications(authStore.user.id)
    awaitingPaymentApps.value = apps.filter(
      (app) => app.status === 'awaiting_payment' || app.status === 'payment_processing',
    )
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
    <h1 class="mb-2 text-2xl font-semibold text-navy">Payment</h1>

    <AppErrorMessage v-if="paymentsStore.error" :message="paymentsStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="(loadingApps || paymentsStore.isLoading) && !isProcessing" />

    <AppCard v-if="isProcessing" class="mb-6 text-center">
      <div class="flex flex-col items-center py-10">
        <span
          class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent-blue border-t-accent-orange"
        />
        <p class="text-lg font-semibold text-navy">Processing your payment…</p>
        <p class="mt-2 max-w-sm text-sm text-navy/60">
          Please wait while we confirm your payment. Do not close this page.
        </p>
      </div>
    </AppCard>

    <template v-else-if="!loadingApps && !paymentsStore.isLoading">
      <p
        v-if="!selectedApplicationId && awaitingPaymentApps.length === 0"
        class="mb-6 text-navy/60"
      >
        Your cart is empty. Complete document submission and get approved to pay.
      </p>
      <p v-else-if="showApplicationPicker" class="mb-6 text-navy/60">
        Select which visa you want to pay for.
      </p>
      <p v-else-if="paymentsStore.checkoutApplication" class="mb-6 text-navy/60">
        Review the fee breakdown and select a payment method.
      </p>

      <AppCard v-if="!selectedApplicationId && awaitingPaymentApps.length === 0" class="mb-6">
        <p class="text-sm text-navy/60">
          Once your application is approved on the dashboard, you can pay from there.
        </p>
      </AppCard>

      <section v-if="showApplicationPicker" class="mb-6">
        <h2 class="mb-3 font-medium text-navy">Select a visa to pay for</h2>
        <div class="space-y-3">
          <AppCard
            v-for="app in awaitingPaymentApps"
            :key="app.id"
            padding="sm"
            class="cursor-pointer transition-colors hover:border-accent-orange/50"
            @click="selectApplication(app.id)"
          >
            <p class="font-medium text-navy">{{ getCountryName(app.destinationCountry) }}</p>
            <p class="text-sm capitalize text-navy/60">{{ formatVisaType(app.visaType) }} visa</p>
          </AppCard>
        </div>
      </section>

      <AppCard v-else-if="paymentsStore.checkoutApplication" class="mb-6">
        <h2 class="mb-1 font-medium text-navy">You are paying for</h2>
        <p class="mb-1 text-xl text-navy">
          {{ getCountryName(paymentsStore.checkoutApplication.destinationCountry) }}
        </p>
        <p class="mb-4 text-sm capitalize text-navy/60">
          {{ formatVisaType(paymentsStore.checkoutApplication.visaType) }} visa
        </p>

        <div v-if="awaitingPaymentApps.length > 1" class="mb-4 border-b border-muted pb-4">
          <button
            type="button"
            class="text-sm font-medium text-accent-blue hover:underline"
            @click="router.replace({ name: 'Payment' })"
          >
            Choose a different visa
          </button>
        </div>

        <template v-if="paymentsStore.feeBreakdown">
          <h3 class="mb-4 font-medium text-navy">Fee breakdown</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-navy/60">Visa fee</span>
              <span class="text-navy">${{ paymentsStore.feeBreakdown.visaFee.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-navy/60">Service fee</span>
              <span class="text-navy">${{ paymentsStore.feeBreakdown.serviceFee.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between border-t border-muted pt-2 font-semibold">
              <span class="text-navy">Total</span>
              <span class="text-navy">${{ paymentsStore.feeBreakdown.total.toFixed(2) }}</span>
            </div>
          </div>
        </template>
      </AppCard>

      <template v-if="canPay">
        <h2 class="mb-3 font-medium text-navy">Payment method</h2>
        <div class="mb-6 space-y-2">
          <button
            v-for="method in PAYMENT_METHODS"
            :key="method.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-card border-2 p-4 text-left transition-colors"
            :class="
              paymentsStore.selectedMethod === method.id
                ? 'border-accent-orange bg-accent-orange/15'
                : 'border-muted bg-white hover:border-accent-blue/40'
            "
            @click="paymentsStore.selectMethod(method.id)"
          >
            <span class="text-xl">{{ method.icon }}</span>
            <span class="font-medium text-navy">{{ method.label }}</span>
          </button>
        </div>

        <AppButton full-width variant="secondary" :disabled="!canPay" @click="handlePay">
          Pay Now
        </AppButton>
      </template>
    </template>
  </div>
</template>
