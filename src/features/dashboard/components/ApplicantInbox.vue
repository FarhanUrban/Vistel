<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useAuthStore } from '@/features/auth/store'
import {
  getUserNotifications,
  getUnreadCount,
  hydrateNotificationsFromRemote,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notificationService'
import type { ApplicantNotification } from '@/types'

const authStore = useAuthStore()
const router = useRouter()
const notifications = ref<ApplicantNotification[]>([])
const unreadCount = ref(0)

onMounted(async () => {
  const userId = authStore.user?.id
  if (userId) await hydrateNotificationsFromRemote(userId)
  refresh()
})

function refresh() {
  const userId = authStore.user?.id
  if (!userId) return
  notifications.value = getUserNotifications(userId)
  unreadCount.value = getUnreadCount(userId)
}

function handleOpen(notification: ApplicantNotification) {
  markNotificationRead(notification.id, notification.userId)
  refresh()
  if (notification.status === 'rejected') {
    router.push({
      name: 'WhyRejected',
      query: { applicationId: notification.applicationId },
    })
    return
  }
  if (notification.status === 'awaiting_payment') {
    router.push({
      name: 'Payment',
      query: { applicationId: notification.applicationId },
    })
  }
}

function markAllRead() {
  const userId = authStore.user?.id
  if (!userId) return
  markAllNotificationsRead(userId)
  refresh()
}

const hasNotifications = computed(() => notifications.value.length > 0)
</script>

<template>
  <AppCard v-if="hasNotifications" class="mb-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-navy">
        Inbox
        <span
          v-if="unreadCount > 0"
          class="ml-2 inline-flex items-center rounded-full bg-accent-orange px-2 py-0.5 text-xs font-bold text-navy"
        >
          {{ unreadCount }}
        </span>
      </h2>
      <button
        v-if="unreadCount > 0"
        type="button"
        class="text-xs font-medium text-accent-blue hover:underline"
        @click="markAllRead"
      >
        Mark all read
      </button>
    </div>
    <ul class="space-y-2">
      <li
        v-for="item in notifications.slice(0, 5)"
        :key="item.id"
        class="rounded-control border p-3 text-sm transition-colors"
        :class="item.read ? 'border-muted bg-white' : 'border-accent-blue/30 bg-accent-blue/5'"
      >
        <p class="font-medium text-navy">{{ item.message }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{ new Date(item.createdAt).toLocaleString() }}
        </p>
        <p v-if="item.rejectionDetails" class="text-xs text-gray-600 mt-2">
          {{ item.rejectionDetails }}
        </p>
        <AppButton
          v-if="item.status === 'awaiting_payment' || item.status === 'rejected'"
          variant="outline"
          size="sm"
          class="mt-2"
          @click="handleOpen(item)"
        >
          {{ item.status === 'rejected' ? 'View details' : 'Proceed to payment' }}
        </AppButton>
      </li>
    </ul>
  </AppCard>
</template>
