import type { ApplicantNotification, VisaApplicationStatus } from '@/types'
import {
  loadNotifications,
  saveNotifications,
} from './platformStorage'

export function getUserNotifications(userId: string): ApplicantNotification[] {
  return loadNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getUnreadCount(userId: string): number {
  return getUserNotifications(userId).filter((n) => !n.read).length
}

export function markNotificationRead(notificationId: string, userId: string): void {
  const items = loadNotifications()
  const idx = items.findIndex((n) => n.id === notificationId && n.userId === userId)
  if (idx >= 0) {
    items[idx] = { ...items[idx], read: true }
    saveNotifications(items)
  }
}

export function markAllNotificationsRead(userId: string): void {
  saveNotifications(
    loadNotifications().map((n) => (n.userId === userId ? { ...n, read: true } : n)),
  )
}

export function notifyApplicationDecision(input: {
  userId: string
  applicationId: string
  status: VisaApplicationStatus
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
}): ApplicantNotification {
  const message =
    input.status === 'awaiting_payment'
      ? 'Your visa application was approved. Proceed to payment when ready.'
      : input.status === 'rejected'
        ? 'Your visa application was not approved. See details in your dashboard.'
        : `Your application status is now ${input.status.replace('_', ' ')}.`

  const notification: ApplicantNotification = {
    id: `notif-${Date.now()}`,
    userId: input.userId,
    type: 'decision',
    applicationId: input.applicationId,
    status: input.status,
    rejectionCode: input.rejectionCode,
    rejectionOther: input.rejectionOther,
    rejectionDetails: input.rejectionDetails,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }

  const items = loadNotifications()
  items.unshift(notification)
  saveNotifications(items.slice(0, 200))
  return notification
}

export function clearUserNotifications(userId: string): void {
  saveNotifications(loadNotifications().filter((n) => n.userId !== userId))
}
