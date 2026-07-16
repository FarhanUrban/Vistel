<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import ApplicationStatusBadge from '@/features/dashboard/components/ApplicationStatusBadge.vue'
import CountryFlag from '@/components/CountryFlag.vue'
import { useAuthStore } from '@/features/auth/store'
import { useDashboardStore } from '@/features/dashboard/store'
import { loadPaymentHistory } from '@/services/platformStorage'
import { getCountryName } from '@/services/visaIndexService'
import type { PaymentRecord } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const payments = ref<PaymentRecord[]>([])
const tab = ref<'visas' | 'payments'>('visas')

onMounted(async () => {
  await dashboardStore.loadDashboard()
  if (authStore.user) {
    payments.value = loadPaymentHistory(authStore.user.id)
  }
})

const chronologicalApps = computed(() =>
  [...dashboardStore.applications].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  ),
)

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
</script>

<template>
  <AppShell>
    <div class="space-y-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold text-navy">History</h1>
          <p class="text-sm text-navy/55 mt-1">Visa applications and payment receipts</p>
        </div>
        <AppButton variant="outline" size="sm" @click="router.push({ name: 'Dashboard' })">
          Dashboard
        </AppButton>
      </div>

      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-control px-4 py-2 text-sm font-semibold"
          :class="tab === 'visas' ? 'bg-navy text-white' : 'bg-white border border-muted text-navy'"
          @click="tab = 'visas'"
        >
          Visas / E-visas
        </button>
        <button
          type="button"
          class="rounded-control px-4 py-2 text-sm font-semibold"
          :class="tab === 'payments' ? 'bg-navy text-white' : 'bg-white border border-muted text-navy'"
          @click="tab = 'payments'"
        >
          Payments
        </button>
      </div>

      <div v-if="dashboardStore.isLoading" class="flex justify-center py-12">
        <AppLoadingSpinner />
      </div>

      <template v-else-if="tab === 'visas'">
        <AppCard v-if="chronologicalApps.length === 0" class="p-8 text-center text-navy/50 text-sm">
          No applications yet.
        </AppCard>
        <ul v-else class="space-y-3">
          <li v-for="app in chronologicalApps" :key="app.id">
            <AppCard class="flex items-center gap-4 p-4">
              <CountryFlag :iso2="app.destinationCountry" />
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-navy">
                  {{ getCountryName(app.destinationCountry) }}
                  <span class="font-normal text-navy/50 capitalize">
                    · {{ app.visaType.replace('-', ' ') }}
                  </span>
                </p>
                <p class="text-xs text-navy/50 mt-0.5">
                  Submitted {{ formatDate(app.submittedAt) }}
                  <span v-if="app.paidAt"> · Paid {{ formatDate(app.paidAt) }}</span>
                </p>
              </div>
              <ApplicationStatusBadge :status="app.status" />
            </AppCard>
          </li>
        </ul>
      </template>

      <template v-else>
        <AppCard v-if="payments.length === 0" class="p-8 text-center text-navy/50 text-sm">
          No payment records yet. Completed checkout receipts will appear here.
        </AppCard>
        <ul v-else class="space-y-3">
          <li v-for="pay in payments" :key="pay.id">
            <AppCard class="p-4 space-y-1">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <CountryFlag :iso2="pay.destinationCountry" />
                  <div>
                    <p class="font-semibold text-navy">
                      {{ getCountryName(pay.destinationCountry) }}
                      <span class="font-normal text-navy/50 capitalize">
                        · {{ pay.visaType.replace('-', ' ') }}
                      </span>
                    </p>
                    <p class="text-xs text-navy/50">{{ formatDate(pay.paidAt) }}</p>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-bold text-navy">{{ formatMoney(pay.amount, pay.currency) }}</p>
                  <p class="text-xs text-green-600 font-semibold capitalize">{{ pay.status }}</p>
                </div>
              </div>
              <p class="text-xxs font-mono text-navy/40 truncate">Txn {{ pay.transactionId }}</p>
            </AppCard>
          </li>
        </ul>
      </template>
    </div>
  </AppShell>
</template>
