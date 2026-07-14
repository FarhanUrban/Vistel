<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import documentPrompts from '@/services/data/documentPrompts.json'

const props = defineProps<{
  open: boolean
  documentTypeId?: string
  documentName?: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  close: []
  upload: [file: File]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const localError = ref<string | null>(null)

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const prompt = computed(() => {
  const prompts = documentPrompts as Record<string, { title: string; bullets: string[] }>
  const key = props.documentTypeId ?? 'default'
  return prompts[key] ?? prompts.default
})

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please upload a JPG, PNG, WEBP, or PDF file.'
  }
  if (file.size > MAX_BYTES) {
    return 'File must be 10MB or smaller.'
  }
  return null
}

function handleFile(file: File | undefined) {
  if (!file) return
  const validationError = validateFile(file)
  if (validationError) {
    localError.value = validationError
    return
  }
  localError.value = null
  emit('upload', file)
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  handleFile(target.files?.[0])
  if (target) target.value = ''
}

function openFilePicker() {
  fileInput.value?.click()
}

function openCamera() {
  cameraInput.value?.click()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 lg:items-center"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-lg rounded-card bg-white p-6 shadow-xl lg:rounded-card">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-navy">{{ prompt.title }}</h2>
            <p v-if="documentName" class="mt-1 text-sm text-gray-500">{{ documentName }}</p>
          </div>
          <button type="button" class="text-xl text-gray-400" @click="emit('close')">×</button>
        </div>

        <ul class="mb-5 space-y-2 text-sm text-gray-600">
          <li v-for="bullet in prompt.bullets" :key="bullet" class="flex gap-2">
            <span class="text-accent-blue">•</span>
            <span>{{ bullet }}</span>
          </li>
        </ul>

        <AppErrorMessage
          v-if="error || localError"
          :message="error || localError || ''"
          class="mb-4"
        />

        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          class="hidden"
          @change="onFileChange"
        />
        <input
          ref="cameraInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          @change="onFileChange"
        />

        <div class="grid gap-3 sm:grid-cols-2">
          <AppButton variant="secondary" full-width :loading="loading" @click="openCamera">
            Take photo
          </AppButton>
          <AppButton full-width :loading="loading" @click="openFilePicker">Upload file</AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
