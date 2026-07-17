<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppOptionList from '@/components/AppOptionList.vue'
import DocumentCaptureModal from '@/features/documents/components/DocumentCaptureModal.vue'
import { useDocumentsStore } from '@/features/documents/store'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useAuthStore } from '@/features/auth/store'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  submitted: []
}>()

const documentsStore = useDocumentsStore()
const onboardingStore = useOnboardingStore()
const authStore = useAuthStore()

const step = ref<'summary' | 'ask' | 'upload'>('summary')
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

const answerGroups = computed(() => {
  const groups = new Map<string, { label: string; value: string }[]>()
  for (const question of documentsStore.visaQuestions) {
    const raw = documentsStore.answers[question.id]
    if (!raw || !raw.trim()) continue
    const category = question.category ?? 'Other'
    const list = groups.get(category) ?? []
    list.push({ label: question.label, value: raw })
    groups.set(category, list)
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }))
})

const legalName = computed({
  get: () => documentsStore.clientLegalName,
  set: (value: string) => documentsStore.setClientLegalName(value),
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      step.value = 'summary'
      captureOpen.value = false
      if (!documentsStore.clientLegalName.trim() && authStore.user?.displayName) {
        documentsStore.setClientLegalName(authStore.user.displayName)
      }
    }
  },
)

function continueFromSummary() {
  if (!documentsStore.clientLegalName.trim() || documentsStore.clientLegalName.trim().length < 2) {
    documentsStore.error = 'Enter your full legal name as it appears on your passport'
    return
  }
  documentsStore.error = null
  step.value = 'ask'
}

async function continueFromAsk() {
  if (onboardingStore.hasAdditionalDocs === null) return
  if (onboardingStore.hasAdditionalDocs) {
    step.value = 'upload'
    return
  }
  await submit()
}

async function submit() {
  if (!documentsStore.canFinalize) return
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
  <AppModal :open="open && step === 'summary'" title="Review your answers" @close="closeGate">
    <p class="mb-4 text-sm text-navy/60">
      Confirm your full legal name and application answers before submitting.
    </p>
    <AppInput
      v-model="legalName"
      label="Full legal name"
      placeholder="As it appears on your passport"
      class="mb-4"
      required
    />
    <p v-if="documentsStore.error" class="mb-3 text-sm text-red-600">{{ documentsStore.error }}</p>
    <div v-if="answerGroups.length === 0" class="mb-4 text-sm text-navy/50">
      No answers recorded.
    </div>
    <div v-else class="mb-6 max-h-72 space-y-4 overflow-y-auto">
      <section v-for="group in answerGroups" :key="group.category">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-blue">
          {{ group.category }}
        </h3>
        <ul class="space-y-2">
          <li
            v-for="item in group.items"
            :key="item.label"
            class="rounded-control border border-muted bg-surface px-3 py-2"
          >
            <p class="text-xs text-navy/50">{{ item.label }}</p>
            <p class="text-sm font-medium text-navy">{{ item.value }}</p>
          </li>
        </ul>
      </section>
    </div>
    <AppButton
      full-width
      variant="secondary"
      :disabled="!documentsStore.allRequiredUploaded() || !documentsStore.allRequiredAnswered()"
      @click="continueFromSummary"
    >
      Continue
    </AppButton>
  </AppModal>

  <AppModal :open="open && step === 'ask'" title="Additional documents" @close="closeGate">
    <p class="mb-4 text-sm text-navy/60">
      Do you have additional documents to include before submitting?
    </p>
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
    <AppButton class="mt-3" variant="outline" full-width @click="step = 'summary'">Back</AppButton>
  </AppModal>

  <AppModal
    :open="open && step === 'upload'"
    title="Upload additional documents"
    @close="closeGate"
  >
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
        :disabled="!additionalUploaded || !documentsStore.canFinalize"
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
