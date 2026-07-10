<script setup lang="ts">
interface Props {
  message: string
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-control bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
    {{ message }}
  </div>
</template>
