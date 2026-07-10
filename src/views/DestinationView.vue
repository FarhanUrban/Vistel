<script setup lang="ts">
import { useRouter } from 'vue-router'
import DestinationStep from '@/features/onboarding/components/DestinationStep.vue'

const router = useRouter()

function goNext() {
  router.push({ name: 'DocumentScan' })
}

function goBack() {
  router.push({ name: 'OnboardingPassportCountry' })
}
</script>

<template>
  <DestinationStep @next="goNext" @back="goBack" />
</template>
