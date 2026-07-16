<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppButton from '@/components/AppButton.vue'
import { getApplication } from '@/services/visaService'
import { getCountryName } from '@/services/visaIndexService'
import type { VisaApplication } from '@/types'

const route = useRoute()
const router = useRouter()

const application = ref<VisaApplication | null>(null)
const error = ref<string | null>(null)
const isLoading = ref(true)

onMounted(async () => {
  const applicationId = route.query.applicationId
  if (typeof applicationId !== 'string' || !applicationId) {
    error.value = 'Application not found'
    isLoading.value = false
    return
  }

  try {
    application.value = await getApplication(applicationId)
    if (!application.value) {
      error.value = 'Application not found'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load application'
  } finally {
    isLoading.value = false
  }
})

function goToDashboard() {
  router.push({ name: 'Dashboard' })
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2 lg:text-3xl">Application submitted</h1>
    <p class="text-gray-500 mb-6">
      Your application has been sent for review. An authorized agency or government reviewer will
      evaluate it — you will be notified when a decision is made.
    </p>

    <AppErrorMessage v-if="error" :message="error" class="mb-4" />
    <AppLoadingSpinner v-if="isLoading" />

    <template v-else-if="application">
      <AppCard class="mb-6 border-l-4 border-amber-500">
        <div class="flex items-start gap-3">
          <span class="text-2xl" aria-hidden="true">⏳</span>
          <div>
            <p class="font-semibold text-navy">Pending review</p>
            <p class="text-sm text-gray-500 mt-1">
              {{ getCountryName(application.destinationCountry) }} ·
              {{ application.visaType.replace('-', ' ') }} visa
            </p>
            <p class="text-xs text-gray-400 mt-2 font-mono">Ref: {{ application.id }}</p>
          </div>
        </div>
      </AppCard>

      <AppCard class="mb-6">
        <h2 class="font-medium text-navy mb-3">What happens next</h2>
        <ul class="space-y-2 text-sm text-gray-600 list-disc pl-5">
          <li>A reviewer decrypts and evaluates your application securely.</li>
          <li>You will receive an inbox notification when approved or rejected.</li>
          <li>If approved, you can proceed to payment from your dashboard.</li>
        </ul>
      </AppCard>

      <AppButton full-width @click="goToDashboard">Go to dashboard</AppButton>
    </template>
  </div>
</template>
