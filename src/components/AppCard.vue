<script setup lang="ts">
interface Props {
  padding?: 'sm' | 'md' | 'lg'
  /** Surface tone — use `dark` on navy agency pages so child text stays readable. */
  tone?: 'light' | 'dark'
}

withDefaults(defineProps<Props>(), {
  padding: 'md',
  tone: 'light',
})
</script>

<template>
  <div
    class="rounded-card shadow-sm"
    :class="{
      'p-4': padding === 'sm',
      'p-6': padding === 'md',
      'p-8': padding === 'lg',
      'border border-muted bg-white': tone === 'light',
      'border border-white/10 bg-navy text-white': tone === 'dark',
    }"
  >
    <slot />
  </div>
</template>
