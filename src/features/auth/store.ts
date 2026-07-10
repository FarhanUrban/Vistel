import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import * as authService from '@/services/authService'
import { formatAuthError } from '@/services/authErrors'

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

  async function loginWithGoogle() {
    isLoading.value = true
    error.value = null
    try {
      user.value = await authService.signInWithGoogle()
    } catch (e) {
      error.value = formatAuthError(e)
    } finally {
      isLoading.value = false
    }
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

  return { user, isLoading, error, login, register, loginWithGoogle, logout, loadCurrentUser }
})
