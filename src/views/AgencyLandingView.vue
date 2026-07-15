<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import AppLogo from '@/components/AppLogo.vue'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'

const router = useRouter()
const authStore = useAuthStore()

// Commission calculator
const clientCount = ref(50)
const calculatedDiscount = computed(() => {
  if (clientCount.value < 10) return 0
  if (clientCount.value < 50) return 10
  if (clientCount.value < 100) return 15
  return 20
})
const standardFeePerApp = 45
const totalMonthlyCost = computed(() => {
  const discount = calculatedDiscount.value / 100
  return Math.round(clientCount.value * standardFeePerApp * (1 - discount))
})

const totalSavings = computed(() => {
  const original = clientCount.value * standardFeePerApp
  return original - totalMonthlyCost.value
})

// Registration Modal
const showApplyModal = ref(false)
const companyName = ref('')
const contactEmail = ref('')
const estVolume = ref('10-50')
const formSubmitted = ref(false)

function submitApplication() {
  if (!companyName.value || !contactEmail.value) return
  formSubmitted.value = true
  setTimeout(() => {
    showApplyModal.value = false
    formSubmitted.value = false
    companyName.value = ''
    contactEmail.value = ''
    alert('Thank you! Our Partnership team will reach out within 24 hours.')
  }, 1000)
}

function handleLoginRedirect() {
  if (authStore.user?.role === 'agency') {
    router.push({ name: 'AgencyDashboard' })
  } else {
    router.push({ name: 'Login', query: { redirect: '/agency/dashboard' } })
  }
}
</script>

<template>
  <div class="min-h-screen bg-navy text-white selection:bg-accent-orange/30">
    <!-- Header -->
    <header class="border-b border-white/10 bg-navy/85 backdrop-blur-md sticky top-0 z-50">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <AppLogo class="text-surface" />
          <span class="text-xs uppercase font-semibold text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded border border-accent-orange/20">Partners</span>
        </div>
        <div class="flex items-center gap-4">
          <RouterLink to="/" class="text-sm font-medium text-white/70 hover:text-white transition-colors">Individual Portal</RouterLink>
          <AppButton variant="outline" size="sm" class="border-white/20 text-white hover:bg-white/10 hover:text-accent-orange transition-colors" @click="handleLoginRedirect">
            {{ authStore.user?.role === 'agency' ? 'Dashboard' : 'Agency Login' }}
          </AppButton>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="relative overflow-hidden px-6 pt-20 pb-24 text-center max-w-5xl mx-auto">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(134,165,217,0.15),transparent_60%)]"></div>
      
      <div class="relative space-y-6">
        <div class="inline-flex items-center gap-2 rounded-full bg-accent-blue/15 px-3 py-1 text-xs font-semibold text-accent-blue border border-accent-blue/20">
          Scale Your Travel Business
        </div>
        <h1 class="font-display text-4xl font-extrabold tracking-tight sm:text-6xl text-surface">
          Visa operations for<br />
          <span class="bg-gradient-to-r from-accent-orange to-accent-blue bg-clip-text text-transparent">high-volume agencies.</span>
        </h1>
        <p class="mx-auto max-w-2xl text-lg text-surface/75">
          Submit, monitor, and finalize client e-visas from a centralized dashboard. Gain bulk discounts, priority consulate processing, and robust customer reporting.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <AppButton variant="primary" size="lg" class="bg-accent-orange text-navy hover:bg-accent-orange/90" @click="showApplyModal = true">
            Apply for Partnership
          </AppButton>
          <AppButton variant="outline" size="lg" class="border-white/20 text-white hover:bg-white/5" @click="handleLoginRedirect">
            Access Dashboard
          </AppButton>
        </div>
      </div>
    </section>

    <!-- Interactive Fee Estimator & Calc -->
    <section class="py-16 px-6 bg-white/5 border-y border-white/5">
      <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div class="space-y-6">
          <h2 class="text-3xl font-bold font-display text-surface">Volume Discount & Saving Calculator</h2>
          <p class="text-surface/70">
            We partner with tour operators, educational consultants, and corporate travel desks. Slide the calculator to estimate how much your business can save with our volume discounts.
          </p>
          <div class="space-y-4 bg-navy p-6 rounded-card border border-white/10">
            <div>
              <label class="block text-sm font-medium text-surface/85 mb-2">Monthly Visa Applications: <span class="text-accent-orange font-bold">{{ clientCount }}</span></label>
              <input type="range" min="5" max="200" v-model.number="clientCount" class="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-orange" />
            </div>
            <div class="flex justify-between text-xs text-surface/50">
              <span>5 apps</span>
              <span>100 apps</span>
              <span>200+ apps</span>
            </div>
          </div>
        </div>

        <div class="bg-navy p-8 rounded-card border border-white/10 relative overflow-hidden">
          <div class="absolute top-0 right-0 bg-accent-orange text-navy text-xs font-bold px-3 py-1 rounded-bl">
            {{ calculatedDiscount }}% Off Partner Fee
          </div>
          <div class="space-y-6">
            <h3 class="text-lg font-semibold text-surface/90">Estimated Monthly Pricing</h3>
            <div class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-surface/60">Standard Partner Fee (per app)</span>
                <span>${{ standardFeePerApp }} USD</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-surface/60">Volume Discount Applied</span>
                <span class="text-accent-orange font-medium">-{{ calculatedDiscount }}%</span>
              </div>
              <hr class="border-white/10" />
              <div class="flex justify-between items-baseline">
                <span class="text-base font-bold text-surface">Total Partnership Cost</span>
                <span class="text-3xl font-extrabold text-surface">${{ totalMonthlyCost }}</span>
              </div>
              <div class="flex justify-between text-xs text-green-400 bg-green-500/10 p-2.5 rounded border border-green-500/20">
                <span>Estimated Monthly Savings</span>
                <span class="font-bold">+${{ totalSavings }} USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-20 px-6 max-w-6xl mx-auto space-y-16">
      <div class="text-center space-y-3">
        <h2 class="text-3xl font-bold font-display text-surface">Engineered for Travel Operations</h2>
        <p class="text-surface/70 max-w-xl mx-auto">Discover the utility features built exclusively for vislet partner agencies.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-white/5 p-6 rounded-card border border-white/5 space-y-4">
          <div class="h-10 w-10 bg-accent-blue/10 rounded-full flex items-center justify-center text-accent-blue">
            <span class="text-xl">📊</span>
          </div>
          <h3 class="text-xl font-bold text-surface">Consolidated Client Board</h3>
          <p class="text-sm text-surface/60">Track status across multiple client files from a single dashboard. Filter by approval status or country.</p>
        </div>

        <div class="bg-white/5 p-6 rounded-card border border-white/5 space-y-4">
          <div class="h-10 w-10 bg-accent-orange/10 rounded-full flex items-center justify-center text-accent-orange">
            <span class="text-xl">📁</span>
          </div>
          <h3 class="text-xl font-bold text-surface">Quick Form Templates</h3>
          <p class="text-sm text-surface/60">Submit applications quickly on behalf of client passengers. Simply upload their scanned passport for auto-extract.</p>
        </div>

        <div class="bg-white/5 p-6 rounded-card border border-white/5 space-y-4">
          <div class="h-10 w-10 bg-green-400/10 rounded-full flex items-center justify-center text-green-400">
            <span class="text-xl">⚡</span>
          </div>
          <h3 class="text-xl font-bold text-surface">Developer Webhooks</h3>
          <p class="text-sm text-surface/60">Receive real-time automated API updates to your CRM system whenever a client's visa undergoes status change.</p>
        </div>
      </div>
    </section>

    <!-- Contact Apply Modal -->
    <div v-if="showApplyModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <AppCard tone="dark" class="max-w-md w-full space-y-4">
        <div class="flex justify-between items-center border-b border-white/10 pb-3">
          <h3 class="text-lg font-bold text-surface">Partner Application</h3>
          <button type="button" @click="showApplyModal = false" class="text-surface/60 hover:text-surface text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        <form @submit.prevent="submitApplication" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-surface/80 mb-1">Company / Agency Name</label>
            <input v-model="companyName" required type="text" class="w-full bg-navy border border-white/20 hover:border-white/40 focus:border-accent-orange rounded-control p-2.5 outline-none text-surface transition-colors" placeholder="Acme Travel Ltd" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface/80 mb-1">Contact Email Address</label>
            <input v-model="contactEmail" required type="email" class="w-full bg-navy border border-white/20 hover:border-white/40 focus:border-accent-orange rounded-control p-2.5 outline-none text-surface transition-colors" placeholder="agent@acmetravel.com" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface/80 mb-1">Estimated Monthly Volume</label>
            <select v-model="estVolume" class="w-full bg-navy border border-white/20 hover:border-white/40 focus:border-accent-orange rounded-control p-2.5 outline-none text-surface transition-colors">
              <option value="1-10">1-10 Visas / month</option>
              <option value="10-50">10-50 Visas / month</option>
              <option value="50-150">50-150 Visas / month</option>
              <option value="150+">150+ Visas / month</option>
            </select>
          </div>
          <AppButton type="submit" variant="primary" class="w-full bg-accent-orange text-navy hover:bg-accent-orange/90 py-3" :loading="formSubmitted">
            Submit Application
          </AppButton>
        </form>
      </AppCard>
    </div>

    <!-- Footer -->
    <footer class="border-t border-white/10 bg-navy/80 py-12 text-surface/50 text-sm">
      <div class="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div class="font-display text-xl font-bold text-surface tracking-tight">Vislet B2B</div>
          <p class="text-xs text-surface/40">Enterprise Visa Logistics Engine.</p>
        </div>
        <p class="text-xs">&copy; 2026 Vislet. B2B Services. Private — Urban Arts / Vislet team.</p>
      </div>
    </footer>
  </div>
</template>
