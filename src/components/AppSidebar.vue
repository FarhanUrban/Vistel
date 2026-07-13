<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import NavIcon from '@/components/NavIcon.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' as const },
  { name: 'Payment', path: '/payment', icon: 'payment' as const },
  { name: 'Profile', path: '/profile', icon: 'profile' as const },
]

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <aside class="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-muted lg:bg-surface">
    <div class="px-6 py-6">
      <AppLogo />
    </div>
    <nav class="flex-1 space-y-1 px-3">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        class="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors"
        :class="isActive(item.path) ? 'bg-accent-blue/15 text-navy' : 'text-gray-600 hover:bg-muted/40'"
        @click="navigate(item.path)"
      >
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full"
          :class="isActive(item.path) ? 'bg-accent-blue/20' : 'bg-muted/50'"
        >
          <NavIcon :name="item.icon" class="h-4 w-4" />
        </span>
        {{ item.name }}
      </button>
    </nav>
  </aside>
</template>
