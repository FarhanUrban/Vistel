<script setup lang="ts">
interface Option {
  value: string
  label: string
}

interface Props {
  modelValue: string
  label?: string
  options: Option[]
  placeholder?: string
  error?: string | null
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Select an option',
  error: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-navy mb-1.5">
      {{ label }}
    </label>
    <select
      :value="modelValue"
      class="w-full rounded-control border border-muted bg-white px-4 py-2.5 text-navy focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
      :class="{ 'border-red-500': error }"
      @change="handleChange"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
