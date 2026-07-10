<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AppCard from '@/components/AppCard.vue'
import AppLogo from '@/components/AppLogo.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import { useAuthStore } from '@/features/auth/store'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

async function handleSubmit() {
  await authStore.login(email.value, password.value)
  if (authStore.user) {
    router.push({ name: 'Dashboard' })
  }
}

async function handleGoogleLogin() {
  await authStore.loginWithGoogle()
  if (authStore.user) {
    router.push({ name: 'Dashboard' })
  }
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

      <div class="mt-4">
        <AppButton variant="outline" full-width :loading="authStore.isLoading" @click="handleGoogleLogin">
          Continue with Google
        </AppButton>
      </div>

      <p class="text-center text-sm text-gray-500 mt-6">
        Don't have an account?
        <RouterLink to="/signup" class="text-accent-blue font-medium">Sign up</RouterLink>
      </p>
    </AppCard>
  </AuthLayout>
</template>
