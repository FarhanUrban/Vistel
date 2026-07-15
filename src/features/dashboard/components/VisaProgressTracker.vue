<script setup lang="ts">
import { computed } from 'vue'
import CountryFlag from '@/components/CountryFlag.vue'
import { getCountryName } from '@/services/visaIndexService'
import type { VisaApplication } from '@/types'

const props = defineProps<{
  application: VisaApplication
  currentStep: number
}>()

const steps = [
  {
    title: 'Application Received',
    description: 'Visa documents and questionnaire answers have been logged.',
  },
  {
    title: 'Document Quality Scan',
    description: 'Verifying photo resolutions and checking passport scan text match.',
  },
  {
    title: 'Background Verification',
    description: 'Running security clearing checks against travel eligibility systems.',
  },
  {
    title: 'Consulate Database Routing',
    description: 'Routing application packages securely to the target consulate portals.',
  },
]

const progressPercent = computed(() => {
  if (props.currentStep >= 4) return 100
  return Math.min(100, Math.max(10, (props.currentStep + 1) * 25))
})

const activeLineHeight = computed(() => {
  if (props.currentStep >= 3) return '100%'
  // Estimates a percentage of the line to highlight based on step
  return `${(props.currentStep / 3) * 100}%`
})
</script>

<template>
  <div class="border border-muted rounded-card bg-white p-5 shadow-sm space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <CountryFlag :iso2="application.destinationCountry" size="md" />
        <div>
          <h3 class="font-semibold text-navy leading-none">
            {{ getCountryName(application.destinationCountry) }}
          </h3>
          <p class="text-xs text-navy/50 capitalize mt-1">
            {{ application.visaType.replace('-', ' ') }} Visa • Reviewing
          </p>
        </div>
      </div>
      <span
        class="text-xs font-semibold px-2.5 py-1 rounded bg-accent-blue/10 text-accent-blue animate-pulse shrink-0"
      >
        Live Review
      </span>
    </div>

    <!-- Progress bar -->
    <div class="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div
        class="bg-accent-blue h-1.5 rounded-full transition-all duration-500 ease-out"
        :style="{ width: progressPercent + '%' }"
      ></div>
    </div>

    <!-- Stepper Steps -->
    <div class="relative pl-6 border-l-2 border-muted space-y-5 py-2 ml-3">
      <!-- Line overlay for active progress color -->
      <div
        class="absolute left-[-2px] top-0 bg-accent-blue w-[2px] origin-top transition-all duration-500 ease-out"
        :style="{ height: activeLineHeight }"
      ></div>

      <!-- Steps -->
      <div v-for="(step, idx) in steps" :key="idx" class="relative group">
        <!-- Step indicator dot -->
        <span
          class="absolute left-[-32px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-300"
          :class="[
            idx < currentStep
              ? 'bg-accent-blue border-accent-blue text-white'
              : idx === currentStep
                ? 'bg-white border-accent-orange text-accent-orange animate-pulse ring-4 ring-accent-orange/15'
                : 'bg-white border-muted text-navy/35',
          ]"
        >
          <!-- Checkmark for completed steps -->
          <svg
            v-if="idx < currentStep"
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <!-- Active step dot -->
          <span
            v-else-if="idx === currentStep"
            class="h-2 w-2 rounded-full bg-accent-orange"
          ></span>
          <!-- Future step dot -->
          <span v-else class="h-1.5 w-1.5 rounded-full bg-navy/20"></span>
        </span>

        <!-- Step content -->
        <div>
          <h4
            class="text-sm font-semibold transition-colors duration-300"
            :class="idx <= currentStep ? 'text-navy' : 'text-navy/40'"
          >
            {{ step.title }}
          </h4>
          <p
            class="text-xs mt-0.5 leading-relaxed transition-colors duration-300"
            :class="idx <= currentStep ? 'text-navy/60' : 'text-navy/30'"
          >
            {{ step.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
