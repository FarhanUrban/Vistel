<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import NavIcon from '@/components/NavIcon.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' as const },
  { name: 'Payment', path: '/payment', icon: 'payment' as const },
  { name: 'Profile', path: '/profile', icon: 'profile' as const },
  { name: 'Q&A Help', path: '/qa', icon: 'qa' as const },
]

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 border-t border-muted bg-surface safe-area-bottom lg:hidden"
  >
    <div class="mx-auto flex h-16 max-w-lg items-center justify-around">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        class="flex flex-1 flex-col items-center justify-center py-2 text-xs transition-colors"
        :class="isActive(item.path) ? 'font-medium text-accent-orange' : 'text-navy/50'"
        @click="navigate(item.path)"
      >
        <NavIcon :name="item.icon" class="mb-0.5 h-5 w-5" />
        <span>{{ item.name }}</span>
      </button>
    </div>
  </nav>
</template>
