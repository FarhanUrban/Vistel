<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => route.meta.title,
  (title) => {
    // 1. Set the tab text to just say "Page Title - Vislet" or "Vislet"
    document.title = title ? `${title} - Vislet` : 'Vislet'

    // 2. Dynamically target and update the favicon to your PNG logo
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
    
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    
    link.type = 'image/png'
    link.href = '/logo.png' // Matches the path in your public folder
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
