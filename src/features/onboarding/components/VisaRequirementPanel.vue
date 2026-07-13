<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import {
  getCountryName,
  getOfficialVisaLink,
  getVisaRequirement,
  iso2ToFlag,
  normalizeRequirement,
} from '@/services/visaIndexService'

const props = defineProps<{
  passportIso2: string
  destinationIso2: string
}>()

const emit = defineEmits<{
  continue: []
}>()

const requirement = normalizeRequirement(getVisaRequirement(props.passportIso2, props.destinationIso2))
const officialLink = getOfficialVisaLink(props.destinationIso2)
</script>

<template>
  <div class="rounded-card border border-gray-200 bg-white p-6">
    <p class="text-4xl">{{ iso2ToFlag(destinationIso2) }}</p>
    <h2 class="mt-3 text-xl font-semibold text-navy">{{ getCountryName(destinationIso2) }}</h2>
    <p class="mt-1 text-sm text-gray-500">
      Traveling from {{ getCountryName(passportIso2) }}
    </p>

    <div v-if="requirement" class="mt-5 rounded-control bg-surface p-4">
      <p class="text-sm font-medium text-navy">{{ requirement.label }}</p>
      <p class="mt-1 text-sm text-gray-500">
        Based on passport-index data. Always confirm requirements on the official government site before you travel.
      </p>
    </div>
    <p v-else class="mt-5 text-sm text-gray-500">No visa requirement data found for this route.</p>

    <div class="mt-6 space-y-3">
      <AppButton full-width @click="emit('continue')">Continue with this destination</AppButton>
      <a
        :href="officialLink"
        target="_blank"
        rel="noopener noreferrer"
        class="block text-center text-sm font-medium text-accent-blue hover:underline"
      >
        Official visa information
      </a>
    </div>
  </div>
</template>
