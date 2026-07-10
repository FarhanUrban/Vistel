<script setup lang="ts">
import { ref } from 'vue'
import OnboardingLayout from '@/layouts/OnboardingLayout.vue'
import AppButton from '@/components/AppButton.vue'
import CountryPicker from '@/features/onboarding/components/CountryPicker.vue'
import { useOnboardingStore } from '@/features/onboarding/store'
import { getCountryName } from '@/services/visaIndexService'

const onboardingStore = useOnboardingStore()

const emit = defineEmits<{
  next: []
  back: []
}>()

const selected = ref(onboardingStore.destinationCountry)

function handleContinue() {
  if (selected.value) {
    onboardingStore.setDestinationCountry(selected.value)
    emit('next')
  }
}
</script>

<template>
  <OnboardingLayout
    :current-step="5"
    :total-steps="5"
    title="Where are you traveling?"
    @back="emit('back')"
  >
    <p class="mb-4 text-sm text-gray-500">
      Visa requirements are based on your
      {{ onboardingStore.passportCountry ? getCountryName(onboardingStore.passportCountry) : 'passport' }}.
    </p>
    <CountryPicker
      v-model="selected"
      mode="destination"
      :passport-iso2="onboardingStore.passportCountry"
      @continue="handleContinue"
    />

    <div
      v-if="selected"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-4 backdrop-blur safe-area-bottom lg:hidden"
    >
      <AppButton full-width @click="handleContinue">Continue to Documents</AppButton>
    </div>
  </OnboardingLayout>
</template>
