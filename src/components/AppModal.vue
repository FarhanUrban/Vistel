<script setup lang="ts">
interface Props {
  open: boolean
  title?: string
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

function handleBackdropClick() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="handleBackdropClick"
    >
      <div class="bg-white rounded-card shadow-xl max-w-md w-full p-6">
        <div v-if="title" class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-navy">{{ title }}</h2>
          <button
            type="button"
            class="text-gray-400 hover:text-navy text-xl leading-none"
            @click="emit('close')"
          >
            ×
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
