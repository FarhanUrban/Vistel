<script setup lang="ts">
import AppShell from '@/layouts/AppShell.vue'
import AppCard from '@/components/AppCard.vue'
import AppLogo from '@/components/AppLogo.vue'
</script>

<template>
  <AppShell>
    <div class="text-center mb-8">
      <AppLogo />
      <h1 class="text-2xl font-semibold text-navy mt-4">About Vislet</h1>
    </div>

    <AppCard class="mb-4">
      <h2 class="font-medium text-navy mb-2">Our mission</h2>
      <p class="text-sm text-gray-600 leading-relaxed">
        Vislet simplifies applying for visas and e-visas. We tell you what documents you need, help
        you scan and upload them, handle payment, and track your application status — all in one
        mobile-first dashboard.
      </p>
    </AppCard>

    <AppCard class="mb-4">
      <h2 class="font-medium text-navy mb-2">What we offer</h2>
      <ul class="text-sm text-gray-600 space-y-2">
        <li>📄 Document requirements by country and visa type</li>
        <li>📷 Scan and upload from your phone</li>
        <li>💳 Secure payment processing</li>
        <li>📊 Real-time application tracking</li>
        <li>📅 Interview scheduling reminders</li>
      </ul>
    </AppCard>

    <AppCard>
      <h2 class="font-medium text-navy mb-2">Contact</h2>
      <p class="text-sm text-gray-600">support@vislet.app</p>
    </AppCard>
  </AppShell>
</template>
