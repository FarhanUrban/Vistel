<script setup lang="ts">
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { usePaymentsStore } from '@/features/payments/store'

const router = useRouter()
const paymentsStore = usePaymentsStore()

function goToDashboard() {
  paymentsStore.reset()
  router.push({ name: 'Dashboard' })
}
</script>

<template>
  <AuthLayout>
    <AppCard class="text-center">
      <div class="text-5xl mb-4">✅</div>
      <h1 class="text-2xl font-semibold text-navy">Payment successful!</h1>
      <p class="text-gray-500 mt-2 mb-2">Your e-visa application fee has been paid.</p>
      <p v-if="paymentsStore.transactionId" class="text-xs text-gray-400 mb-6">
        Transaction: {{ paymentsStore.transactionId }}
      </p>
      <AppButton full-width @click="goToDashboard">Go to Dashboard</AppButton>
    </AppCard>
  </AuthLayout>
</template>
