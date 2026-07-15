<script setup lang="ts">
defineProps<{
  name: 'dashboard' | 'payment' | 'profile' | 'documents'
}>()
</script>

<template>
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      v-if="name === 'dashboard'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 6h16M4 12h16M4 18h7"
    />
    <path
      v-else-if="name === 'documents'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9 12h6m-6 4h6M9 8h6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H9L5 8v10a2 2 0 002 2z"
    />
    <path
      v-else-if="name === 'payment'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M3 10h18M7 15h2m4 0h2M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
    />
    <path
      v-else-if="name === 'profile'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
</template>
