<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import AppCard from '@/components/AppCard.vue'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppButton from '@/components/AppButton.vue'
import AppModal from '@/components/AppModal.vue'
import AppInput from '@/components/AppInput.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import { useAuthStore } from '@/features/auth/store'
import { getFirebaseAuth } from '@/services/api'
import { useMockServices } from '@/services/config'
import type { DeleteAccountPhase } from '@/services/accountService'

const router = useRouter()
const authStore = useAuthStore()

const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const deletePassword = ref('')
const deletePhase = ref<DeleteAccountPhase>('idle')

const isEmailUser = computed(() => {
  if (useMockServices()) return true
  try {
    const providers = getFirebaseAuth().currentUser?.providerData ?? []
    return providers.some((p) => p.providerId === 'password')
  } catch {
    return false
  }
})

const canDelete = computed(() => {
  if (deleteConfirmText.value !== 'DELETE') return false
  if (isEmailUser.value && !deletePassword.value.trim()) return false
  if (deletePhase.value !== 'idle' && deletePhase.value !== 'error') return false
  return true
})

const phaseLabel = computed(() => {
  switch (deletePhase.value) {
    case 'reauthenticating':
      return 'Confirming your identity…'
    case 'wiping_cloud':
      return 'Removing cloud files, applications, and envelopes…'
    case 'deleting_auth':
      return 'Deleting sign-in credentials…'
    case 'done':
      return 'Account deleted.'
    case 'error':
      return 'Deletion stopped because cloud wipe failed.'
    default:
      return ''
  }
})

function openDeleteModal() {
  deleteConfirmText.value = ''
  deletePassword.value = ''
  deletePhase.value = 'idle'
  showDeleteModal.value = true
}

function onCloseDeleteModal() {
  if (deletePhase.value !== 'idle' && deletePhase.value !== 'error') return
  showDeleteModal.value = false
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Welcome' })
}

async function handleResetAppData() {
  await authStore.resetAppData()
  router.push({ name: 'Welcome' })
}

async function handleDeleteAccount() {
  if (!canDelete.value) return
  try {
    await authStore.deleteAccount(
      isEmailUser.value ? deletePassword.value : undefined,
      (phase) => {
        deletePhase.value = phase
      },
    )
    deletePhase.value = 'done'
    showDeleteModal.value = false
    router.push({ name: 'Welcome', query: { accountDeleted: '1' } })
  } catch {
    deletePhase.value = 'error'
    // Error surfaced via authStore.error — keep modal open so the user can retry.
  }
}
</script>

<template>
  <AppShell>
    <AppPageHeader title="Profile" subtitle="Manage your account" />

    <AppCard class="mb-4">
      <p class="text-sm text-gray-500">Signed in as</p>
      <p class="mt-1 font-medium text-navy">
        {{ authStore.user?.displayName || authStore.user?.email }}
      </p>
      <p v-if="authStore.user?.displayName" class="text-sm text-gray-500">
        {{ authStore.user?.email }}
      </p>
    </AppCard>

    <AppCard class="mb-4 space-y-3">
      <AppButton variant="outline" full-width @click="handleLogout">Log out</AppButton>
      <AppButton variant="outline" full-width @click="handleResetAppData">
        Reset app data &amp; restart onboarding
      </AppButton>
      <AppButton
        variant="outline"
        full-width
        class="!border-red-300 !text-red-600 hover:!bg-red-50"
        @click="openDeleteModal"
      >
        Delete account permanently
      </AppButton>
      <p class="text-center text-xs text-gray-400">
        Reset clears in-memory session data and signs you out. Delete removes your sign-in only after
        cloud files and application envelopes are wiped successfully.
      </p>
    </AppCard>

    <p class="text-center text-sm text-gray-500">
      <RouterLink to="/about" class="text-accent-blue font-medium hover:underline"
        >About Vislet</RouterLink
      >
    </p>

    <AppModal
      :open="showDeleteModal"
      title="Delete account"
      @close="onCloseDeleteModal"
    >
      <p class="text-sm text-gray-600">
        This permanently deletes your sign-in after wiping your cloud files, applications, and
        encrypted envelopes. If cloud wipe fails, deletion stops and your account remains.
      </p>

      <AppErrorMessage v-if="authStore.error" :message="authStore.error" class="mt-4" />
      <p v-if="phaseLabel" class="mt-3 text-sm font-medium text-navy/70">{{ phaseLabel }}</p>

      <div class="mt-4 space-y-4">
        <AppInput
          v-if="isEmailUser"
          v-model="deletePassword"
          label="Password"
          type="password"
          placeholder="Required for email sign-in"
          :disabled="authStore.isLoading"
        />
        <p v-else class="text-sm text-gray-500">
          You'll confirm your identity in a Google popup when you delete. Allow popups and pause
          any ad blocker on this site so confirmation can finish.
        </p>
        <AppInput
          v-model="deleteConfirmText"
          label='Type "DELETE" to confirm'
          placeholder="DELETE"
          :disabled="authStore.isLoading"
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
