import type { VisaApplication, VisaApplicationStatus } from '@/types'

const mockApplications: VisaApplication[] = [
  {
    id: 'app-1',
    userId: 'mock-user-1',
    status: 'pending',
    destinationCountry: 'Turkey',
    visaType: 'e-visa',
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'app-2',
    userId: 'mock-user-1',
    status: 'rejected',
    destinationCountry: 'India',
    visaType: 'tourist',
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    rejectionCode: 'MISSING_ITINERARY',
  },
  {
    id: 'app-3',
    userId: 'mock-user-1',
    status: 'approved',
    destinationCountry: 'Kenya',
    visaType: 'e-visa',
    submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export async function mockGetApplications(userId: string): Promise<VisaApplication[]> {
  console.info('[visaMocks] mockGetApplications', { userId })
  await delay(300)
  return mockApplications.filter((a) => a.userId === userId)
}

export async function mockGetApplicationStatus(applicationId: string): Promise<VisaApplicationStatus> {
  console.info('[visaMocks] mockGetApplicationStatus', { applicationId })
  await delay(200)
  const app = mockApplications.find((a) => a.id === applicationId)
  return app?.status ?? 'pending'
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
