<script setup lang="ts">
import { ref } from 'vue'
import OnboardingLayout from '@/layouts/OnboardingLayout.vue'
import AppSelect from '@/components/AppSelect.vue'
import AppButton from '@/components/AppButton.vue'
import { DESTINATION_OPTIONS } from '@/features/onboarding/types'
import { useOnboardingStore } from '@/features/onboarding/store'

const onboardingStore = useOnboardingStore()

const emit = defineEmits<{
  next: []
  back: []
}>()

const destination = ref(onboardingStore.destinationCountry ?? '')

const options = DESTINATION_OPTIONS.map((country) => ({
  value: country,
  label: country,
}))

function handleNext() {
  if (destination.value) {
    onboardingStore.setDestinationCountry(destination.value)
    emit('next')
  }
}
</script>

<template>
  <OnboardingLayout :current-step="4" :total-steps="4" title="Where are you traveling?" @back="emit('back')">
    <AppSelect
      v-model="destination"
      label="Destination country"
      :options="options"
      placeholder="Select a country"
    />
    <AppButton class="mt-6" full-width :disabled="!destination" @click="handleNext">
      Continue to Documents
    </AppButton>
  </OnboardingLayout>
</template>
