<script setup lang="ts">
import { computed, ref } from 'vue'
import AppSearchInput from '@/components/AppSearchInput.vue'
import AppListRow from '@/components/AppListRow.vue'
import AppBadge from '@/components/AppBadge.vue'
import AppButton from '@/components/AppButton.vue'
import AppModal from '@/components/AppModal.vue'
import VisaRequirementPanel from '@/features/onboarding/components/VisaRequirementPanel.vue'
import {
  getCountryName,
  getVisaRequirement,
  iso2ToFlag,
  normalizeRequirement,
  searchCountries,
} from '@/services/visaIndexService'

const props = defineProps<{
  modelValue: string | null
  passportIso2?: string | null
  mode?: 'passport' | 'destination'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  continue: []
}>()

const query = ref('')
const showMobileDetail = ref(false)

const countries = computed(() => searchCountries(query.value, props.passportIso2 ?? undefined))

const selectedIso2 = computed({
  get: () => props.modelValue,
  set: (value: string | null) => {
    if (value) emit('update:modelValue', value)
  },
})

function requirementFor(iso2: string) {
  if (props.mode !== 'destination' || !props.passportIso2) return null
  return normalizeRequirement(getVisaRequirement(props.passportIso2, iso2))
}

function selectCountry(iso2: string) {
  selectedIso2.value = iso2
  showMobileDetail.value = true
}

function handleContinue() {
  emit('continue')
  showMobileDetail.value = false
}
</script>

<template>
  <div class="lg:grid lg:grid-cols-2 lg:gap-6">
    <div>
      <AppSearchInput v-model="query" placeholder="Search countries" class="mb-4" />
      <ul class="max-h-[50vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[28rem]">
        <li v-for="country in countries" :key="country.iso2">
          <AppListRow
            :label="country.name"
            :selected="selectedIso2 === country.iso2"
            @click="selectCountry(country.iso2)"
          >
            <template #leading>
              <span class="text-2xl leading-none" aria-hidden="true">{{ country.flag }}</span>
            </template>
            <template v-if="mode === 'destination' && passportIso2" #trailing>
              <AppBadge v-if="requirementFor(country.iso2)" :category="requirementFor(country.iso2)!.category">
                {{ requirementFor(country.iso2)!.label }}
              </AppBadge>
            </template>
          </AppListRow>
        </li>
      </ul>
    </div>

    <div class="mt-6 hidden lg:block">
      <VisaRequirementPanel
        v-if="mode === 'destination' && selectedIso2 && passportIso2"
        :passport-iso2="passportIso2"
        :destination-iso2="selectedIso2"
        @continue="handleContinue"
      />
      <div
        v-else-if="mode === 'passport' && selectedIso2"
        class="rounded-card border border-gray-200 bg-white p-6"
      >
        <p class="text-3xl">{{ iso2ToFlag(selectedIso2) }}</p>
        <h2 class="mt-3 text-xl font-semibold text-navy">{{ getCountryName(selectedIso2) }}</h2>
        <p class="mt-2 text-sm text-gray-500">This is the country that issued your passport.</p>
        <AppButton class="mt-6" full-width @click="handleContinue">Continue</AppButton>
      </div>
      <div v-else class="rounded-card border border-dashed border-gray-200 bg-white p-6 text-gray-500">
        Select a country to see details.
      </div>
    </div>

    <AppModal
      v-if="mode === 'destination' && selectedIso2 && passportIso2"
      :open="showMobileDetail"
      @close="showMobileDetail = false"
    >
      <VisaRequirementPanel
        :passport-iso2="passportIso2"
        :destination-iso2="selectedIso2"
        @continue="handleContinue"
      />
    </AppModal>

    <AppModal
      v-else-if="mode === 'passport' && selectedIso2"
      :open="showMobileDetail"
      @close="showMobileDetail = false"
    >
      <div>
        <p class="text-4xl">{{ iso2ToFlag(selectedIso2) }}</p>
        <h2 class="mt-3 text-xl font-semibold text-navy">{{ getCountryName(selectedIso2) }}</h2>
        <p class="mt-2 text-sm text-gray-500">This is the country that issued your passport.</p>
        <AppButton class="mt-6" full-width @click="handleContinue">Continue</AppButton>
      </div>
    </AppModal>
  </div>
</template>
