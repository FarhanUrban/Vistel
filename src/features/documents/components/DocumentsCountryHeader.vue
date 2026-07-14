<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CountryFlag from '@/components/CountryFlag.vue'
import AppModal from '@/components/AppModal.vue'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useDashboardStore } from '@/features/dashboard/store'
import { useDocumentsStore } from '@/features/documents/store'
import { getCountryName } from '@/services/visaIndexService'
import { countryBannerFallbackUrl, countryBannerUrl } from '@/services/countryVisuals'

const props = defineProps<{
  showBanner?: boolean
}>()

const onboardingStore = useOnboardingStore()
const dashboardStore = useDashboardStore()
const documentsStore = useDocumentsStore()

const showSwitcher = ref(false)
const bannerFailed = ref(false)
const bannerSrc = ref('')

const destination = computed(() => onboardingStore.destinationCountry)

const countryOptions = computed(() => {
  const seen = new Set<string>()
  const options: { key: string; iso2: string; label: string; visaType?: string }[] = []

  for (const draft of onboardingStore.incompleteDrafts) {
    if (!draft.destinationCountry || !draft.visaType) continue
    const key = `${draft.destinationCountry}:${draft.visaType}`
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      key,
      iso2: draft.destinationCountry,
      label: getCountryName(draft.destinationCountry),
      visaType: draft.visaType,
    })
  }

  for (const app of dashboardStore.applications) {
    const key = `${app.destinationCountry}:${app.visaType}`
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      key,
      iso2: app.destinationCountry,
      label: getCountryName(app.destinationCountry),
      visaType: app.visaType,
    })
  }

  return options
})

onMounted(() => {
  if (!dashboardStore.applications.length) {
    dashboardStore.loadDashboard()
  }
  refreshBanner()
})

function refreshBanner() {
  bannerFailed.value = false
  if (!destination.value) {
    bannerSrc.value = ''
    return
  }
  bannerSrc.value = countryBannerUrl(destination.value)
}

function onBannerError() {
  if (!destination.value) return
  if (!bannerFailed.value) {
    bannerFailed.value = true
    bannerSrc.value = countryBannerFallbackUrl(destination.value)
  } else {
    bannerSrc.value = ''
  }
}

async function selectCountry(iso2: string, visaType?: string) {
  if (visaType) {
    onboardingStore.activateContext(iso2, visaType as import('@/types').VisaType)
  } else {
    onboardingStore.setDestinationCountry(iso2)
  }
  showSwitcher.value = false
  refreshBanner()
  await documentsStore.loadRequiredDocuments()
}
</script>

<template>
  <div class="mb-6">
    <div
      v-if="props.showBanner && destination"
      class="relative mb-4 overflow-hidden rounded-card bg-accent-blue/20"
    >
      <div class="h-28 w-full bg-gradient-to-br from-accent-blue/40 to-muted/60 sm:h-36">
        <img
          v-if="bannerSrc"
          :src="bannerSrc"
          :alt="`${getCountryName(destination)} banner`"
          class="h-full w-full object-cover"
          @error="onBannerError"
        />
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-navy/55 via-navy/10 to-transparent" />
      <div class="absolute bottom-3 left-3 right-3 flex items-center gap-2">
        <CountryFlag :iso2="destination" size="lg" />
        <div class="min-w-0">
          <p class="truncate text-lg font-semibold text-white drop-shadow">
            {{ getCountryName(destination) }}
          </p>
          <p class="text-xs text-white/85">Documents for this destination</p>
        </div>
      </div>
    </div>

    <div v-else-if="destination" class="mb-2 flex items-center gap-2">
      <CountryFlag :iso2="destination" />
      <p class="font-medium text-navy">{{ getCountryName(destination) }}</p>
    </div>

    <button
      v-if="countryOptions.length > 0"
      type="button"
      class="text-sm font-medium text-accent-blue hover:underline"
      @click="showSwitcher = true"
    >
      Change country
    </button>

    <AppModal :open="showSwitcher" title="Select country" @close="showSwitcher = false">
      <ul class="space-y-2">
        <li v-for="option in countryOptions" :key="option.key">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-control border border-muted px-3 py-2.5 text-left transition-colors"
            :class="
              option.iso2 === destination && option.visaType === onboardingStore.visaType
                ? 'border-accent-orange bg-accent-orange/15'
                : 'bg-white hover:border-accent-blue/40'
            "
            @click="selectCountry(option.iso2, option.visaType)"
          >
            <CountryFlag :iso2="option.iso2" />
            <div>
              <p class="font-medium text-navy">{{ option.label }}</p>
              <p v-if="option.visaType" class="text-xs capitalize text-navy/50">
                {{ option.visaType.replace('-', ' ') }} visa
              </p>
            </div>
          </button>
        </li>
      </ul>
    </AppModal>
  </div>
</template>
