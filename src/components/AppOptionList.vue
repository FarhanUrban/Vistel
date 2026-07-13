<script setup lang="ts">
interface Props {
  options: { value: string; label: string; description?: string }[]
  modelValue: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-y-3">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="w-full rounded-card border-2 p-4 text-left transition-colors"
      :class="
        modelValue === option.value
          ? 'border-accent-blue bg-accent-blue/15'
          : 'border-muted bg-white hover:border-accent-blue/50'
      "
      @click="select(option.value)"
    >
      <p class="font-medium text-navy">{{ option.label }}</p>
      <p v-if="option.description" class="mt-1 text-sm text-navy/60">
        {{ option.description }}
      </p>
    </button>
  </div>
</template>
