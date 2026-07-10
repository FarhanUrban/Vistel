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
  return mockInterviews
}

export async function mockAddInterview(interview: Omit<Interview, 'id'>): Promise<Interview> {
  console.info('[interviewsMocks] mockAddInterview', interview)
  await delay(400)
  return { ...interview, id: `int-${Date.now()}` }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
