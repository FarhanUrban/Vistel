import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import type { SocialAuthProvider } from '@/features/auth/types'
import * as authService from '@/services/authService'
import { formatAuthError } from '@/services/authErrors'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useDocumentsStore } from '@/features/documents/store'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function login(email: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      user.value = await authService.signIn(email, password)
    } catch (e) {
      error.value = formatAuthError(e)
    } finally {
      isLoading.value = false
    }
  }

  async function register(email: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      user.value = await authService.signUp(email, password)
    } catch (e) {
      error.value = formatAuthError(e)
    } finally {
      isLoading.value = false
    }
  }

  async function loginWithProvider(provider: SocialAuthProvider) {
    isLoading.value = true
    error.value = null
    try {
      user.value = await authService.signInWithProvider(provider)
    } catch (e) {
      error.value = formatAuthError(e)
    } finally {
      isLoading.value = false
    }
  }

  /** @deprecated Use loginWithProvider('google') */
  async function loginWithGoogle() {
    return loginWithProvider('google')
  }

  async function logout() {
    isLoading.value = true
    error.value = null
    try {
      await authService.signOut()
      user.value = null
    } catch (e) {
      error.value = formatAuthError(e)
    } finally {
      isLoading.value = false
    }
  }

  async function deleteAccount(password?: string) {
    isLoading.value = true
    error.value = null
    try {
      await authService.deleteAccount(password)
      useOnboardingStore().reset()
      useDocumentsStore().reset()
      localStorage.removeItem('vislet_mock_user')
      user.value = null
    } catch (e) {
      error.value = formatAuthError(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function loadCurrentUser() {
    isLoading.value = true
    try {
      user.value = await authService.getCurrentUser()
    } catch (e) {
      error.value = formatAuthError(e)
    } finally {
      isLoading.value = false
    }
  }

  return {
    user,
    isLoading,
    error,
    login,
    register,
    loginWithProvider,
    loginWithGoogle,
    logout,
    deleteAccount,
    loadCurrentUser,
  }
})
