<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import AppBottomNav from '@/components/AppBottomNav.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50 lg:flex">
    <AppSidebar />
    <div class="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
      <main class="mx-auto w-full max-w-lg flex-1 px-4 py-6 lg:max-w-5xl lg:px-8">
        <slot />
      </main>
      <AppBottomNav />
    </div>
  </div>
</template>
