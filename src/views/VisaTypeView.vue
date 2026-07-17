<script setup lang="ts">
import { useRouter } from 'vue-router'
import VisaTypeStep from '@/features/onboarding/components/VisaTypeStep.vue'
import { useAuthStore } from '@/features/auth/store'

const router = useRouter()
const authStore = useAuthStore()

function goNext() {
  router.push({ name: 'OnboardingPassportType' })
}

function goBack() {
  if (authStore.user) {
    // leaveOnboarding prevents the Dashboard guard from bouncing back into the wizard.
    router.push({ name: 'Dashboard', query: { leaveOnboarding: '1' } })
    return
  }
  router.push({ name: 'Landing' })
}
</script>

<template>
  <VisaTypeStep @next="goNext" @back="goBack" />
</template>
