<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppButton from '@/components/AppButton.vue'
import AppOptionList from '@/components/AppOptionList.vue'
import DocumentCaptureModal from '@/features/documents/components/DocumentCaptureModal.vue'
import { useDocumentsStore } from '@/features/documents/store'
import { useOnboardingStore } from '@/features/onboarding/store'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  submitted: []
}>()

const documentsStore = useDocumentsStore()
const onboardingStore = useOnboardingStore()

const step = ref<'ask' | 'upload'>('ask')
const captureOpen = ref(false)

const options = [
  { value: 'yes', label: 'Yes', description: 'I have additional supporting documents' },
  { value: 'no', label: 'No', description: 'I only have the standard required documents' },
]

const selected = computed({
  get: () => {
    if (onboardingStore.hasAdditionalDocs === null) return null
    return onboardingStore.hasAdditionalDocs ? 'yes' : 'no'
  },
  set: (value: string | null) => {
    if (value === 'yes') onboardingStore.setHasAdditionalDocs(true)
    if (value === 'no') onboardingStore.setHasAdditionalDocs(false)
  },
})

const additionalUploaded = computed(() =>
  documentsStore.uploadedDocuments.some((d) => d.documentTypeId === 'additional'),
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      step.value = 'ask'
      captureOpen.value = false
    }
  },
)

async function continueFromAsk() {
  if (onboardingStore.hasAdditionalDocs === null) return
  if (onboardingStore.hasAdditionalDocs) {
    step.value = 'upload'
    return
  }
  await submit()
}

async function submit() {
  await documentsStore.submitApplication()
  if (documentsStore.isSubmitted) {
    emit('submitted')
  }
}

async function handleUpload(file: File) {
  await documentsStore.uploadDocument(file, 'additional')
  if (!documentsStore.error) {
    captureOpen.value = false
  }
}

function closeGate() {
  emit('close')
}
</script>

<template>
  <AppModal :open="open && step === 'ask'" title="Additional documents" @close="closeGate">
    <p class="mb-4 text-sm text-navy/60">Do you have additional documents to include before submitting?</p>
    <AppOptionList v-model="selected" :options="options" />
    <AppButton
      class="mt-6"
      full-width
      :disabled="onboardingStore.hasAdditionalDocs === null"
      :loading="documentsStore.isSubmitting"
      @click="continueFromAsk"
    >
      Continue
    </AppButton>
  </AppModal>

  <AppModal :open="open && step === 'upload'" title="Upload additional documents" @close="closeGate">
    <p class="mb-4 text-sm text-navy/60">
      Add any supporting documents, then finalize your application.
    </p>
    <p v-if="additionalUploaded" class="mb-4 text-sm font-medium text-accent-blue">
      Additional document uploaded
    </p>
    <div class="space-y-3">
      <AppButton variant="outline" full-width @click="captureOpen = true">
        {{ additionalUploaded ? 'Replace additional document' : 'Upload additional document' }}
      </AppButton>
      <AppButton
        full-width
        :loading="documentsStore.isSubmitting"
        :disabled="!additionalUploaded"
        @click="submit"
      >
        Finalize E-Visa Application
      </AppButton>
      <AppButton variant="outline" full-width @click="step = 'ask'">Back</AppButton>
    </div>
  </AppModal>

  <DocumentCaptureModal
    :open="captureOpen"
    document-type-id="additional"
    document-name="Additional document"
    :loading="documentsStore.isLoading"
    :error="documentsStore.error"
    @close="captureOpen = false"
    @upload="handleUpload"
  />
</template>
