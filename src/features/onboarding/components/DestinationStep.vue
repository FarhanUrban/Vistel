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
  changePassport: []
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
    :current-step="4"
    :total-steps="4"
    title="Where are you traveling?"
    @back="emit('back')"
  >
    <p class="mb-2 text-sm text-gray-500">
      Visa requirements are based on your
      {{ onboardingStore.passportCountry ? getCountryName(onboardingStore.passportCountry) : 'passport' }}.
    </p>
    <button
      v-if="onboardingStore.passportCountry"
      type="button"
      class="mb-4 text-sm font-medium text-accent-blue hover:underline"
      @click="emit('changePassport')"
    >
      Change passport country
    </button>
    <CountryPicker
      v-model="selected"
      mode="destination"
      :passport-iso2="onboardingStore.passportCountry"
      @continue="handleContinue"
    />

    <div
      v-if="selected"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-muted bg-surface/95 p-4 backdrop-blur safe-area-bottom lg:hidden"
    >
      <AppButton full-width @click="handleContinue">Continue to Documents</AppButton>
    </div>
  </OnboardingLayout>
</template>
