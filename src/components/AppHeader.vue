<script setup lang="ts">
import AppLogo from './AppLogo.vue'

interface Props {
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  showBack: false,
})

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <header class="flex items-center justify-between py-4 px-4">
    <button
      v-if="showBack"
      type="button"
      class="text-accent-blue font-medium text-sm"
      @click="emit('back')"
    >
      ← Back
    </button>
    <div v-else class="w-12" />
    <AppLogo />
    <div class="w-12" />
  </header>
</template>
