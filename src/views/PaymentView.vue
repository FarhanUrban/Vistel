<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import PaymentForm from '@/features/payments/components/PaymentForm.vue'

const router = useRouter()

function goToSuccess() {
  router.push({ name: 'PaymentSuccess' })
}
</script>

<template>
  <AppShell>
    <PaymentForm @success="goToSuccess" />
  </AppShell>
</template>
