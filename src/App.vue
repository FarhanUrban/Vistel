<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => route.meta.title,
  (title) => {
    // document.title = title ? `${title} — Vislet` : 'Vislet'
    document.title = title ? `Vislet` : 'Vislet'
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
