<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useAuthStore } from '@/features/auth/store'
import {
  getAllCountries,
  getVisaRequirement,
  normalizeRequirement,
  getCountryName,
  iso2ToFlag,
} from '@/services/visaIndexService'
import { DEFAULT_LIVE_COUNTRIES } from '@/services/platformConfig'
import {
  getDestinationAvailability,
  isDestinationAvailable,
  listAvailableDestinations,
} from '@/services/agencyOrgService'
import {
  getPromoBannerConfig,
  shouldShowPromoBanner,
  dismissPromoBanner,
  type PromoBannerConfig,
} from '@/services/promoBannerService'
import { hydratePlatformFromRemote, platformRevision } from '@/services/platformStorage'
import AppButton from '@/components/AppButton.vue'
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/services/contactConfig'

const router = useRouter()
const onboardingStore = useOnboardingStore()
const authStore = useAuthStore()

const countries = getAllCountries()
const passportIso2 = ref('')
const destinationIso2 = ref('')

const promoConfig = ref<PromoBannerConfig>(getPromoBannerConfig())
const showPromo = ref(false)

const carouselRef = ref<HTMLElement | null>(null)
const carouselIndex = ref(0)
const openStep = ref(0)
const checkerRef = ref<HTMLElement | null>(null)

const destinationCountries = computed(() => {
  void platformRevision.value
  if (!passportIso2.value) return countries
  return countries.filter((c) => c.iso2 !== passportIso2.value)
})

const requirement = computed(() => {
  if (!passportIso2.value || !destinationIso2.value) return null
  return normalizeRequirement(getVisaRequirement(passportIso2.value, destinationIso2.value))
})

interface DestinationCard {
  iso2: string
  name: string
  image: string
  badge: string
  availability: 'available' | 'onboarding' | 'coming_soon'
}

const SHOWCASE_EXTRA = ['JP', 'FR', 'IT'] as const

const destinationCards = computed<DestinationCard[]>(() => {
  void platformRevision.value
  const available = new Set(listAvailableDestinations())
  const ordered = [
    ...new Set([...DEFAULT_LIVE_COUNTRIES, ...available, ...SHOWCASE_EXTRA]),
  ]
  return ordered.map((iso2) => {
    let badge = 'Visa'
    if (passportIso2.value) {
      const req = normalizeRequirement(getVisaRequirement(passportIso2.value, iso2))
      if (req?.category === 'e-visa' || req?.category === 'eta') badge = 'E-Visa'
      else if (req?.label) badge = req.label.includes('E-Visa') || req.label.includes('e-visa') ? 'E-Visa' : 'Visa'
    } else if (iso2 === 'AU' || iso2 === 'CA') {
      badge = 'E-Visa'
    }
    return {
      iso2,
      name: getCountryName(iso2),
      image: `/landing/country-${iso2.toLowerCase()}.jpg`,
      badge,
      availability: getDestinationAvailability(iso2),
    }
  })
})

const supportEmail = SUPPORT_EMAIL
const supportMailto = SUPPORT_MAILTO

const faqItems = [
  {
    q: 'How do I apply for a visa or e-visa?',
    a: 'Choose your passport and destination, review the required documents, upload them, and submit. An agency for that destination reviews your application.',
  },
  {
    q: 'Why can’t I select some destinations?',
    a: 'Destinations open once an active reviewing agency is assigned. “Agency onboarding” means a partner is still being set up.',
  },
  {
    q: 'How long does review take?',
    a: 'Timing depends on the reviewing agency and destination. You’ll get a notification when a decision is ready.',
  },
  {
    q: 'What if my application is rejected?',
    a: 'You’ll see a rejection code with a clear explanation so you know what to fix before applying again.',
  },
  {
    q: 'Can I get a refund after purchasing a visa?',
    a: 'No. Visa purchases are final. Once you complete payment for a visa or e-visa application, refunds are not available.',
  },
  {
    q: 'How do I contact customer support?',
    a: `Email us at ${SUPPORT_EMAIL}. We can help with account access, application status questions, and partner onboarding.`,
  },
  {
    q: 'How do agencies get set up?',
    a: 'An admin creates your organization, assigns destination countries, and shares a temporary password so reviewers can sign in.',
  },
  {
    q: 'What are rejection codes?',
    a: 'Standardized reasons agencies choose when rejecting an application. Applicants see the title and description in their dashboard.',
  },
  {
    q: 'How is my data protected?',
    a: 'Applications and documents are stored in authorized cloud storage. Only the assigned reviewing agency and platform admins can access them after login.',
  },
  {
    q: 'Is payment real?',
    a: 'Checkout currently runs in a secure sandbox for staging. Treat fees and receipts as mock transactions until live billing is enabled.',
  },
]

const openFaq = ref<number | null>(0)

const howItWorksSteps = [
  {
    title: 'Choose passport and destination',
    body: 'Pick your passport nationality and where you’re going. Vislet looks up the visa path for that pair.',
  },
  {
    title: 'See required documents',
    body: 'Get a clear checklist tailored to your route so you know exactly what to prepare before you apply.',
  },
  {
    title: 'Upload and submit securely',
    body: 'Add photos or PDFs, confirm details, and submit your application through Vislet’s secure flow.',
  },
  {
    title: 'Agency / government review',
    body: 'A reviewing organization checks your submission. You’ll be notified if anything needs attention.',
  },
  {
    title: 'Pay and track status',
    body: 'Complete checkout when required, then follow approval progress from your dashboard until you’re done.',
  },
]

onMounted(async () => {
  await hydratePlatformFromRemote()
  promoConfig.value = getPromoBannerConfig()
  showPromo.value = shouldShowPromoBanner()
})

function closePromo() {
  dismissPromoBanner()
  showPromo.value = false
}

function startApplicationFromWidget() {
  void platformRevision.value
  if (!passportIso2.value || !destinationIso2.value) return
  if (!isDestinationAvailable(destinationIso2.value)) {
    checkerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  onboardingStore.startNewVisa()
  onboardingStore.setPassportCountry(passportIso2.value)
  onboardingStore.setDestinationCountry(destinationIso2.value)
  onboardingStore.setPassportType('regular')

  const req = requirement.value
  if (req?.category === 'e-visa' || req?.category === 'eta') {
    onboardingStore.setVisaType('e-visa')
  } else {
    onboardingStore.setVisaType('tourist')
  }

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

function selectDestinationCard(iso2: string) {
  destinationIso2.value = iso2
  checkerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onCarouselScroll() {
  const el = carouselRef.value
  if (!el) return
  const card = el.querySelector('[data-card]') as HTMLElement | null
  if (!card) return
  const gap = 16
  const step = card.offsetWidth + gap
  carouselIndex.value = Math.round(el.scrollLeft / step)
}

function scrollCarousel(dir: -1 | 1) {
  const el = carouselRef.value
  if (!el) return
  const card = el.querySelector('[data-card]') as HTMLElement | null
  if (!card) return
  el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: 'smooth' })
}

async function goToCarouselDot(index: number) {
  const el = carouselRef.value
  if (!el) return
  await nextTick()
  const card = el.querySelector('[data-card]') as HTMLElement | null
  if (!card) return
  el.scrollTo({ left: index * (card.offsetWidth + 16), behavior: 'smooth' })
}
</script>

<template>
  <div class="landing min-h-screen bg-surface selection:bg-accent-orange/30">
    <!-- Promo banner -->
    <div
      v-if="showPromo"
      class="promo-banner relative z-[60] bg-navy text-surface"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 text-center text-sm sm:text-base">
        <p class="font-medium">
          {{ promoConfig.message }}
          <RouterLink
            :to="promoConfig.ctaHref"
            class="ml-2 font-semibold text-accent-orange underline-offset-2 hover:underline"
          >
            {{ promoConfig.ctaLabel }}
          </RouterLink>
        </p>
        <button
          v-if="promoConfig.dismissible"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-surface/70 hover:text-surface"
          aria-label="Dismiss promo"
          @click="closePromo"
        >
          <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Nav -->
    <header class="sticky top-0 z-50 border-b border-navy/5 bg-surface/90 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
        <RouterLink to="/" class="font-display text-2xl font-black tracking-tight text-navy sm:text-3xl">
          Vislet
        </RouterLink>
        <div class="flex items-center gap-2 sm:gap-3">
          <AppButton variant="outline" size="sm" @click="handleTrack">
            {{ authStore.user ? 'Dashboard' : 'Login' }}
          </AppButton>
          <AppButton variant="primary" size="sm" class="landing-btn-hover" @click="handleGetStarted">
            {{ authStore.user ? 'Apply Now' : 'Get Started Now' }}
          </AppButton>
        </div>
      </div>
    </header>

    <!-- Hero (full-bleed) -->
    <section class="hero relative isolate min-h-[min(92vh,820px)] overflow-hidden">
      <img
        src="/landing/hero.jpg"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
        width="1600"
        height="1131"
      />
      <div class="hero-gradient absolute inset-0" aria-hidden="true" />
      <div class="relative z-10 mx-auto flex min-h-[min(92vh,820px)] max-w-7xl flex-col justify-center px-5 py-20 sm:px-6 lg:py-28">
        <div class="hero-copy max-w-xl space-y-6 text-surface">
          <p class="font-display text-lg font-bold tracking-tight text-accent-orange sm:text-xl">Vislet</p>
          <h1 class="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Visa applications, simplified.
          </h1>
          <p class="max-w-md text-base text-surface/85 sm:text-lg">
            Tell Vislet where you’re going and we’ll tell you what documents you need, handle secure checkout,
            and track approval from a single dashboard.
          </p>

          <div class="hero-widget mt-4 rounded-2xl bg-surface/95 p-3 shadow-lg backdrop-blur-sm sm:p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div class="min-w-0 flex-1 space-y-1.5">
                <label for="hero-passport" class="block text-xs font-semibold uppercase tracking-wide text-navy/55">
                  Passport
                </label>
                <select
                  id="hero-passport"
                  v-model="passportIso2"
                  class="w-full rounded-control border border-muted bg-white p-3 text-sm font-medium text-navy outline-none focus:border-accent-blue"
                >
                  <option value="" disabled>Select nationality</option>
                  <option v-for="c in countries" :key="c.iso2" :value="c.iso2">
                    {{ c.flag }} {{ c.name }}
                  </option>
                </select>
              </div>
              <div class="min-w-0 flex-1 space-y-1.5">
                <label for="hero-dest" class="block text-xs font-semibold uppercase tracking-wide text-navy/55">
                  Destination
                </label>
                <select
                  id="hero-dest"
                  v-model="destinationIso2"
                  :disabled="!passportIso2"
                  class="w-full rounded-control border border-muted bg-white p-3 text-sm font-medium text-navy outline-none focus:border-accent-blue disabled:opacity-50"
                >
                  <option value="" disabled>Where to?</option>
                  <option
                    v-for="c in destinationCountries"
                    :key="c.iso2"
                    :value="c.iso2"
                    :disabled="!isDestinationAvailable(c.iso2)"
                  >
                    {{ c.flag }} {{ c.name
                    }}{{ isDestinationAvailable(c.iso2) ? '' : ' (not open yet)' }}
                  </option>
                </select>
              </div>
              <button
                type="button"
                class="landing-btn-hover shrink-0 rounded-control bg-accent-orange px-5 py-3 text-sm font-bold text-navy disabled:opacity-40"
                :disabled="!passportIso2 || !destinationIso2"
                @click="startApplicationFromWidget"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Countries carousel -->
    <section class="countries-section bg-surface px-5 py-16 sm:px-6 sm:py-20">
      <div class="mx-auto max-w-7xl">
        <div class="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 class="font-display text-2xl font-bold text-navy sm:text-3xl">Countries we work with</h2>
            <p class="mt-2 max-w-lg text-sm text-navy/60">
              Live review destinations plus popular routes. Tap a card to check requirements.
            </p>
          </div>
          <div class="hidden gap-2 sm:flex">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-muted text-navy hover:bg-navy hover:text-surface"
              aria-label="Previous countries"
              @click="scrollCarousel(-1)"
            >
              ‹
            </button>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-muted text-navy hover:bg-navy hover:text-surface"
              aria-label="Next countries"
              @click="scrollCarousel(1)"
            >
              ›
            </button>
          </div>
        </div>

        <div
          ref="carouselRef"
          class="carousel flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          @scroll.passive="onCarouselScroll"
        >
          <button
            v-for="card in destinationCards"
            :key="card.iso2"
            type="button"
            data-card
            class="group relative w-[min(78vw,280px)] shrink-0 snap-start overflow-hidden rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            @click="selectDestinationCard(card.iso2)"
          >
            <div class="aspect-[3/4] overflow-hidden">
              <img
                :src="card.image"
                :alt="card.name"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                width="800"
                height="1067"
              />
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/20 to-transparent" />
            <span
              class="absolute left-3 top-3 rounded-md bg-surface/95 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-navy"
            >
              {{ card.badge }}
            </span>
            <div class="absolute inset-x-0 bottom-0 p-4 text-surface">
              <p class="text-lg font-bold">{{ iso2ToFlag(card.iso2) }} {{ card.name }}</p>
              <p class="text-xs text-surface/70">
                <template v-if="card.availability === 'available'">Open for applications</template>
                <template v-else-if="card.availability === 'onboarding'">Agency onboarding</template>
                <template v-else>Coming soon</template>
              </p>
            </div>
          </button>
        </div>

        <div class="mt-6 flex justify-center gap-2">
          <button
            v-for="(_, i) in destinationCards"
            :key="i"
            type="button"
            class="h-2 w-2 rounded-full transition-colors"
            :class="carouselIndex === i ? 'bg-navy' : 'bg-navy/25'"
            :aria-label="`Go to slide ${i + 1}`"
            @click="goToCarouselDot(i)"
          />
        </div>
      </div>
    </section>

    <!-- Visa requirements checker -->
    <section ref="checkerRef" id="estimator" class="bg-surface px-5 pb-16 sm:px-6 sm:pb-24">
      <div class="mx-auto max-w-5xl">
        <div class="mb-8 text-center">
          <h2 class="font-display text-2xl font-bold text-navy sm:text-3xl">
            Check your visa requirements
          </h2>
          <p class="mt-2 text-sm text-navy/60">
            Choose your passport and destination to estimate what you’ll need.
          </p>
        </div>

        <div class="overflow-hidden rounded-3xl bg-navy text-surface shadow-xl lg:grid lg:grid-cols-2">
          <div class="space-y-5 p-6 sm:p-8 lg:p-10">
            <div class="space-y-2">
              <label for="passport-select" class="block text-sm font-medium text-surface/80">
                Your passport nationality
              </label>
              <select
                id="passport-select"
                v-model="passportIso2"
                class="w-full rounded-control border border-white/20 bg-navy/80 p-3 text-surface outline-none focus:border-accent-blue"
              >
                <option value="" disabled>Select your country</option>
                <option v-for="country in countries" :key="country.iso2" :value="country.iso2" class="bg-navy">
                  {{ country.flag }} {{ country.name }}
                </option>
              </select>
            </div>
            <div class="space-y-2">
              <label for="destination-select" class="block text-sm font-medium text-surface/80">
                Destination country
              </label>
              <select
                id="destination-select"
                v-model="destinationIso2"
                :disabled="!passportIso2"
                class="w-full rounded-control border border-white/20 bg-navy/80 p-3 text-surface outline-none focus:border-accent-blue disabled:opacity-50"
              >
                <option value="" disabled>Select destination</option>
                <option
                  v-for="country in destinationCountries"
                  :key="country.iso2"
                  :value="country.iso2"
                  class="bg-navy"
                  :disabled="!isDestinationAvailable(country.iso2)"
                >
                  {{ country.flag }} {{ country.name
                  }}{{ isDestinationAvailable(country.iso2) ? '' : ' (not open yet)' }}
                </option>
              </select>
            </div>

            <Transition name="fade">
              <div v-if="requirement" class="space-y-4 border-t border-white/10 pt-5">
                <div class="flex items-start gap-3">
                  <span class="text-3xl">{{ iso2ToFlag(destinationIso2) }}</span>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-accent-orange">Estimate</p>
                    <h3 class="text-xl font-bold">{{ requirement.label }}</h3>
                    <p class="mt-1 text-xs text-surface/60">
                      {{ getCountryName(passportIso2) }} → {{ getCountryName(destinationIso2) }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="landing-btn-hover w-full rounded-control bg-accent-orange py-3 px-6 font-semibold text-navy"
                  @click="startApplicationFromWidget"
                >
                  Apply via Vislet
                </button>
              </div>
            </Transition>
          </div>

          <div class="relative hidden min-h-[280px] lg:block">
            <div class="absolute inset-0 bg-gradient-to-br from-accent-blue/30 via-navy to-navy" />
            <div class="relative flex h-full flex-col items-center justify-center gap-6 p-10">
              <div class="flex items-center gap-4 text-center">
                <div class="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-sm">
                  <p class="text-3xl leading-none">{{ passportIso2 ? iso2ToFlag(passportIso2) : '—' }}</p>
                  <p class="mt-2 text-xs font-semibold uppercase tracking-wide text-surface/60">Passport</p>
                  <p class="text-sm font-medium">{{ passportIso2 ? getCountryName(passportIso2) : 'Select' }}</p>
                </div>
                <svg class="h-6 w-6 text-accent-orange" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <div class="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-sm">
                  <p class="text-3xl leading-none">{{ destinationIso2 ? iso2ToFlag(destinationIso2) : '—' }}</p>
                  <p class="mt-2 text-xs font-semibold uppercase tracking-wide text-surface/60">Destination</p>
                  <p class="text-sm font-medium">
                    {{ destinationIso2 ? getCountryName(destinationIso2) : 'Select' }}
                  </p>
                </div>
              </div>
              <p class="max-w-xs text-center text-sm text-surface/55">
                Instant estimate from the global visa index — then apply in one flow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature bento -->
    <section id="features" class="bg-surface px-5 pb-16 sm:px-6 sm:pb-24">
      <div class="mx-auto max-w-6xl">
        <div class="mb-10 text-center">
          <h2 class="font-display text-2xl font-bold text-navy sm:text-3xl">Everything you need to travel</h2>
          <p class="mt-2 text-sm text-navy/60">Vislet streamlines visa logistics so you can focus on the trip.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <div class="bento-panel rounded-3xl bg-navy p-7 text-surface md:row-span-2">
            <p class="text-xs font-bold uppercase tracking-wider text-accent-blue">Index</p>
            <h3 class="mt-3 font-display text-2xl font-bold leading-tight">Global Visa Index</h3>
            <p class="mt-4 text-sm leading-relaxed text-surface/70">
              Instant checkups on travel freedom and visa compliance for over 190 countries.
            </p>
            <div class="mt-8 hidden h-32 rounded-2xl bg-gradient-to-br from-accent-blue/25 to-transparent md:block" />
          </div>

          <div class="bento-panel rounded-3xl bg-navy p-7 text-surface">
            <p class="text-xs font-bold uppercase tracking-wider text-accent-orange">Documents</p>
            <h3 class="mt-2 text-lg font-bold">Document upload</h3>
            <p class="mt-2 text-sm text-surface/65">
              Take photos or upload PDFs. Layout checks run before you submit.
            </p>
          </div>

          <div class="bento-panel rounded-3xl bg-navy p-7 text-surface">
            <p class="text-xs font-bold uppercase tracking-wider text-accent-blue">Checkout</p>
            <h3 class="mt-2 text-lg font-bold">Secure checkout</h3>
            <p class="mt-2 text-sm text-surface/65">
              Structured fee payment in a secure sandbox flow during staging.
            </p>
          </div>

          <div class="bento-panel rounded-3xl bg-navy p-7 text-surface md:col-span-2">
            <p class="text-xs font-bold uppercase tracking-wider text-accent-orange">Tracking</p>
            <h3 class="mt-2 text-lg font-bold">Live status tracker</h3>
            <p class="mt-2 max-w-xl text-sm text-surface/65">
              Follow submission, agency review, and final approval from one dashboard.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works accordion -->
    <section id="how-it-works" class="bg-surface px-5 pb-16 sm:px-6 sm:pb-24">
      <div class="mx-auto max-w-3xl">
        <h2 class="mb-8 text-center font-display text-2xl font-bold text-navy sm:text-3xl">
          How Vislet works
        </h2>
        <div class="space-y-3">
          <div
            v-for="(step, index) in howItWorksSteps"
            :key="step.title"
            class="overflow-hidden rounded-2xl transition-colors duration-300"
            :class="openStep === index ? 'bg-accent-blue text-navy' : 'bg-navy/5 text-navy'"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              :aria-expanded="openStep === index"
              @click="openStep = openStep === index ? -1 : index"
            >
              <span class="flex items-center gap-3 font-semibold sm:text-lg">
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  :class="openStep === index ? 'bg-navy text-surface' : 'bg-navy text-surface'"
                >
                  {{ index + 1 }}
                </span>
                {{ step.title }}
              </span>
              <span class="text-xl font-light" aria-hidden="true">{{ openStep === index ? '−' : '+' }}</span>
            </button>
            <div v-if="openStep === index" class="px-5 pb-5 pl-[3.75rem] text-sm leading-relaxed opacity-90">
              {{ step.body }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="bg-surface px-5 pb-16 sm:px-6 sm:pb-24">
      <div class="mx-auto max-w-3xl">
        <h2 class="mb-8 text-center font-display text-2xl font-bold text-navy sm:text-3xl">
          Frequently asked questions
        </h2>
        <div class="space-y-3">
          <div
            v-for="(item, index) in faqItems"
            :key="item.q"
            class="overflow-hidden rounded-2xl border border-muted bg-white"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-navy"
              :aria-expanded="openFaq === index"
              @click="openFaq = openFaq === index ? null : index"
            >
              {{ item.q }}
              <span class="text-xl font-light text-navy/40" aria-hidden="true">
                {{ openFaq === index ? '−' : '+' }}
              </span>
            </button>
            <div v-if="openFaq === index" class="px-5 pb-4 text-sm leading-relaxed text-navy/65">
              {{ item.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Yellow CTA -->
    <section class="cta-band relative overflow-hidden bg-accent-orange px-5 py-16 sm:px-6 sm:py-20">
      <svg
        class="pointer-events-none absolute -right-8 top-1/2 h-40 w-40 -translate-y-1/2 text-navy/10 sm:h-56 sm:w-56"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
      >
        <path d="M10 60h70M55 30l40 30-40 30" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="95" cy="60" r="12" stroke="currentColor" stroke-width="6" />
      </svg>
      <div class="relative mx-auto flex max-w-4xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="max-w-md font-display text-3xl font-extrabold leading-tight text-navy sm:text-4xl">
          Ready to simplify your next journey?
        </h2>
        <AppButton
          variant="primary"
          size="lg"
          class="landing-btn-hover !bg-navy !text-surface shrink-0"
          @click="handleGetStarted"
        >
          Get Started Now
        </AppButton>
      </div>
    </section>

    <!-- Footer -->
    <footer class="rounded-t-[2rem] bg-navy px-5 py-14 text-surface sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div class="max-w-sm space-y-3">
            <div class="font-display text-2xl font-black tracking-tight">Vislet</div>
            <p class="text-sm text-surface/60">
              Visa applications, simplified — check requirements, submit securely, and track approval.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-surface/40">Explore</p>
              <ul class="mt-3 space-y-2 text-sm text-surface/75">
                <li><a href="#features" class="hover:text-surface">Features</a></li>
                <li><a href="#estimator" class="hover:text-surface">Visa checker</a></li>
                <li><a href="#how-it-works" class="hover:text-surface">How it works</a></li>
                <li><a href="#faq" class="hover:text-surface">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-surface/40">Company</p>
              <ul class="mt-3 space-y-2 text-sm text-surface/75">
                <li><RouterLink to="/about" class="hover:text-surface">About</RouterLink></li>
                <li><RouterLink to="/privacy" class="hover:text-surface">Privacy</RouterLink></li>
                <li><RouterLink to="/terms" class="hover:text-surface">Terms</RouterLink></li>
              </ul>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-surface/40">Portals</p>
              <ul class="mt-3 space-y-2 text-sm text-surface/40">
                <li>
                  <RouterLink to="/agency" class="hover:text-surface/70">Agency login</RouterLink>
                </li>
                <li>
                  <RouterLink to="/login?redirect=/admin" class="hover:text-surface/70">Admin</RouterLink>
                </li>
              </ul>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-surface/40">Contact</p>
              <ul class="mt-3 space-y-2 text-sm text-surface/75">
                <li>
                  <a :href="supportMailto" class="hover:text-surface">Customer Support</a>
                </li>
                <li>
                  <a :href="supportMailto" class="hover:text-surface">{{ supportEmail }}</a>
                </li>
                <li>Urban Arts / Vislet</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="mt-12 border-t border-white/10 pt-6 text-xs text-surface/45">
          © 2026 Vislet. Imagery: Unsplash.
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.hero-gradient {
  background: linear-gradient(
    105deg,
    rgba(39, 39, 39, 0.88) 0%,
    rgba(39, 39, 39, 0.55) 42%,
    rgba(39, 39, 39, 0.15) 70%,
    rgba(39, 39, 39, 0.05) 100%
  );
}

.hero-copy {
  animation: hero-in 0.7s ease-out both;
}

@keyframes hero-in {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.landing-btn-hover {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.landing-btn-hover:hover:not(:disabled) {
  transform: translateY(-1px);
  opacity: 0.92;
}

.landing-btn-hover:active:not(:disabled) {
  transform: translateY(0);
}

.bento-panel {
  transition: transform 0.25s ease;
}

.bento-panel:hover {
  transform: translateY(-2px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
