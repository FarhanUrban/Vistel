<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/services/contactConfig'

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
    <main class="mx-auto max-w-3xl px-6 py-12 space-y-6 text-navy/80">
      <h1 class="font-display text-3xl font-bold text-navy">Terms of Service</h1>
      <p class="text-sm text-navy/50">Last updated: July 2026. This is a product placeholder for legal review.</p>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Service description</h2>
        <p>
          Vislet helps applicants prepare and submit visa / e-visa applications, and helps agencies
          review those applications for assigned destination countries.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Accounts</h2>
        <p>
          You are responsible for keeping login credentials secure. Agency accounts may receive a
          temporary password from an administrator and must set a new password on first login.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Applications & decisions</h2>
        <p>
          Submitting through Vislet does not guarantee visa approval. Decisions are made by reviewing
          agencies or governments. Vislet platform admins do not approve or reject individual visas.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Fees</h2>
        <p>
          Displayed fees may be estimates. Until live payments are enabled, checkout is a sandbox
          experience and does not complete a real financial transaction.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Acceptable use</h2>
        <p>
          Do not upload false documents, attempt to access another user’s data, or abuse rate limits.
          We may suspend accounts that violate these terms.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Limitation of liability</h2>
        <p>
          Vislet is provided as-is for the current product stage. We are not liable for travel
          disruptions, consulate decisions, or losses arising from reliance on mock payment flows.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Refunds</h2>
        <p>
          Visa and e-visa purchases are final. Once payment is completed for an application, refunds
          are not available.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-bold text-navy">Customer Support</h2>
        <p>
          <a :href="SUPPORT_MAILTO" class="font-medium text-accent-blue hover:underline">
            {{ SUPPORT_EMAIL }}
          </a>
        </p>
      </section>
    </main>
  </div>
</template>
