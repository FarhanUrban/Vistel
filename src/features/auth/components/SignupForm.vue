<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const passwordError = ref<string | null>(null)

function validatePasswords(): boolean {
  if (password.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return false
  }
  passwordError.value = null
  return true
}

async function handleSubmit() {
  if (!validatePasswords()) return
  await authStore.register(email.value, password.value)
  if (authStore.user) {
    router.push(getPostAuthRoute())
  }
}

function handleSocialSuccess() {
  router.push(getPostAuthRoute())
}
</script>

<template>
  <AuthLayout>
    <AppCard>
      <div class="mb-6 text-center">
        <button
          type="button"
          class="mb-4 text-sm font-medium text-accent-blue hover:underline"
          @click="router.push({ name: 'Welcome' })"
        >
          ← Back
        </button>
        <AppLogo />
        <h1 class="mt-4 text-2xl font-semibold text-navy">Create account</h1>
        <p class="mt-1 text-navy/60">Start your visa application today</p>
      </div>

      <AppErrorMessage v-if="authStore.error" :message="authStore.error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <AppInput v-model="email" label="Email" type="email" placeholder="you@example.com" />
        <AppInput v-model="password" label="Password" type="password" placeholder="••••••••" />
        <AppInput
          v-model="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          :error="passwordError"
        />
        <AppButton type="submit" full-width :loading="authStore.isLoading">Create Account</AppButton>
      </form>

      <SocialSignInButtons @success="handleSocialSuccess" />

      <p class="mt-6 text-center text-sm text-navy/60">
        Already have an account?
        <RouterLink to="/login" class="font-medium text-accent-blue">Log in</RouterLink>
      </p>
    </AppCard>
  </AuthLayout>
</template>
