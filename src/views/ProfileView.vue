<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import AppCard from '@/components/AppCard.vue'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppModal from '@/components/AppModal.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import { useAuthStore } from '@/features/auth/store'

const router = useRouter()
const authStore = useAuthStore()

const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const deletePassword = ref('')

const canDelete = computed(() => deleteConfirmText.value === 'DELETE')

function openDeleteModal() {
  deleteConfirmText.value = ''
  deletePassword.value = ''
  showDeleteModal.value = true
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Welcome' })
}

async function handleDeleteAccount() {
  if (!canDelete.value) return
  try {
    await authStore.deleteAccount(deletePassword.value || undefined)
    showDeleteModal.value = false
    router.push({ name: 'Welcome' })
  } catch {
    // Error surfaced via authStore.error
  }
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
      <AppButton
        variant="outline"
        full-width
        class="!border-red-300 !text-red-600 hover:!bg-red-50"
        @click="openDeleteModal"
      >
        Delete account
      </AppButton>
    </AppCard>

    <p class="text-center text-sm text-gray-500">
      <RouterLink to="/about" class="text-accent-blue font-medium hover:underline">About Vislet</RouterLink>
    </p>

    <AppModal :open="showDeleteModal" title="Delete account" @close="showDeleteModal = false">
      <p class="text-sm text-gray-600">
        This permanently deletes your account, uploaded documents, and application data. You will need to
        complete onboarding again if you sign back in.
      </p>

      <AppErrorMessage v-if="authStore.error" :message="authStore.error" class="mt-4" />

      <div class="mt-4 space-y-4">
        <AppInput
          v-model="deletePassword"
          label="Password"
          type="password"
          placeholder="Required for email sign-in"
        />
        <AppInput
          v-model="deleteConfirmText"
          label='Type "DELETE" to confirm'
          placeholder="DELETE"
        />
        <AppButton
          full-width
          :disabled="!canDelete"
          :loading="authStore.isLoading"
          class="!bg-red-600 hover:!bg-red-700"
          @click="handleDeleteAccount"
        >
          Permanently delete account
        </AppButton>
      </div>
    </AppModal>
  </AppShell>
</template>
