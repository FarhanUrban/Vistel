<script setup lang="ts">
import { computed } from 'vue'
import type { VisaType } from '@/types'
import OnboardingLayout from '@/layouts/OnboardingLayout.vue'
import AppOptionList from '@/components/AppOptionList.vue'
import AppButton from '@/components/AppButton.vue'
import { VISA_TYPE_OPTIONS } from '@/features/onboarding/types'
import { useOnboardingStore } from '@/features/onboarding/store'

const onboardingStore = useOnboardingStore()

const emit = defineEmits<{
  next: []
  back: []
}>()

const selectedVisaType = computed({
  get: () => onboardingStore.visaType,
  set: (value: string | null) => {
    if (value) onboardingStore.setVisaType(value as VisaType)
  },
})

const options = VISA_TYPE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}))

function handleNext() {
  if (onboardingStore.visaType) {
    emit('next')
  }
}
</script>

<template>
  <OnboardingLayout :current-step="1" :total-steps="5" title="What type of visa do you need?" @back="emit('back')">
    <AppOptionList v-model="selectedVisaType" :options="options" />
    <AppButton class="mt-6" full-width :disabled="!onboardingStore.visaType" @click="handleNext">
      Continue
    </AppButton>
  </OnboardingLayout>
</template>
