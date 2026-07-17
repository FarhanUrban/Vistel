import type { ApplicantNotification, VisaApplicationStatus } from '@/types'
import {
  loadNotifications,
  saveNotifications,
} from './platformStorage'
import { buildPortalAuthHeader, readPortalSession } from './portalToken'
import { getFirebaseAuth } from './api'

async function getAuthHeader(): Promise<string | null> {
  try {
    const user = getFirebaseAuth().currentUser
    if (user) return `Bearer ${await user.getIdToken()}`
  } catch {
    // portal
  }
  const portal = readPortalSession()
  if (portal) return buildPortalAuthHeader(portal)
  return null
}

export async function hydrateNotificationsFromRemote(userId: string): Promise<void> {
  const authHeader = await getAuthHeader()
  if (!authHeader) return
  try {
    const response = await fetch('/api/platform/notifications', {
      credentials: 'include',
      headers: { Authorization: authHeader },
    })
    if (!response.ok) return
    const data = (await response.json()) as { notifications?: ApplicantNotification[] }
    if (!Array.isArray(data.notifications)) return
    const mine = data.notifications.filter((n) => n.userId === userId)
    const others = loadNotifications().filter((n) => n.userId !== userId)
    saveNotifications([...mine, ...others].slice(0, 200))
  } catch {
    // Best-effort hydrate.
  }
}

async function persistNotificationsRemote(items: ApplicantNotification[]): Promise<void> {
  const authHeader = await getAuthHeader()
  if (!authHeader) return
  try {
    await fetch('/api/platform/notifications', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notifications: items }),
    })
  } catch {
    // Best-effort sync.
  }
}

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
    void persistNotificationsRemote(items)
  }
}

export function markAllNotificationsRead(userId: string): void {
  const items = loadNotifications().map((n) => (n.userId === userId ? { ...n, read: true } : n))
  saveNotifications(items)
  void persistNotificationsRemote(items)
}

export function notifyApplicationDecision(input: {
  userId: string
  applicationId: string
  status: VisaApplicationStatus
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
  acceptanceNote?: string
}): ApplicantNotification {
  const message =
    input.status === 'awaiting_payment'
      ? input.acceptanceNote
        ? `Your visa application was approved. Note from reviewer: ${input.acceptanceNote}`
        : 'Your visa application was approved. Proceed to payment when ready.'
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
    acceptanceNote: input.acceptanceNote,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }

  const items = loadNotifications()
  // Avoid duplicates when server already wrote the notification.
  if (!items.some((n) => n.applicationId === input.applicationId && n.status === input.status && !n.read)) {
    items.unshift(notification)
  }
  saveNotifications(items.slice(0, 200))
  void persistNotificationsRemote(items.slice(0, 200))
  return notification
}

export function clearUserNotifications(userId: string): void {
  const items = loadNotifications().filter((n) => n.userId !== userId)
  saveNotifications(items)
  void persistNotificationsRemote(items)
}
