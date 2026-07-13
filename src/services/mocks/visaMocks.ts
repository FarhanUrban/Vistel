import type { VisaApplication, VisaApplicationStatus } from '@/types'
import { visaExpiryFromPaidAt } from '@/services/localDocumentStorage'

const paidAtCompleted = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()

const mockApplications: VisaApplication[] = [
  {
    id: 'app-1',
    userId: 'mock-user-1',
    status: 'awaiting_payment',
    destinationCountry: 'TR',
    visaType: 'e-visa',
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'app-2',
    userId: 'mock-user-1',
    status: 'rejected',
    destinationCountry: 'IN',
    visaType: 'tourist',
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    rejectionCode: 'MISSING_ITINERARY',
  },
  {
    id: 'app-3',
    userId: 'mock-user-1',
    status: 'completed',
    destinationCountry: 'KE',
    visaType: 'e-visa',
    submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    paidAt: paidAtCompleted,
    expiresAt: visaExpiryFromPaidAt(paidAtCompleted, 'e-visa'),
  },
]

export async function mockGetApplications(userId: string): Promise<VisaApplication[]> {
  console.info('[visaMocks] mockGetApplications', { userId })
  await delay(300)
  // Demo apps are shared across mock auth users so the dashboard stays populated.
  return mockApplications.map((app) => ({ ...app, userId }))
}

export async function mockGetApplicationStatus(applicationId: string): Promise<VisaApplicationStatus> {
  console.info('[visaMocks] mockGetApplicationStatus', { applicationId })
  await delay(200)
  const app = mockApplications.find((a) => a.id === applicationId)
  return app?.status ?? 'reviewing'
}

export async function mockPollApplicationStatus(
  applicationId: string,
): Promise<VisaApplication | null> {
  console.info('[visaMocks] mockPollApplicationStatus', { applicationId })
  await delay(500)
  return mockApplications.find((a) => a.id === applicationId) ?? null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
