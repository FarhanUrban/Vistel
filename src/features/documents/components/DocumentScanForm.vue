<script setup lang="ts">
import { ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import { useDocumentsStore } from '@/features/documents/store'

const documentsStore = useDocumentsStore()

const emit = defineEmits<{
  viewList: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    await documentsStore.uploadDocument(file)
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2">Scan your documents</h1>
    <p class="text-gray-500 mb-6">Take a photo or upload a file of each required document.</p>

    <AppErrorMessage v-if="documentsStore.error" :message="documentsStore.error" class="mb-4" />

    <AppCard class="text-center mb-6">
      <div class="py-8">
        <div class="text-5xl mb-4">📷</div>
        <p class="text-navy font-medium mb-2">Scan or upload a document</p>
        <p class="text-sm text-gray-500 mb-4">Supports JPG, PNG, and PDF up to 10MB</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/*,.pdf"
          class="hidden"
          @change="handleFileChange"
        />
        <AppButton :loading="documentsStore.isLoading" @click="openFilePicker">
          Choose File
        </AppButton>
      </div>
    </AppCard>

    <AppLoadingSpinner v-if="documentsStore.isLoading" />

    <div v-if="documentsStore.uploadedDocuments.length > 0" class="mb-6">
      <h2 class="font-medium text-navy mb-3">Uploaded ({{ documentsStore.uploadedDocuments.length }})</h2>
      <ul class="space-y-2">
        <li
          v-for="doc in documentsStore.uploadedDocuments"
          :key="doc.id"
          class="flex items-center gap-3 p-3 bg-white rounded-control border border-gray-200"
        >
          <span class="text-green-500">✓</span>
          <span class="text-sm text-navy">{{ doc.name }}</span>
        </li>
      </ul>
    </div>

    <AppButton variant="outline" full-width @click="emit('viewList')">
      View Required Documents
    </AppButton>
  </div>
</template>
