<script setup lang="ts">
import { useRouter } from 'vue-router'
import VisaTypeStep from '@/features/onboarding/components/VisaTypeStep.vue'

const router = useRouter()

function goNext() {
  router.push({ name: 'OnboardingPassportType' })
}

function goBack() {
  router.push({ name: 'Signup' })
}
</script>

<template>
  <VisaTypeStep @next="goNext" @back="goBack" />
</template>
