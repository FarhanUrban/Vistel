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
    router.push({ name: 'Dashboard' })
    return
  }
  router.push({ name: 'Signup' })
}
</script>

<template>
  <VisaTypeStep @next="goNext" @back="goBack" />
</template>
