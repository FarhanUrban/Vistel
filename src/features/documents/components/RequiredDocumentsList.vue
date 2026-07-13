<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import AppModal from '@/components/AppModal.vue'
import DocumentCaptureModal from '@/features/documents/components/DocumentCaptureModal.vue'
import DocumentsCountryHeader from '@/features/documents/components/DocumentsCountryHeader.vue'
import FinalizeDocumentsGate from '@/features/documents/components/FinalizeDocumentsGate.vue'
import { useDocumentsStore } from '@/features/documents/store'

const documentsStore = useDocumentsStore()

const emit = defineEmits<{
  finalize: []
}>()

const captureOpen = ref(false)
const finalizeOpen = ref(false)
const typePickerOpen = ref(false)
const dragActive = ref(false)
const pendingFile = ref<File | null>(null)
const selectedTypeId = ref<string | null>(null)
const activeDocumentId = ref<string | undefined>()
const activeDocumentName = ref<string | undefined>()

const typeOptions = computed(() => {
  const required = documentsStore.requiredDocuments.map((doc) => ({
    id: doc.id,
    name: doc.name,
    hint: documentsStore.isDocumentUploaded(doc.id) ? 'Replace upload' : doc.required ? 'Required' : 'Optional',
  }))
  return [
    ...required,
    { id: 'additional', name: 'Additional document', hint: 'Optional supporting file' },
  ]
})

onMounted(() => {
  documentsStore.loadRequiredDocuments()
})

function openCaptureForRow(doc: { id: string; name: string }) {
  activeDocumentId.value = doc.id
  activeDocumentName.value = doc.name
  pendingFile.value = null
  captureOpen.value = true
}

function openTypePicker(file?: File) {
  pendingFile.value = file ?? null
  selectedTypeId.value = null
  typePickerOpen.value = true
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragActive.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) openTypePicker(file)
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) openTypePicker(file)
}

async function confirmTypeAndUpload() {
  if (!selectedTypeId.value) return
  const typeId = selectedTypeId.value
  const option = typeOptions.value.find((o) => o.id === typeId)
  typePickerOpen.value = false

  if (pendingFile.value) {
    await documentsStore.uploadDocument(pendingFile.value, typeId)
    pendingFile.value = null
    return
  }

  activeDocumentId.value = typeId
  activeDocumentName.value = option?.name
  captureOpen.value = true
}

async function handleUpload(file: File) {
  if (!activeDocumentId.value) return
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
    <p class="mb-6 text-navy/60">
      Upload each required document. Drop a file or click the scanner area to choose which type it is.
    </p>

    <AppErrorMessage v-if="documentsStore.error" :message="documentsStore.error" class="mb-4" />

    <!-- Embedded scanner / dropzone -->
    <AppCard class="mb-6">
      <div
        class="rounded-control border-2 border-dashed px-4 py-10 text-center transition-colors"
        :class="
          dragActive
            ? 'border-accent-orange bg-accent-orange/15'
            : 'border-accent-blue/50 bg-accent-blue/5 hover:border-accent-blue'
        "
        @dragenter.prevent="dragActive = true"
        @dragover.prevent="dragActive = true"
        @dragleave.prevent="dragActive = false"
        @drop="onDrop"
      >
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-orange/25 text-navy"
        >
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3 7h4l2-2h6l2 2h4v12H3V7zm9 3a4 4 0 100 8 4 4 0 000-8z"
            />
          </svg>
        </div>
        <p class="mb-1 font-medium text-navy">Scan or drop a document</p>
        <p class="mb-4 text-sm text-navy/60">JPG, PNG, WEBP, or PDF up to 10MB</p>
        <div class="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <AppButton :loading="documentsStore.isLoading" @click="openTypePicker()">
            Choose file to upload
          </AppButton>
          <label class="cursor-pointer">
            <span class="sr-only">Browse files</span>
            <input type="file" class="hidden" accept="image/*,.pdf" @change="onFileInput" />
          </label>
        </div>
      </div>
    </AppCard>

    <AppLoadingSpinner v-if="documentsStore.isLoading && documentsStore.requiredDocuments.length === 0" />

    <ul v-else class="mb-6 space-y-3">
      <li v-for="doc in documentsStore.requiredDocuments" :key="doc.id">
        <AppCard padding="sm" class="cursor-pointer" @click="openCaptureForRow(doc)">
          <div class="flex items-start gap-3">
            <span
              class="mt-0.5 rounded px-2 py-0.5 text-sm font-medium"
              :class="
                documentsStore.isDocumentUploaded(doc.id)
                  ? 'bg-accent-blue/20 text-navy'
                  : doc.required
                    ? 'bg-accent-orange/25 text-navy'
                    : 'bg-muted text-navy/60'
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
              <p class="mt-0.5 text-sm text-navy/60">{{ doc.description }}</p>
            </div>
            <span class="text-sm font-medium text-accent-blue">Upload</span>
          </div>
        </AppCard>
      </li>
    </ul>

    <AppButton
      full-width
      :disabled="!documentsStore.allRequiredUploaded()"
      @click="openFinalize"
    >
      Finalize E-Visa Application
    </AppButton>

    <AppModal :open="typePickerOpen" title="What document is this?" @close="typePickerOpen = false">
      <p class="mb-4 text-sm text-navy/60">
        Pick the type so only that item is marked uploaded.
      </p>
      <ul class="mb-4 max-h-64 space-y-2 overflow-y-auto">
        <li v-for="option in typeOptions" :key="option.id">
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-control border px-3 py-2.5 text-left transition-colors"
            :class="
              selectedTypeId === option.id
                ? 'border-accent-orange bg-accent-orange/15'
                : 'border-muted bg-white hover:border-accent-blue/50'
            "
            @click="selectedTypeId = option.id"
          >
            <span class="font-medium text-navy">{{ option.name }}</span>
            <span class="text-xs text-navy/50">{{ option.hint }}</span>
          </button>
        </li>
      </ul>
      <AppButton full-width :disabled="!selectedTypeId" @click="confirmTypeAndUpload">
        {{ pendingFile ? 'Upload as this type' : 'Continue' }}
      </AppButton>
    </AppModal>

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
