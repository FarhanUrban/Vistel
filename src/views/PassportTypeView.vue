<script setup lang="ts">
import { useRouter } from 'vue-router'
import PassportTypeStep from '@/features/onboarding/components/PassportTypeStep.vue'

const router = useRouter()

function goNext() {
  router.push({ name: 'OnboardingAdditionalDocs' })
}

function goBack() {
  router.push({ name: 'OnboardingVisaType' })
}
</script>

<template>
  <PassportTypeStep @next="goNext" @back="goBack" />
</template>
