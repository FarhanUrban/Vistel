<script setup lang="ts">
import { ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import { useRejectionsStore } from '@/features/admin-rejections/store'

const rejectionsStore = useRejectionsStore()

const applicationId = ref('app-1')

async function handleCheckStatus() {
  await rejectionsStore.pollStatus(applicationId.value)
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2">Waiting for E-Visa check</h1>
    <p class="text-gray-500 mb-6">Your application is being reviewed. This usually takes 3–5 business days.</p>

    <AppCard class="text-center mb-6">
      <div class="py-6">
        <div class="text-5xl mb-4">⏳</div>
        <p class="font-medium text-navy">Under review</p>
        <p class="text-sm text-gray-500 mt-2">We'll notify you when a decision is made.</p>
      </div>
    </AppCard>

    <AppErrorMessage v-if="rejectionsStore.error" :message="rejectionsStore.error" class="mb-4" />

    <AppButton full-width :loading="rejectionsStore.isPolling" @click="handleCheckStatus">
      Check Status Now
    </AppButton>

    <AppCard v-if="rejectionsStore.currentApplication" class="mt-4" padding="sm">
      <p class="text-sm text-gray-500">Current status</p>
      <p class="font-medium text-navy capitalize">{{ rejectionsStore.currentApplication.status }}</p>
    </AppCard>
  </div>
</template>
