<script setup lang="ts">
import { computed } from 'vue'
import type { PassportType } from '@/types'
import OnboardingLayout from '@/layouts/OnboardingLayout.vue'
import AppOptionList from '@/components/AppOptionList.vue'
import AppButton from '@/components/AppButton.vue'
import { PASSPORT_TYPE_OPTIONS } from '@/features/onboarding/types'
import { useOnboardingStore } from '@/features/onboarding/store'

const onboardingStore = useOnboardingStore()

const emit = defineEmits<{
  next: []
  back: []
}>()

const selectedPassportType = computed({
  get: () => onboardingStore.passportType,
  set: (value: string | null) => {
    if (value) onboardingStore.setPassportType(value as PassportType)
  },
})

const options = PASSPORT_TYPE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}))

function handleNext() {
  if (onboardingStore.passportType) {
    emit('next')
  }
}
</script>

<template>
  <OnboardingLayout
    :current-step="2"
    :total-steps="4"
    title="What type of passport do you have?"
    @back="emit('back')"
  >
    <AppOptionList v-model="selectedPassportType" :options="options" />
    <AppButton
      class="mt-6"
      full-width
      :disabled="!onboardingStore.passportType"
      @click="handleNext"
    >
      Continue
    </AppButton>
  </OnboardingLayout>
</template>
