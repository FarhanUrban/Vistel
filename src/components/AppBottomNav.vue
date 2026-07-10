<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Documents', path: '/documents/required-list', icon: '📄' },
  { name: 'Payment', path: '/payment', icon: '💳' },
  { name: 'About', path: '/about', icon: 'ℹ️' },
]

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
    <div class="flex justify-around items-center h-16 max-w-lg mx-auto">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        class="flex flex-col items-center justify-center flex-1 py-2 text-xs transition-colors"
        :class="isActive(item.path) ? 'text-accent-blue font-medium' : 'text-gray-500'"
        @click="navigate(item.path)"
      >
        <span class="text-lg mb-0.5">{{ item.icon }}</span>
        <span>{{ item.name }}</span>
      </button>
    </div>
  </nav>
</template>
