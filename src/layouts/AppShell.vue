<script setup lang="ts">
import AppBottomNav from '@/components/AppBottomNav.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 pb-20">
    <main class="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
      <slot />
    </main>
    <AppBottomNav />
  </div>
</template>
