<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import AppCard from '@/components/AppCard.vue'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppButton from '@/components/AppButton.vue'
import { useAuthStore } from '@/features/auth/store'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Welcome' })
}
</script>

<template>
  <AppShell>
    <AppPageHeader title="Profile" subtitle="Manage your account" />

    <AppCard class="mb-4">
      <p class="text-sm text-gray-500">Signed in as</p>
      <p class="mt-1 font-medium text-navy">{{ authStore.user?.displayName || authStore.user?.email }}</p>
      <p v-if="authStore.user?.displayName" class="text-sm text-gray-500">{{ authStore.user?.email }}</p>
    </AppCard>

    <AppCard class="mb-4 space-y-3">
      <AppButton variant="outline" full-width @click="handleLogout">Log out</AppButton>
      <p class="text-center text-xs text-gray-400">Account deletion is not available.</p>
    </AppCard>

    <p class="text-center text-sm text-gray-500">
      <RouterLink to="/about" class="text-accent-blue font-medium hover:underline">About Vislet</RouterLink>
    </p>
  </AppShell>
</template>
