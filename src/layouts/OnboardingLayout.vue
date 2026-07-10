<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'

interface Props {
  currentStep: number
  totalSteps: number
  title: string
}

defineProps<Props>()

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <AppHeader show-back @back="emit('back')" />
    <div class="px-4 pb-8 flex-1 max-w-lg mx-auto w-full">
      <div class="mb-6">
        <p class="text-sm text-gray-500 mb-1">Step {{ currentStep }} of {{ totalSteps }}</p>
        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-accent-orange transition-all duration-300"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          />
        </div>
      </div>
      <h1 class="text-2xl font-semibold text-navy mb-6">{{ title }}</h1>
      <slot />
    </div>
  </div>
</template>
