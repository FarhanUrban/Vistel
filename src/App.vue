<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => route.meta.title,
  (title) => {
    // Ensure this line uses clean backticks (`) for template literal evaluation
    document.title = title ? `${title} - Vislet` : 'Vislet'

    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")

    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }

    link.type = 'image/png'
    link.href = '/logo-v2.png'
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
