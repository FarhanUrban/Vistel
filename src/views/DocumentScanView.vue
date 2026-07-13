<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import DocumentScanForm from '@/features/documents/components/DocumentScanForm.vue'
import { useDocumentsStore } from '@/features/documents/store'

const router = useRouter()
const documentsStore = useDocumentsStore()

function goToList() {
  router.push({ name: 'RequiredDocuments' })
}

function goToConfirmation() {
  const applicationId = documentsStore.lastApplicationId
  if (applicationId) {
    router.push({ name: 'DocumentConfirmation', query: { applicationId } })
  }
}
</script>

<template>
  <AppShell>
    <DocumentScanForm @view-list="goToList" @finalize="goToConfirmation" />
  </AppShell>
</template>
