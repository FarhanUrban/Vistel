<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import DocumentScanForm from '@/features/documents/components/DocumentScanForm.vue'

const router = useRouter()

function goToList() {
  router.push({ name: 'RequiredDocuments' })
}
</script>

<template>
  <AppShell>
    <DocumentScanForm @view-list="goToList" />
  </AppShell>
</template>
