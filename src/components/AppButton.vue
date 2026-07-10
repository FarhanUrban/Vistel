<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
  fullWidth: false,
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-medium transition-colors rounded-control disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[
      fullWidth ? 'w-full' : '',
      size === 'sm' ? 'px-3 py-1.5 text-sm' : '',
      size === 'md' ? 'px-4 py-2.5 text-base' : '',
      size === 'lg' ? 'px-6 py-3 text-lg' : '',
      variant === 'primary' ? 'bg-black text-white hover:bg-navy' : '',
      variant === 'secondary' ? 'bg-accent-orange text-black hover:opacity-90' : '',
      variant === 'outline'
        ? 'border-2 border-accent-blue text-accent-blue bg-transparent hover:bg-accent-blue/10'
        : '',
    ]"
  >
    <span v-if="loading" class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <slot />
  </button>
</template>
