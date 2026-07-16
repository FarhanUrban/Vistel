<script setup lang="ts">
import { onMounted } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import { useRejectionsStore } from '@/features/admin-rejections/store'

const rejectionsStore = useRejectionsStore()

onMounted(() => {
  rejectionsStore.loadRejectedApplication()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2">Why you were rejected</h1>
    <p class="text-gray-500 mb-6">Review the reason and fix the issue before reapplying.</p>

    <AppErrorMessage v-if="rejectionsStore.error" :message="rejectionsStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="rejectionsStore.isLoading" />

    <template v-else-if="rejectionsStore.currentApplication">
      <AppCard class="mb-6">
        <p class="text-sm text-gray-500">Application for</p>
        <p class="font-medium text-navy text-lg">
          {{ rejectionsStore.currentApplication.destinationCountry }}
        </p>
        <p class="text-sm text-gray-500 capitalize mt-1">
          {{ rejectionsStore.currentApplication.visaType.replace('-', ' ') }}
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
        <RouterLink to="/documents/scan">
          <AppButton full-width>Re-upload Documents</AppButton>
        </RouterLink>
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
