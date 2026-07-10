<script setup lang="ts">
import { useRouter } from 'vue-router'
import PassportCountryStep from '@/features/onboarding/components/PassportCountryStep.vue'

const router = useRouter()

function goNext() {
  router.push({ name: 'OnboardingDestination' })
}

function goBack() {
  router.push({ name: 'OnboardingAdditionalDocs' })
}
</script>

<template>
  <PassportCountryStep @next="goNext" @back="goBack" />
</template>
