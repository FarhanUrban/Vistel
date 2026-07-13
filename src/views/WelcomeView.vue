<script setup lang="ts">
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AppCard from '@/components/AppCard.vue'
import AppLogo from '@/components/AppLogo.vue'
import AppButton from '@/components/AppButton.vue'

const router = useRouter()

function goToSignup() {
  router.push({ name: 'Signup' })
}

function goToLogin() {
  router.push({ name: 'Login' })
}
</script>

<template>
  <AuthLayout>
    <AppCard class="text-center">
      <AppLogo />
      <h1 class="font-display text-2xl font-bold text-navy mt-4">Vislet</h1>
      <p class="text-gray-500 mt-2 mb-8">
        Simplify your visa and e-visa applications — documents, payment, and tracking in one place.
      </p>
      <div class="space-y-3">
        <AppButton full-width @click="goToSignup">Get Started</AppButton>
        <AppButton variant="outline" full-width @click="goToLogin">Log In</AppButton>
      </div>
      <p class="mt-6 text-xs text-gray-400 leading-relaxed">
        Your visa applications and documents are stored on this device only. They are not saved to
        our servers and may be lost if you clear browser data or switch devices.
      </p>
    </AppCard>
  </AuthLayout>
</template>
