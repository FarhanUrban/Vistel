<script setup lang="ts">
import { ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import DocumentCaptureModal from '@/features/documents/components/DocumentCaptureModal.vue'
import { useDocumentsStore } from '@/features/documents/store'

const documentsStore = useDocumentsStore()

const emit = defineEmits<{
  viewList: []
}>()

const captureOpen = ref(false)

async function handleUpload(file: File) {
  await documentsStore.uploadDocument(file)
  if (!documentsStore.error) {
    captureOpen.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2 lg:text-3xl">Scan your documents</h1>
    <p class="text-gray-500 mb-6">Take a photo or upload a file of each required document.</p>

    <AppErrorMessage v-if="documentsStore.error" :message="documentsStore.error" class="mb-4" />

    <AppCard class="text-center mb-6">
      <div class="py-8">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-blue/15 text-2xl">
          📄
        </div>
        <p class="text-navy font-medium mb-2">Scan or upload a document</p>
        <p class="text-sm text-gray-500 mb-4">Supports JPG, PNG, WEBP, and PDF up to 10MB</p>
        <AppButton :loading="documentsStore.isLoading" @click="captureOpen = true">
          Add document
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
          class="flex items-center gap-3 rounded-control border border-gray-200 bg-white p-3"
        >
          <span class="text-accent-blue">✓</span>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-navy">{{ doc.name }}</p>
            <p v-if="doc.documentTypeId" class="text-xs text-gray-500">{{ doc.documentTypeId }}</p>
          </div>
        </li>
      </ul>
    </div>

    <AppButton variant="outline" full-width @click="emit('viewList')">
      View Required Documents
    </AppButton>

    <DocumentCaptureModal
      :open="captureOpen"
      :loading="documentsStore.isLoading"
      :error="documentsStore.error"
      @close="captureOpen = false"
      @upload="handleUpload"
    />
  </div>
</template>
