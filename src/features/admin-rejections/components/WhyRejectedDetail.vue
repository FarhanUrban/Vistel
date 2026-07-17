<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import { useRejectionsStore } from '@/features/admin-rejections/store'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useDocumentsStore } from '@/features/documents/store'
import { getCountryName } from '@/services/visaIndexService'
import type { VisaType } from '@/types'

const rejectionsStore = useRejectionsStore()
const onboardingStore = useOnboardingStore()
const documentsStore = useDocumentsStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  const applicationId =
    typeof route.query.applicationId === 'string' ? route.query.applicationId : null
  rejectionsStore.loadRejectedApplication(applicationId)
})

function startResubmission() {
  const app = rejectionsStore.currentApplication
  if (!app) return
  documentsStore.resetForNewApplication()
  documentsStore.beginResubmission(app.id)
  onboardingStore.activateContext(app.destinationCountry, app.visaType as VisaType)
  if (app.clientName) {
    documentsStore.setClientLegalName(app.clientName)
  }
  router.push({ name: 'RequiredDocuments' })
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2">Why you were rejected</h1>
    <p class="text-gray-500 mb-6">
      Review the agency reason, then re-upload your documents to try again.
    </p>

    <AppErrorMessage v-if="rejectionsStore.error" :message="rejectionsStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="rejectionsStore.isLoading" />

    <template v-else-if="rejectionsStore.currentApplication">
      <AppCard class="mb-6">
        <p class="text-sm text-gray-500">Application for</p>
        <p class="font-medium text-navy text-lg">
          {{ getCountryName(rejectionsStore.currentApplication.destinationCountry) }}
        </p>
        <p class="text-sm text-gray-500 capitalize mt-1">
          {{ rejectionsStore.currentApplication.visaType.replace('-', ' ') }}
        </p>
        <p class="text-xs font-mono text-gray-400 mt-2">
          {{ rejectionsStore.currentApplication.id }}
        </p>
      </AppCard>

      <AppCard v-if="rejectionsStore.rejectionReason" class="border-red-200 bg-red-50">
        <p class="font-medium text-red-800">{{ rejectionsStore.rejectionReason.title }}</p>
        <p class="text-sm text-red-700 mt-2">{{ rejectionsStore.rejectionReason.description }}</p>
      </AppCard>

      <AppCard
        v-if="rejectionsStore.currentApplication.rejectionOther"
        class="mt-4 border-red-200 bg-red-50"
      >
        <p class="font-medium text-red-800">Additional reason</p>
        <p class="text-sm text-red-700 mt-2">
          {{ rejectionsStore.currentApplication.rejectionOther }}
        </p>
      </AppCard>

      <AppCard
        v-if="rejectionsStore.currentApplication.rejectionDetails"
        class="mt-4 border-red-200 bg-white"
      >
        <p class="font-medium text-navy">Reviewer details</p>
        <p class="text-sm text-gray-600 mt-2">
          {{ rejectionsStore.currentApplication.rejectionDetails }}
        </p>
      </AppCard>

      <div class="mt-6 space-y-3">
        <AppButton full-width @click="startResubmission">
          Fix documents & resubmit
        </AppButton>
        <RouterLink to="/dashboard">
          <AppButton variant="outline" full-width>Back to Dashboard</AppButton>
        </RouterLink>
      </div>
    </template>

    <AppCard v-else>
      <p class="text-gray-500">No rejected applications found.</p>
      <RouterLink to="/dashboard" class="block mt-4">
        <AppButton variant="outline" full-width>Back to Dashboard</AppButton>
      </RouterLink>
    </AppCard>
  </div>
</template>
