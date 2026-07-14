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
  <div class="min-h-screen flex flex-col bg-surface">
    <AppHeader show-back @back="emit('back')" />
    <div
      class="mx-auto w-full max-w-lg flex-1 px-4 pb-24 safe-area-bottom lg:max-w-3xl lg:px-8 lg:pb-8"
    >
      <div class="mb-6">
        <p class="mb-1 text-sm text-gray-500">Step {{ currentStep }} of {{ totalSteps }}</p>
        <div class="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            class="h-full bg-accent-orange transition-all duration-300"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          />
        </div>
      </div>
      <h1 class="mb-6 text-2xl font-semibold text-navy lg:text-3xl">{{ title }}</h1>
      <slot />
    </div>
  </div>
</template>
