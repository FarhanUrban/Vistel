import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import type { SocialAuthProvider } from '@/features/auth/types'
import * as authService from '@/services/authService'
import { formatAuthError } from '@/services/authErrors'
import { wipeAllAppData } from '@/services/appReset'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const hydrated = ref(false)

  /** Instant portal session restore — never touches Firebase. */
  function hydratePortalSessionSync() {
    const portal = authService.peekPortalUser()
    if (portal) user.value = portal
    hydrated.value = true
  }

  async function login(email: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      user.value = await authService.signIn(email, password)
      // Re-hydrate R2 platform state now that portal/Firebase auth is available.
      const { hydratePlatformFromRemote } = await import('@/services/platformStorage')
      await hydratePlatformFromRemote()
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
      wipeAllAppData()
      user.value = null
    } catch (e) {
      error.value = formatAuthError(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /** Clears all local app data and signs out without deleting the Firebase account. */
  async function resetAppData() {
    isLoading.value = true
    error.value = null
    try {
      wipeAllAppData()
      await authService.signOut()
      user.value = null
    } catch (e) {
      error.value = formatAuthError(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function loadCurrentUser() {
    if (hydrated.value) return
    isLoading.value = true
    try {
      user.value = await authService.getCurrentUser()
    } catch (e) {
      error.value = formatAuthError(e)
    } finally {
      hydrated.value = true
      isLoading.value = false
    }
  }

  /** Background Firebase session restore after the UI is already mounted. */
  async function finishAuthBootstrap() {
    try {
      const next = await authService.getCurrentUser()
      if (next) user.value = next
    } catch (e) {
      error.value = formatAuthError(e)
    } finally {
      hydrated.value = true
    }
  }

  return {
    user,
    isLoading,
    error,
    hydrated,
    hydratePortalSessionSync,
    login,
    register,
    loginWithProvider,
    loginWithGoogle,
    logout,
    deleteAccount,
    resetAppData,
    loadCurrentUser,
    finishAuthBootstrap,
  }
})
