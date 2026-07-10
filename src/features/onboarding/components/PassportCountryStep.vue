<script setup lang="ts">
import { ref } from 'vue'
import OnboardingLayout from '@/layouts/OnboardingLayout.vue'
import AppButton from '@/components/AppButton.vue'
import CountryPicker from '@/features/onboarding/components/CountryPicker.vue'
import { useOnboardingStore } from '@/features/onboarding/store'

const onboardingStore = useOnboardingStore()

const emit = defineEmits<{
  next: []
  back: []
}>()

const selected = ref(onboardingStore.passportCountry)

function handleContinue() {
  if (selected.value) {
    onboardingStore.setPassportCountry(selected.value)
    emit('next')
  }
}
</script>

<template>
  <OnboardingLayout
    :current-step="4"
    :total-steps="5"
    title="What country issued your passport?"
    @back="emit('back')"
  >
    <CountryPicker v-model="selected" mode="passport" @continue="handleContinue" />

    <div
      v-if="selected"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-4 backdrop-blur safe-area-bottom lg:hidden"
    >
      <AppButton full-width @click="handleContinue">Continue</AppButton>
    </div>
  </OnboardingLayout>
</template>
