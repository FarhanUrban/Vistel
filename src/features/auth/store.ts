import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import * as authService from '@/services/authService'

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
      error.value = e instanceof Error ? e.message : 'Login failed'
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
      error.value = e instanceof Error ? e.message : 'Sign up failed'
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
      error.value = e instanceof Error ? e.message : 'Google sign in failed'
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
      error.value = e instanceof Error ? e.message : 'Logout failed'
    } finally {
      isLoading.value = false
    }
  }

  async function loadCurrentUser() {
    isLoading.value = true
    try {
      user.value = await authService.getCurrentUser()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load user'
    } finally {
      isLoading.value = false
    }
  }

  return { user, isLoading, error, login, register, loginWithGoogle, logout, loadCurrentUser }
})
