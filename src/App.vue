<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => route.meta.title,
  (title) => {
    // Clean template literal syntax using backticks (`)
    document.title = title ? `${title} - Vislet` : 'Vislet'

    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
    
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    
    link.type = 'image/png'
    // Append a query string (?v=2) to force cache-busting just in case
    link.href = '/vite.png?v=2' 
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
