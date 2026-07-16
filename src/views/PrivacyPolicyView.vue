<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-surface">
    <header class="border-b border-muted bg-white px-6 py-4">
      <div class="mx-auto flex max-w-3xl items-center justify-between">
        <RouterLink to="/" class="font-display text-xl font-black text-navy">Vislet</RouterLink>
        <AppButton variant="outline" size="sm" @click="router.push({ name: 'Landing' })">
          Back
        </AppButton>
      </div>
    </header>
    <main class="mx-auto max-w-3xl px-6 py-12 prose prose-navy space-y-6 text-navy/80">
      <h1 class="font-display text-3xl font-bold text-navy !mb-2">Privacy Policy</h1>
      <p class="text-sm text-navy/50">Last updated: July 2026. This is a product placeholder for legal review.</p>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">What we collect</h2>
        <p>
          Account details (email, display name), application metadata (destination, visa type, status),
          uploaded document files, and questionnaire answers needed to process a visa application.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">How we use data</h2>
        <p>
          We use your information to run the Vislet application flow: check requirements, store
          documents, route submissions to a reviewing agency for the destination country, process
          sandbox payments, and show status updates.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Encryption</h2>
        <p>
          Sensitive application answers and document metadata are encrypted to the destination
          country’s public key. Private keys are held by the reviewing agency, not Vislet admins.
          Admins see aggregate counts only, not application contents.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Payments</h2>
        <p>
          Checkout currently runs in a mock / sandbox mode for staging. Do not enter real card numbers
          expecting a live charge until Vislet announces production billing.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Agency review</h2>
        <p>
          Applications are assigned to agencies registered for the destination country. Agencies can
          approve or reject applications; platform admins cannot approve or reject visas.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Account deletion</h2>
        <p>
          You may delete your account from Profile. That removes your local session data and requests
          deletion of associated cloud files where supported.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Contact</h2>
        <p>Questions: hello@vislet.org</p>
      </section>
    </main>
  </div>
</template>
