<script setup lang="ts">
import type { VisaRequirementCategory } from '@/services/visaIndexService'

defineProps<{
  category: VisaRequirementCategory
}>()

const styles: Record<VisaRequirementCategory, string> = {
  'visa-free': 'bg-accent-blue/15 text-navy',
  'e-visa': 'bg-accent-orange/25 text-navy',
  eta: 'bg-accent-orange/25 text-navy',
  'visa-required': 'bg-gray-100 text-navy',
  'no-admission': 'bg-red-50 text-red-700',
}
</script>

<template>
  <span class="inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" :class="styles[category]">
    <slot />
  </span>
</template>
