<script setup lang="ts">
import { computed, ref } from 'vue'
import AppSearchInput from '@/components/AppSearchInput.vue'
import AppListRow from '@/components/AppListRow.vue'
import AppBadge from '@/components/AppBadge.vue'
import AppButton from '@/components/AppButton.vue'
import AppModal from '@/components/AppModal.vue'
import VisaRequirementPanel from '@/features/onboarding/components/VisaRequirementPanel.vue'
import CountryFlag from '@/components/CountryFlag.vue'
import {
  getCountryName,
  getVisaRequirement,
  normalizeRequirement,
  searchCountries,
} from '@/services/visaIndexService'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    passportIso2?: string | null
    mode?: 'passport' | 'destination'
    confirmLabel?: string
  }>(),
  {
    mode: 'destination',
    confirmLabel: 'Continue',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  continue: []
}>()

const query = ref('')
const showMobileDetail = ref(false)

const countries = computed(() => searchCountries(query.value, props.passportIso2 ?? undefined))

const selectedIso2 = computed({
  get: () => props.modelValue,
  set: (value: string | null) => {
    emit('update:modelValue', value)
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

function closeMobileDetail() {
  showMobileDetail.value = false
  if (props.mode === 'passport') {
    // Closing without confirm clears the pending selection so tap alone cannot stick.
    selectedIso2.value = null
  }
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
              <CountryFlag :iso2="country.iso2" />
            </template>
            <template v-if="mode === 'destination' && passportIso2" #trailing>
              <AppBadge
                v-if="requirementFor(country.iso2)"
                :category="requirementFor(country.iso2)!.category"
              >
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
        class="rounded-card border border-muted bg-white p-6"
      >
        <CountryFlag :iso2="selectedIso2" size="lg" />
        <h2 class="mt-3 text-xl font-semibold text-navy">{{ getCountryName(selectedIso2) }}</h2>
        <p class="mt-2 text-sm text-gray-500">This is the country that issued your passport.</p>
        <AppButton class="mt-6" full-width @click="handleContinue">{{ confirmLabel }}</AppButton>
        <button
          type="button"
          class="mt-3 w-full text-sm font-medium text-gray-500 hover:text-navy"
          @click="selectedIso2 = null"
        >
          Choose a different country
        </button>
      </div>
      <div v-else class="rounded-card border border-dashed border-muted bg-white p-6 text-gray-500">
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
      @close="closeMobileDetail"
    >
      <div>
        <CountryFlag :iso2="selectedIso2" size="lg" />
        <h2 class="mt-3 text-xl font-semibold text-navy">{{ getCountryName(selectedIso2) }}</h2>
        <p class="mt-2 text-sm text-gray-500">This is the country that issued your passport.</p>
        <AppButton class="mt-6" full-width @click="handleContinue">{{ confirmLabel }}</AppButton>
        <button
          type="button"
          class="mt-3 w-full text-sm font-medium text-gray-500 hover:text-navy"
          @click="closeMobileDetail"
        >
          Choose a different country
        </button>
      </div>
    </AppModal>
  </div>
</template>
