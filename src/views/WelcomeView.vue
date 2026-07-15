<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AppCard from '@/components/AppCard.vue'
import AppLogo from '@/components/AppLogo.vue'
import AppButton from '@/components/AppButton.vue'

const router = useRouter()
const route = useRoute()

const accountDeleted = computed(() => route.query.accountDeleted === '1')

function goToSignup() {
  router.push({ name: 'Signup' })
}

function goToLogin() {
  router.push({ name: 'Login' })
}

function dismissDeletedBanner() {
  router.replace({ name: 'Welcome' })
}
</script>

<template>
  <AuthLayout>
    <AppCard class="text-center">
      <div
        v-if="accountDeleted"
        class="mb-6 rounded-control border border-green-200 bg-green-50 px-4 py-3 text-left"
        role="status"
      >
        <p class="text-sm font-semibold text-green-800">Account deleted</p>
        <p class="mt-1 text-sm text-green-700">
          Your account has been permanently deleted. Sign-in credentials and stored documents for
          this account are gone.
        </p>
        <button
          type="button"
          class="mt-2 text-xs font-medium text-green-800 underline"
          @click="dismissDeletedBanner"
        >
          Dismiss
        </button>
      </div>

      <AppLogo class="text-navy" />
      <h1 class="font-display text-2xl font-bold text-navy mt-4">Vislet</h1>
      <p class="text-gray-500 mt-2 mb-8">
        Simplify your visa and e-visa applications — documents, payment, and tracking in one place.
      </p>
      <div class="space-y-3">
        <AppButton full-width @click="goToSignup">Get Started</AppButton>
        <AppButton variant="outline" full-width @click="goToLogin">Log In</AppButton>
      </div>
      <p class="mt-6 text-xs text-gray-400 leading-relaxed">
        Document files are stored securely in the cloud. Application progress on this device may be
        cleared if you wipe browser data.
      </p>
    </AppCard>
  </AuthLayout>
</template>
