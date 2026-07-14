<script setup lang="ts">
import type { VisaApplicationStatus } from '@/types'

defineProps<{
  status: VisaApplicationStatus
}>()

const labels: Record<VisaApplicationStatus, string> = {
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  awaiting_payment: 'Ready to pay',
  payment_processing: 'Processing payment',
  completed: 'Completed',
  rejected: 'Rejected',
}

const styles: Record<VisaApplicationStatus, string> = {
  submitted: 'bg-muted text-navy/70',
  reviewing: 'bg-accent-orange/25 text-navy',
  awaiting_payment: 'bg-accent-blue/20 text-navy',
  payment_processing: 'bg-accent-orange/25 text-navy',
  completed: 'bg-accent-blue/25 text-navy',
  rejected: 'bg-red-100 text-red-700',
}
</script>

<template>
  <span class="text-xs font-medium px-2 py-1 rounded" :class="styles[status]">
    {{ labels[status] }}
  </span>
</template>
