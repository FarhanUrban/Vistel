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
      class="w-full text-left p-4 rounded-card border-2 transition-colors"
      :class="
        modelValue === option.value
          ? 'border-accent-blue bg-accent-blue/10'
          : 'border-gray-200 bg-white hover:border-gray-300'
      "
      @click="select(option.value)"
    >
      <p class="font-medium text-navy">{{ option.label }}</p>
      <p v-if="option.description" class="text-sm text-gray-500 mt-1">
        {{ option.description }}
      </p>
    </button>
  </div>
</template>
