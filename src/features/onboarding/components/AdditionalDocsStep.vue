<script setup lang="ts">
import { computed } from 'vue'
import OnboardingLayout from '@/layouts/OnboardingLayout.vue'
import AppOptionList from '@/components/AppOptionList.vue'
import AppButton from '@/components/AppButton.vue'
import { useOnboardingStore } from '@/features/onboarding/store'

const onboardingStore = useOnboardingStore()

const emit = defineEmits<{
  next: []
  back: []
}>()

const options = [
  { value: 'yes', label: 'Yes', description: 'I have additional supporting documents' },
  { value: 'no', label: 'No', description: 'I only have the standard required documents' },
]

const selected = computed({
  get: () => {
    if (onboardingStore.hasAdditionalDocs === null) return null
    return onboardingStore.hasAdditionalDocs ? 'yes' : 'no'
  },
  set: (value: string | null) => {
    if (value === 'yes') onboardingStore.setHasAdditionalDocs(true)
    if (value === 'no') onboardingStore.setHasAdditionalDocs(false)
  },
})

function handleNext() {
  if (onboardingStore.hasAdditionalDocs !== null) {
    emit('next')
  }
}
</script>

<template>
  <OnboardingLayout
    :current-step="3"
    :total-steps="5"
    title="Do you have additional documents?"
    @back="emit('back')"
  >
    <AppOptionList v-model="selected" :options="options" />
    <AppButton
      class="mt-6"
      full-width
      :disabled="onboardingStore.hasAdditionalDocs === null"
      @click="handleNext"
    >
      Continue
    </AppButton>
  </OnboardingLayout>
</template>
