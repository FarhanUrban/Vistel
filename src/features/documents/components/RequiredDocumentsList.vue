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
  scan: []
  finalize: []
}>()

const captureOpen = ref(false)
const finalizeOpen = ref(false)
const activeDocumentId = ref<string | undefined>()
const activeDocumentName = ref<string | undefined>()

onMounted(() => {
  documentsStore.loadRequiredDocuments()
})

function openCapture(doc: { id: string; name: string }) {
  activeDocumentId.value = doc.id
  activeDocumentName.value = doc.name
  captureOpen.value = true
}

async function handleUpload(file: File) {
  await documentsStore.uploadDocument(file, activeDocumentId.value)
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
    <DocumentsCountryHeader show-banner />

    <h1 class="mb-2 text-2xl font-semibold text-navy lg:text-3xl">Required documents</h1>
    <p class="mb-6 text-gray-500">Upload each required document before submitting your application.</p>

    <AppErrorMessage v-if="documentsStore.error" :message="documentsStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="documentsStore.isLoading" />

    <ul v-else class="mb-6 space-y-3">
      <li v-for="doc in documentsStore.requiredDocuments" :key="doc.id">
        <AppCard padding="sm" class="cursor-pointer" @click="openCapture(doc)">
          <div class="flex items-start gap-3">
            <span
              class="mt-0.5 rounded px-2 py-0.5 text-sm font-medium"
              :class="
                documentsStore.isDocumentUploaded(doc.id)
                  ? 'bg-accent-blue/15 text-navy'
                  : doc.required
                    ? 'bg-accent-orange/20 text-navy'
                    : 'bg-muted/60 text-gray-500'
              "
            >
              {{
                documentsStore.isDocumentUploaded(doc.id)
                  ? 'Uploaded'
                  : doc.required
                    ? 'Required'
                    : 'Optional'
              }}
            </span>
            <div class="flex-1">
              <p class="font-medium text-navy">{{ doc.name }}</p>
              <p class="mt-0.5 text-sm text-gray-500">{{ doc.description }}</p>
            </div>
            <span class="text-sm text-accent-blue">Upload</span>
          </div>
        </AppCard>
      </li>
    </ul>

    <div class="space-y-3">
      <AppButton variant="outline" full-width @click="emit('scan')">Scan More Documents</AppButton>
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
      :document-type-id="activeDocumentId"
      :document-name="activeDocumentName"
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
