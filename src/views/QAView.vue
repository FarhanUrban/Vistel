<script setup lang="ts">
import { ref, computed } from 'vue'
import AppShell from '@/layouts/AppShell.vue'
import AppCard from '@/components/AppCard.vue'
import AppSearchInput from '@/components/AppSearchInput.vue'
import AppLogo from '@/components/AppLogo.vue'

interface FAQItem {
  question: string
  answer: string
  category: 'general' | 'process' | 'payments' | 'requirements'
}

const faqs: FAQItem[] = [
  {
    category: 'general',
    question: 'What is Vislet?',
    answer:
      'Vislet is a modern, simplified visa and e-visa application platform. We help you check travel visa requirements, scan and prepare documents, handle secure mock checkout payments, and track the review progress in a single visual dashboard.',
  },
  {
    category: 'process',
    question: 'How long does the visa review process take?',
    answer:
      'For standard mock application processes, initial document scanning and verification takes about 10-15 seconds. Once submitted, you can watch each step of the review process (verification, background checks, and routing) update live on your dashboard.',
  },
  {
    category: 'requirements',
    question: 'What documents are required to apply?',
    answer:
      'This depends on your destination and passport country. Most applications require a clear color scan of your passport information page and a passport-sized photograph. Some destinations may require travel itineraries or residence details.',
  },
  {
    category: 'payments',
    question: 'Is my payment secure?',
    answer:
      'Absolutely. Vislet runs fully in a secure staging sandbox. Payments are mock payments processed locally in your browser. No real credit card details are ever saved, and no real currency is charged.',
  },
  {
    category: 'process',
    question: 'What should I do if my application is rejected?',
    answer:
      'If an application is rejected due to issues like poor scan quality, a notice will appear in the dashboard. You will see the exact rejection reason and can easily correct the documents and re-apply immediately.',
  },
  {
    category: 'general',
    question: 'Do I need to attend an interview?',
    answer:
      'Some consulate-level visa types require in-person interviews. If scheduled, the interview details will be listed on your dashboard under "Upcoming interviews", where you can view location, date, and notes.',
  },
]

const searchQuery = ref('')
const activeIndex = ref<number | null>(null)

const filteredFaqs = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return faqs
  return faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.category.toLowerCase().includes(query),
  )
})

function toggleAccordion(index: number) {
  if (activeIndex.value === index) {
    activeIndex.value = null
  } else {
    activeIndex.value = index
  }
}
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-2xl px-1">
      <div class="mb-8 text-center">
        <div class="inline-flex justify-center mb-3">
          <AppLogo />
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-navy sm:text-4xl">Q&A Help Center</h1>
        <p class="mt-2 text-sm text-navy/60">
          Have questions about the application checklist, review times, fees, or status updates?
          Find answers below.
        </p>
      </div>

      <!-- Search Section -->
      <div class="mb-6">
        <AppSearchInput v-model="searchQuery" placeholder="Search questions..." />
      </div>

      <!-- FAQ Accordion List -->
      <div v-if="filteredFaqs.length > 0" class="space-y-3">
        <AppCard
          v-for="(faq, idx) in filteredFaqs"
          :key="idx"
          class="!p-0 overflow-hidden border border-muted transition-all duration-300 hover:border-accent-blue/30"
        >
          <!-- Accordion Header Button -->
          <button
            type="button"
            class="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-navy transition-colors hover:bg-accent-blue/5 focus:outline-none"
            @click="toggleAccordion(idx)"
          >
            <span class="pr-4 text-base font-semibold leading-snug">{{ faq.question }}</span>
            <span
              class="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted transition-transform duration-300"
              :class="{ 'rotate-180 bg-accent-orange/20 text-navy': activeIndex === idx }"
            >
              <svg
                class="h-4 w-4 text-navy/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </button>

          <!-- Accordion Answer panel -->
          <div
            class="transition-all duration-300 ease-in-out"
            :class="
              activeIndex === idx
                ? 'max-h-60 opacity-100 border-t border-muted/50'
                : 'max-h-0 opacity-0 pointer-events-none'
            "
          >
            <div class="px-5 py-4 text-sm leading-relaxed text-navy/80 bg-surface/50">
              {{ faq.answer }}
              <div class="mt-3 flex items-center">
                <span
                  class="inline-flex items-center rounded-full bg-accent-blue/15 px-2 py-0.5 text-xs font-semibold text-accent-blue capitalize"
                >
                  #{{ faq.category }}
                </span>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <div v-else class="text-center py-12">
        <p class="text-navy/50 font-medium">No results found for "{{ searchQuery }}"</p>
        <p class="text-sm text-navy/40 mt-1">
          Try typing a different search term like "payment" or "document".
        </p>
      </div>
    </div>
  </AppShell>
</template>
