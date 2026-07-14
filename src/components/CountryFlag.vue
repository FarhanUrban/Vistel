<script setup lang="ts">
import { ref } from 'vue'
import { flagImageUrl, flagImageUrl2x } from '@/services/countryVisuals'
import { iso2ToFlag } from '@/services/visaIndexService'

const props = withDefaults(
  defineProps<{
    iso2: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const failed = ref(false)

const sizeClass = {
  sm: 'h-5 w-7',
  md: 'h-6 w-9',
  lg: 'h-8 w-12',
}[props.size]
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted/40"
  >
    <img
      v-if="!failed"
      :src="flagImageUrl(iso2)"
      :srcset="flagImageUrl2x(iso2)"
      :alt="`${iso2} flag`"
      :class="['object-cover', sizeClass]"
      loading="lazy"
      @error="failed = true"
    />
    <span
      v-else
      :class="size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'"
      aria-hidden="true"
    >
      {{ iso2ToFlag(iso2) }}
    </span>
  </span>
</template>
