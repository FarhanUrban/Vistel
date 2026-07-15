<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useAuthStore } from '@/features/auth/store'
import {
  getAllCountries,
  getVisaRequirement,
  normalizeRequirement,
  getCountryName,
  iso2ToFlag
} from '@/services/visaIndexService'
import AppLogo from '@/components/AppLogo.vue'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'

const router = useRouter()
const onboardingStore = useOnboardingStore()
const authStore = useAuthStore()

const countries = getAllCountries()
const passportIso2 = ref('')
const destinationIso2 = ref('')

const destinationCountries = computed(() => {
  if (!passportIso2.value) return countries
  return countries.filter((c) => c.iso2 !== passportIso2.value)
})

const requirement = computed(() => {
  if (!passportIso2.value || !destinationIso2.value) return null
  return normalizeRequirement(getVisaRequirement(passportIso2.value, destinationIso2.value))
})

function startApplicationFromWidget() {
  if (!passportIso2.value || !destinationIso2.value) return

  onboardingStore.startNewVisa()
  onboardingStore.setPassportCountry(passportIso2.value)
  onboardingStore.setDestinationCountry(destinationIso2.value)
  onboardingStore.setPassportType('regular') // default preset

  const req = requirement.value
  if (req?.category === 'e-visa' || req?.category === 'eta') {
    onboardingStore.setVisaType('e-visa')
  } else {
    onboardingStore.setVisaType('tourist') // default tourist visa fallback
  }

  // Go to required documents. Navigation guard will prompt authentication if not logged in.
  router.push({ name: 'RequiredDocuments' })
}

function handleGetStarted() {
  if (authStore.user) {
    router.push({ name: 'Dashboard' })
  } else {
    router.push({ name: 'Signup' })
  }
}

function handleTrack() {
  if (authStore.user) {
    router.push({ name: 'Dashboard' })
  } else {
    router.push({ name: 'Login' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface selection:bg-accent-orange/30">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-muted/30 bg-surface/85 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <AppLogo />
        </div>
        <nav class="hidden items-center gap-8 md:flex">
          <a href="#features" class="text-sm font-medium text-navy/70 hover:text-navy transition-colors">Features</a>
          <a href="#estimator" class="text-sm font-medium text-navy/70 hover:text-navy transition-colors">Visa Checker</a>
          <a href="#how-it-works" class="text-sm font-medium text-navy/70 hover:text-navy transition-colors">How It Works</a>
        </nav>
        <div class="flex items-center gap-3">
          <AppButton variant="outline" size="sm" @click="handleTrack">
            {{ authStore.user ? 'Dashboard' : 'Sign In' }}
          </AppButton>
          <AppButton variant="primary" size="sm" @click="handleGetStarted">
            {{ authStore.user ? 'Apply Now' : 'Get Started' }}
          </AppButton>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="relative overflow-hidden px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div class="mx-auto max-w-7xl lg:grid lg:grid-cols-12 lg:gap-12 items-center">
        <!-- Hero Text -->
        <div class="lg:col-span-6 space-y-6 text-center lg:text-left">
          <div class="inline-flex items-center gap-2 rounded-full bg-accent-orange/15 px-3 py-1 text-xs font-semibold text-navy">
            <span class="flex h-2 w-2 rounded-full bg-accent-orange animate-pulse"></span>
            Seamless Visa Logistics
          </div>
          <h1 class="font-display text-4xl font-extrabold tracking-tight text-navy sm:text-5xl lg:text-6xl leading-tight">
            Visa applications,<br />
            <span class="text-accent-blue bg-gradient-to-r from-accent-blue to-navy bg-clip-text text-transparent">simplified.</span>
          </h1>
          <p class="mx-auto max-w-2xl text-lg text-navy/70 lg:mx-0">
            Tell Vislet where you're going and we'll tell you what documents you need, scan your passport, handle secure mock checkout, and track consulate approval from a single dashboard.
          </p>
          <div class="flex flex-col gap-3 justify-center sm:flex-row lg:justify-start pt-2">
            <AppButton variant="primary" size="lg" @click="handleGetStarted">
              Start Application Free
            </AppButton>
            <AppButton variant="outline" size="lg" @click="handleTrack">
              Track Visa Status
            </AppButton>
          </div>
        </div>

        <!-- Hero Graphic -->
        <div class="mt-16 lg:mt-0 lg:col-span-6 flex justify-center">
          <div class="relative w-full max-w-md lg:max-w-xl group">
            <div class="absolute inset-0 -m-4 bg-gradient-to-tr from-accent-blue/20 to-accent-orange/20 blur-3xl opacity-60 rounded-full group-hover:scale-105 transition-transform duration-700"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Estimator Widget -->
    <section id="estimator" class="bg-navy py-20 text-white relative">
      <div class="mx-auto max-w-4xl px-6">
        <div class="text-center space-y-3 mb-12">
          <h2 class="text-3xl font-bold font-display sm:text-4xl text-surface">
            Check Your Visa Requirements Instantly
          </h2>
          <p class="text-surface/75 text-base max-w-xl mx-auto">
            Choose your passport nationality and destination to estimate visa necessity.
          </p>
        </div>

        <!-- Estimator Card -->
        <div class="bg-white/10 backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-card shadow-xl space-y-6">
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <!-- Passport select -->
            <div class="space-y-2">
              <label for="passport-select" class="block text-sm font-medium text-surface/90">
                Your Passport Nationality
              </label>
              <select
                id="passport-select"
                v-model="passportIso2"
                class="w-full bg-navy border border-white/20 hover:border-white/40 focus:border-accent-blue rounded-control p-3 text-surface font-medium outline-none transition-colors"
              >
                <option value="" disabled selected class="bg-navy text-surface/50">Select your country</option>
                <option
                  v-for="country in countries"
                  :key="country.iso2"
                  :value="country.iso2"
                  class="bg-navy text-surface"
                >
                  {{ country.flag }} &nbsp; {{ country.name }}
                </option>
              </select>
            </div>

            <!-- Destination select -->
            <div class="space-y-2">
              <label for="destination-select" class="block text-sm font-medium text-surface/90">
                Destination Country
              </label>
              <select
                id="destination-select"
                v-model="destinationIso2"
                :disabled="!passportIso2"
                class="w-full bg-navy border border-white/20 hover:border-white/40 focus:border-accent-blue rounded-control p-3 text-surface font-medium outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <option value="" disabled selected class="bg-navy text-surface/50">Select destination</option>
                <option
                  v-for="country in destinationCountries"
                  :key="country.iso2"
                  :value="country.iso2"
                  class="bg-navy text-surface"
                >
                  {{ country.flag }} &nbsp; {{ country.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Result Panel -->
          <Transition name="fade">
            <div v-if="requirement" class="mt-6 border-t border-white/10 pt-6 space-y-4">
              <div class="flex items-center gap-4 bg-white/5 rounded-control p-4 border border-white/5">
                <div class="text-4xl shrink-0">
                  {{ iso2ToFlag(destinationIso2) }}
                </div>
                <div class="min-w-0">
                  <span class="text-xs uppercase font-semibold text-accent-orange tracking-wider">Estimate Result</span>
                  <h3 class="text-xl font-bold text-surface">{{ requirement.label }}</h3>
                  <p class="text-xs text-surface/60 mt-1">
                    Traveling to {{ getCountryName(destinationIso2) }} with a passport from {{ getCountryName(passportIso2) }}.
                  </p>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  @click="startApplicationFromWidget"
                  class="flex-1 bg-accent-orange text-navy font-semibold py-3 px-6 rounded-control hover:opacity-90 active:scale-98 transition-all text-center"
                >
                  Apply via Vislet
                </button>
                <RouterLink
                  to="/welcome"
                  class="flex-1 border border-white/20 text-surface hover:bg-white/5 font-semibold py-3 px-6 rounded-control transition-colors text-center"
                >
                  Learn Checklist
                </RouterLink>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 px-6 max-w-7xl mx-auto">
      <div class="text-center space-y-3 mb-16">
        <h2 class="text-3xl font-bold font-display text-navy sm:text-4xl">
          Everything You Need to Travel
        </h2>
        <p class="text-gray-500 max-w-xl mx-auto">
          Vislet streamlines visa logic so you can focus on packing your bags.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <!-- Feature 1 -->
        <AppCard class="hover:border-accent-blue/50 transition-colors duration-300">
          <div class="h-12 w-12 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue text-2xl mb-4">
            🌍
          </div>
          <h3 class="text-lg font-bold text-navy">Global Visa Index</h3>
          <p class="text-sm text-gray-500 mt-2">
            Instant checkups on travel freedom and visa compliance for over 190 countries globally.
          </p>
        </AppCard>

        <!-- Feature 2 -->
        <AppCard class="hover:border-accent-orange/50 transition-colors duration-300">
          <div class="h-12 w-12 rounded-lg bg-accent-orange/10 flex items-center justify-center text-accent-orange text-2xl mb-4">
            📄
          </div>
          <h3 class="text-lg font-bold text-navy">Document Scanning</h3>
          <p class="text-sm text-gray-500 mt-2">
            Take photos or upload PDFs. Our app performs a client-side layout validity check before submitting.
          </p>
        </AppCard>

        <!-- Feature 3 -->
        <AppCard class="hover:border-accent-blue/50 transition-colors duration-300">
          <div class="h-12 w-12 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue text-2xl mb-4">
            💳
          </div>
          <h3 class="text-lg font-bold text-navy">Secure Sandbox Checkout</h3>
          <p class="text-sm text-gray-500 mt-2">
            No real credit card required. Experience structured fee payments securely during local mock staging.
          </p>
        </AppCard>

        <!-- Feature 4 -->
        <AppCard class="hover:border-accent-orange/50 transition-colors duration-300">
          <div class="h-12 w-12 rounded-lg bg-accent-orange/10 flex items-center justify-center text-accent-orange text-2xl mb-4">
            ⏳
          </div>
          <h3 class="text-lg font-bold text-navy">Live Status Tracker</h3>
          <p class="text-sm text-gray-500 mt-2">
            Follow along through submission, reviews, consulate schedule interviews, and final approval stamps.
          </p>
        </AppCard>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="py-20 bg-muted/20 px-6">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-bold font-display text-navy text-center mb-16">
          How Vislet Works
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <!-- Step 1 -->
          <div class="space-y-4 text-center md:text-left">
            <div class="h-10 w-10 rounded-full bg-navy text-surface flex items-center justify-center font-bold text-lg mx-auto md:mx-0">
              1
            </div>
            <h3 class="text-xl font-bold text-navy">Select Destination</h3>
            <p class="text-sm text-gray-500">
              Fill in your passport issuer and destination. Vislet dynamically calculates the checklist.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="space-y-4 text-center md:text-left">
            <div class="h-10 w-10 rounded-full bg-navy text-surface flex items-center justify-center font-bold text-lg mx-auto md:mx-0">
              2
            </div>
            <h3 class="text-xl font-bold text-navy">Upload Files</h3>
            <p class="text-sm text-gray-500">
              Snap photos of required documents. Files are simulated and stored right in your browser.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="space-y-4 text-center md:text-left">
            <div class="h-10 w-10 rounded-full bg-navy text-surface flex items-center justify-center font-bold text-lg mx-auto md:mx-0">
              3
            </div>
            <h3 class="text-xl font-bold text-navy">Checkout & Track</h3>
            <p class="text-sm text-gray-500">
              Complete the application fee payment using sandbox credentials and watch status updates.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 px-6 text-center">
      <div class="max-w-3xl mx-auto space-y-6">
        <h2 class="text-4xl font-bold font-display text-navy">
          Ready to simplify your next journey?
        </h2>
        <p class="text-lg text-gray-500">
          Create a free mockup profile or sign in to finalize pending visa draft reviews.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <AppButton variant="primary" size="lg" @click="handleGetStarted">
            Get Started Now
          </AppButton>
          <AppButton variant="outline" size="lg" @click="handleTrack">
            Access Dashboard
          </AppButton>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-muted bg-navy py-12 text-surface/60">
      <div class="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="space-y-2 text-center md:text-left">
          <div class="font-display text-xl font-bold text-surface tracking-tight">Vislet</div>
          <p class="text-xs">Seamless visa and e-visa tracking system.</p>
        </div>
        <div class="flex gap-6 text-sm flex-wrap justify-center md:justify-start">
          <RouterLink to="/about" class="hover:text-surface transition-colors">About Us</RouterLink>
          <RouterLink to="/agency" class="hover:text-surface transition-colors">Agency Portal</RouterLink>
          <RouterLink to="/admin" class="hover:text-surface transition-colors">Admin Board</RouterLink>
          <a href="#features" class="hover:text-surface transition-colors">Features</a>
          <a href="#estimator" class="hover:text-surface transition-colors">Visa Checker</a>
        </div>
        <p class="text-xs">&copy; 2026 Vislet. Private — Urban Arts / Vislet team.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
