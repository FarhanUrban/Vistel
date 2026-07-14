<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppLoadingSpinner from '@/components/AppLoadingSpinner.vue'
import AppErrorMessage from '@/components/AppErrorMessage.vue'
import { getApplication, updateApplication } from '@/services/visaService'
import type { VisaApplication } from '@/types'

const route = useRoute()
const router = useRouter()

const application = ref<VisaApplication | null>(null)
const error = ref<string | null>(null)
const isLoading = ref(true)
const isReviewing = ref(false)
const reviewComplete = ref(false)
const reviewResult = ref<'approved' | 'rejected' | null>(null)

let reviewTimer: ReturnType<typeof setTimeout> | null = null
let redirectTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  const applicationId = route.query.applicationId
  if (typeof applicationId !== 'string' || !applicationId) {
    error.value = 'Application not found'
    isLoading.value = false
    return
  }

  try {
    application.value = await getApplication(applicationId)
    if (!application.value) {
      error.value = 'Application not found'
      isLoading.value = false
      return
    }

    isLoading.value = false
    isReviewing.value = true
    await updateApplication(applicationId, { status: 'reviewing' })
    application.value.status = 'reviewing'

    reviewTimer = setTimeout(async () => {
      const approved = Math.random() < 0.9
      reviewResult.value = approved ? 'approved' : 'rejected'
      reviewComplete.value = true
      isReviewing.value = false

      if (approved) {
        await updateApplication(applicationId, {
          status: 'awaiting_payment',
          reviewedAt: new Date().toISOString(),
        })
        redirectTimer = setTimeout(() => {
          router.push({ name: 'Dashboard' })
        }, 1500)
      } else {
        await updateApplication(applicationId, {
          status: 'rejected',
          reviewedAt: new Date().toISOString(),
          rejectionCode: 'DOCUMENT_QUALITY',
        })
        redirectTimer = setTimeout(() => {
          router.push({ name: 'WhyRejected', query: { applicationId } })
        }, 1500)
      }
    }, 5000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load application'
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (reviewTimer) clearTimeout(reviewTimer)
  if (redirectTimer) clearTimeout(redirectTimer)
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2 lg:text-3xl">Application submitted</h1>
    <p class="text-gray-500 mb-6">Your documents have been received.</p>

    <AppErrorMessage v-if="error" :message="error" class="mb-4" />
    <AppLoadingSpinner v-if="isLoading" />

    <template v-else-if="application">
      <AppCard class="mb-6">
        <h2 class="font-medium text-navy mb-3">Uploaded documents</h2>
        <ul class="space-y-2 text-sm">
          <li
            v-for="doc in application.documents"
            :key="doc.id"
            class="flex items-center gap-2 text-gray-600"
          >
            <span class="text-accent-blue">✓</span>
            {{ doc.name }}
          </li>
        </ul>
      </AppCard>

      <AppCard v-if="isReviewing" class="text-center py-8">
        <AppLoadingSpinner class="mx-auto mb-4" />
        <p class="font-medium text-navy">Reviewing your application…</p>
        <p class="text-sm text-gray-500 mt-1">This usually takes a few seconds.</p>
      </AppCard>

      <AppCard v-else-if="reviewComplete" class="text-center py-8">
        <div v-if="reviewResult === 'approved'" class="text-5xl mb-3">✅</div>
        <div v-else class="text-5xl mb-3">❌</div>
        <p class="font-medium text-navy">
          {{
            reviewResult === 'approved' ? 'Approved — ready for payment' : 'Application rejected'
          }}
        </p>
        <p class="text-sm text-gray-500 mt-1">Redirecting…</p>
      </AppCard>
    </template>
  </div>
</template>
