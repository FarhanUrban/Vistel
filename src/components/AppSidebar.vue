<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { name: 'Documents', path: '/documents/required-list', icon: 'documents' },
  { name: 'Payment', path: '/payment', icon: 'payment' },
  { name: 'Profile', path: '/profile', icon: 'profile' },
]

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <aside class="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
    <div class="px-6 py-6">
      <AppLogo/>
    </div>
    <nav class="flex-1 space-y-1 px-3">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        class="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors"
        :class="isActive(item.path) ? 'bg-accent-blue/15 text-navy' : 'text-gray-600 hover:bg-gray-50'"
        @click="navigate(item.path)"
      >
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full"
          :class="isActive(item.path) ? 'bg-accent-blue/20' : 'bg-gray-100'"
        >
          <svg v-if="item.icon === 'dashboard'" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <svg v-else-if="item.icon === 'documents'" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6M9 8h6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H9L5 8v10a2 2 0 002 2z" />
          </svg>
          <svg v-else-if="item.icon === 'payment'" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h2m4 0h2M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
          </svg>
          <svg v-else-if="item.icon === 'profile'" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </span>
        {{ item.name }}
      </button>
    </nav>
  </aside>
</template>
