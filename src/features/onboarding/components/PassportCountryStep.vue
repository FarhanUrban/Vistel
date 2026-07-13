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

/** Pending selection — only committed on explicit Confirm. */
const selected = ref(onboardingStore.passportCountry)

function handleConfirm() {
  if (selected.value) {
    onboardingStore.setPassportCountry(selected.value)
    emit('next')
  }
}

function handleBack() {
  selected.value = onboardingStore.passportCountry
  emit('back')
}
</script>

<template>
  <OnboardingLayout
    :current-step="3"
    :total-steps="4"
    title="What country issued your passport?"
    @back="handleBack"
  >
    <CountryPicker
      v-model="selected"
      mode="passport"
      confirm-label="Confirm passport country"
      @continue="handleConfirm"
    />

    <div
      v-if="selected"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-muted bg-surface/95 p-4 backdrop-blur safe-area-bottom lg:hidden"
    >
      <AppButton full-width @click="handleConfirm">Confirm passport country</AppButton>
      <button
        type="button"
        class="mt-2 w-full text-sm font-medium text-gray-500"
        @click="selected = null"
      >
        Choose a different country
      </button>
    </div>
  </OnboardingLayout>
</template>
