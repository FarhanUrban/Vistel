<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import RequiredDocumentsList from '@/features/documents/components/RequiredDocumentsList.vue'

const router = useRouter()

function goToScan() {
  router.push({ name: 'DocumentScan' })
}

function goToPayment() {
  router.push({ name: 'Payment' })
}
</script>

<template>
  <AppShell>
    <RequiredDocumentsList @scan="goToScan" @finalize="goToPayment" />
  </AppShell>
</template>
