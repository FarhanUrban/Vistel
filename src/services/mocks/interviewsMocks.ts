import type { Interview } from '@/types'

const mockInterviews: Interview[] = [
  {
    id: 'int-1',
    applicationId: 'app-1',
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Turkish Consulate, New York',
    scheduledBy: 'consulate',
    notes: 'Bring original passport and appointment confirmation',
  },
  {
    id: 'int-2',
    applicationId: 'app-2',
    scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Indian Embassy, Washington DC',
    scheduledBy: 'user',
  },
]

export async function mockGetInterviews(userId: string): Promise<Interview[]> {
  console.info('[interviewsMocks] mockGetInterviews', { userId })
  await delay(300)
  // Tie mocks to the same user apps shown on the dashboard.
  return mockInterviews.map((interview) => ({ ...interview, userId }))
}

export async function mockAddInterview(interview: Omit<Interview, 'id'>): Promise<Interview> {
  console.info('[interviewsMocks] mockAddInterview', interview)
  await delay(400)
  const created = { ...interview, id: `int-${Date.now()}` }
  mockInterviews.push(created)
  return created
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
