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
  router.push(getPostAuthRoute(redirect))
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
      <div class="text-center mb-6">
        <AppLogo />
        <h1 class="text-2xl font-semibold text-navy mt-4">Welcome back</h1>
        <p class="text-gray-500 mt-1">Log in to continue your visa application</p>
      </div>

      <AppErrorMessage v-if="authStore.error" :message="authStore.error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <AppInput v-model="email" label="Email" type="email" placeholder="you@example.com" />
        <AppInput v-model="password" label="Password" type="password" placeholder="••••••••" />
        <AppButton type="submit" full-width :loading="authStore.isLoading">Log In</AppButton>
      </form>

      <SocialSignInButtons @success="handleSocialSuccess" />

      <p class="text-center text-sm text-gray-500 mt-6">
        Don't have an account?
        <RouterLink to="/signup" class="text-accent-blue font-medium">Sign up</RouterLink>
      </p>
    </AppCard>
  </AuthLayout>
</template>
