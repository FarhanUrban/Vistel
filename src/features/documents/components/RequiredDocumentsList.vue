<script setup lang="ts">
import { onMounted } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import { useDocumentsStore } from '@/features/documents/store'

const documentsStore = useDocumentsStore()

const emit = defineEmits<{
  scan: []
  finalize: []
}>()

onMounted(() => {
  documentsStore.loadRequiredDocuments()
})

async function handleSubmit() {
  await documentsStore.submitApplication()
  if (documentsStore.isSubmitted) {
    emit('finalize')
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2">Required documents</h1>
    <p class="text-gray-500 mb-6">Make sure you have uploaded all required documents before submitting.</p>

    <AppErrorMessage v-if="documentsStore.error" :message="documentsStore.error" class="mb-4" />
    <AppLoadingSpinner v-if="documentsStore.isLoading" />

    <ul v-else class="space-y-3 mb-6">
      <li v-for="doc in documentsStore.requiredDocuments" :key="doc.id">
        <AppCard padding="sm">
          <div class="flex items-start gap-3">
            <span
              class="mt-0.5 text-sm font-medium px-2 py-0.5 rounded"
              :class="doc.required ? 'bg-accent-orange/20 text-navy' : 'bg-gray-100 text-gray-500'"
            >
              {{ doc.required ? 'Required' : 'Optional' }}
            </span>
            <div>
              <p class="font-medium text-navy">{{ doc.name }}</p>
              <p class="text-sm text-gray-500 mt-0.5">{{ doc.description }}</p>
            </div>
          </div>
        </AppCard>
      </li>
    </ul>

    <div class="space-y-3">
      <AppButton variant="outline" full-width @click="emit('scan')">Scan More Documents</AppButton>
      <AppButton
        full-width
        :loading="documentsStore.isSubmitting"
        @click="handleSubmit"
      >
        Finalize E-Visa Application
      </AppButton>
    </div>
  </div>
</template>
