<script setup lang="ts">
import { useRouter } from 'vue-router'
import AdditionalDocsStep from '@/features/onboarding/components/AdditionalDocsStep.vue'

const router = useRouter()

function goNext() {
  router.push({ name: 'OnboardingDestination' })
}

function goBack() {
  router.push({ name: 'OnboardingPassportType' })
}
</script>

<template>
  <AdditionalDocsStep @next="goNext" @back="goBack" />
</template>
