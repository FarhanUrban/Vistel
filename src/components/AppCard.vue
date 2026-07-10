<script setup lang="ts">
interface Props {
  padding?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  padding: 'md',
})
</script>

<template>
  <div
    class="bg-white rounded-card shadow-sm border border-gray-100"
    :class="{
      'p-4': padding === 'sm',
      'p-6': padding === 'md',
      'p-8': padding === 'lg',
    }"
  >
    <slot />
  </div>
</template>
