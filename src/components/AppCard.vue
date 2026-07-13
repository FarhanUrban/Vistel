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
    class="rounded-card border border-muted bg-white shadow-sm"
    :class="{
      'p-4': padding === 'sm',
      'p-6': padding === 'md',
      'p-8': padding === 'lg',
    }"
  >
    <slot />
  </div>
</template>
