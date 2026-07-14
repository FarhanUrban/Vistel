<script setup lang="ts">
defineProps<{
  label: string
  sublabel?: string
  selected?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-card border bg-white px-4 py-3 text-left transition-colors"
    :class="[
      selected
        ? 'border-accent-blue ring-2 ring-accent-blue/20'
        : 'border-gray-200 hover:border-accent-blue/40',
      disabled ? 'cursor-not-allowed opacity-50' : '',
    ]"
    :disabled="disabled"
    @click="emit('click')"
  >
    <slot name="leading" />
    <div class="min-w-0 flex-1">
      <p class="truncate font-medium text-navy">{{ label }}</p>
      <p v-if="sublabel" class="truncate text-sm text-gray-500">{{ sublabel }}</p>
    </div>
    <slot name="trailing" />
    <svg
      class="h-5 w-5 shrink-0 text-gray-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</template>
