<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import DocumentCaptureModal from '@/features/documents/components/DocumentCaptureModal.vue'
import DocumentsCountryHeader from '@/features/documents/components/DocumentsCountryHeader.vue'
import FinalizeDocumentsGate from '@/features/documents/components/FinalizeDocumentsGate.vue'
import { useDocumentsStore } from '@/features/documents/store'

const documentsStore = useDocumentsStore()

const emit = defineEmits<{
  viewList: []
  finalize: []
}>()

const captureOpen = ref(false)
const finalizeOpen = ref(false)

onMounted(() => {
  if (documentsStore.requiredDocuments.length === 0) {
    documentsStore.loadRequiredDocuments()
  }
})

async function handleUpload(file: File) {
  await documentsStore.uploadDocument(file)
  if (!documentsStore.error) {
    captureOpen.value = false
  }
}

function openFinalize() {
  finalizeOpen.value = true
}

function onFinalized() {
  finalizeOpen.value = false
  emit('finalize')
}
</script>

<template>
  <div>
    <DocumentsCountryHeader />

    <h1 class="mb-2 text-2xl font-semibold text-navy lg:text-3xl">Scan your documents</h1>
    <p class="mb-6 text-gray-500">Take a photo or upload a file of each required document.</p>

    <AppErrorMessage v-if="documentsStore.error" :message="documentsStore.error" class="mb-4" />

    <AppCard class="mb-6 text-center">
      <div class="py-8">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-blue/15 text-accent-blue">
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3 7h4l2-2h6l2 2h4v12H3V7zm9 3a4 4 0 100 8 4 4 0 000-8z"
            />
          </svg>
        </div>
        <p class="mb-2 font-medium text-navy">Scan or upload a document</p>
        <p class="mb-4 text-sm text-gray-500">Supports JPG, PNG, WEBP, and PDF up to 10MB</p>
        <AppButton :loading="documentsStore.isLoading" @click="captureOpen = true">
          Add document
        </AppButton>
      </div>
    </AppCard>

    <AppLoadingSpinner v-if="documentsStore.isLoading" />

    <div v-if="documentsStore.uploadedDocuments.length > 0" class="mb-6">
      <h2 class="mb-3 font-medium text-navy">Uploaded ({{ documentsStore.uploadedDocuments.length }})</h2>
      <ul class="space-y-2">
        <li
          v-for="doc in documentsStore.uploadedDocuments"
          :key="doc.id"
          class="flex items-center gap-3 rounded-control border border-muted bg-white p-3"
        >
          <span class="text-accent-blue">✓</span>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-navy">{{ doc.name }}</p>
            <p v-if="doc.documentTypeId" class="text-xs text-gray-500">{{ doc.documentTypeId }}</p>
          </div>
        </li>
      </ul>
    </div>

    <div class="space-y-3">
      <AppButton variant="outline" full-width @click="emit('viewList')">
        View Required Documents
      </AppButton>
      <AppButton
        full-width
        :disabled="!documentsStore.allRequiredUploaded()"
        @click="openFinalize"
      >
        Finalize E-Visa Application
      </AppButton>
    </div>

    <DocumentCaptureModal
      :open="captureOpen"
      :loading="documentsStore.isLoading"
      :error="documentsStore.error"
      @close="captureOpen = false"
      @upload="handleUpload"
    />

    <FinalizeDocumentsGate
      :open="finalizeOpen"
      @close="finalizeOpen = false"
      @submitted="onFinalized"
    />
  </div>
</template>
