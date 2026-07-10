import type { VisaApplication, VisaApplicationStatus } from '@/types'
import { useMockServices } from './config'
import {
  mockGetApplications,
  mockGetApplicationStatus,
  mockPollApplicationStatus,
} from './mocks/visaMocks'

export async function getApplications(userId: string): Promise<VisaApplication[]> {
  if (useMockServices()) {
    return mockGetApplications(userId)
  }
  // Firestore query would go here
  return mockGetApplications(userId)
}

export async function getApplicationStatus(applicationId: string): Promise<VisaApplicationStatus> {
  if (useMockServices()) {
    return mockGetApplicationStatus(applicationId)
  }
  return mockGetApplicationStatus(applicationId)
}

export async function pollApplicationStatus(applicationId: string): Promise<VisaApplication | null> {
  if (useMockServices()) {
    return mockPollApplicationStatus(applicationId)
  }
  return mockPollApplicationStatus(applicationId)
}
