<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import RequiredDocumentsList from '@/features/documents/components/RequiredDocumentsList.vue'
import { useDocumentsStore } from '@/features/documents/store'

const router = useRouter()
const documentsStore = useDocumentsStore()

function goToConfirmation() {
  const applicationId = documentsStore.lastApplicationId
  if (applicationId) {
    router.push({ name: 'Dashboard', query: { newlySubmittedAppId: applicationId } })
  }
}
</script>

<template>
  <AppShell>
    <RequiredDocumentsList @finalize="goToConfirmation" />
  </AppShell>
</template>
