import type { Interview } from '@/types'
import { useMockServices } from './config'
import { mockGetInterviews, mockAddInterview } from './mocks/interviewsMocks'

export async function getInterviews(userId: string): Promise<Interview[]> {
  if (useMockServices()) {
    return mockGetInterviews(userId)
  }
  return mockGetInterviews(userId)
}

export async function addInterview(
  _userId: string,
  interview: Omit<Interview, 'id'>,
): Promise<Interview> {
  if (useMockServices()) {
    return mockAddInterview(interview)
  }
  return mockAddInterview(interview)
}
