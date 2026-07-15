<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AppCard from '@/components/AppCard.vue'
import AppLogo from '@/components/AppLogo.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import SocialSignInButtons from '@/features/auth/components/SocialSignInButtons.vue'
import { useAuthStore } from '@/features/auth/store'
import { getPostAuthRoute } from '@/features/auth/utils'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

function afterLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  router.push(getPostAuthRoute(redirect, authStore.user?.role))
}

async function handleSubmit() {
  await authStore.login(email.value, password.value)
  if (authStore.user) {
    afterLogin()
  }
}

function handleSocialSuccess() {
  afterLogin()
}
</script>

<template>
  <AuthLayout>
    <AppCard>
      <div class="mb-6 text-center">
        <button
          type="button"
          class="mb-4 text-sm font-medium text-accent-blue hover:underline"
          @click="router.push({ name: 'Landing' })"
        >
          ← Back
        </button>
        <AppLogo class="text-navy" />
        <h1 class="mt-4 text-2xl font-semibold text-navy">Welcome back</h1>
        <p class="mt-1 text-navy/60">Log in to continue your visa application</p>
      </div>

      <AppErrorMessage v-if="authStore.error" :message="authStore.error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <AppInput v-model="email" label="Email" type="email" placeholder="you@example.com" />
        <AppInput v-model="password" label="Password" type="password" placeholder="••••••••" />
        <AppButton type="submit" full-width :loading="authStore.isLoading">Log In</AppButton>
      </form>

      <p class="mt-3 text-center text-xs text-navy/45">
        Demo portals:
        <span class="font-medium text-navy/70">admin@vislet.com</span>
        /
        <span class="font-medium text-navy/70">agency@vislet.com</span>
        (any password)
      </p>

      <SocialSignInButtons @success="handleSocialSuccess" />

      <p class="mt-6 text-center text-sm text-navy/60">
        Don't have an account?
        <RouterLink to="/signup" class="font-medium text-accent-blue">Sign up</RouterLink>
      </p>
    </AppCard>
  </AuthLayout>
</template>
