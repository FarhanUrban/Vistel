import type { RejectionReason } from '@/types'

const rejectionReasons: RejectionReason[] = [
  {
    code: 'MISSING_PASSPORT',
    title: 'Missing or Invalid Passport',
    description: 'Your passport photo was unclear or the passport has expired.',
  },
  {
    code: 'MISSING_ITINERARY',
    title: 'Missing Travel Itinerary',
    description: 'A complete travel itinerary with flight and hotel bookings is required.',
  },
  {
    code: 'BLURRY_PHOTO',
    title: 'Blurry Passport Photo',
    description: 'The passport photo did not meet the required quality standards.',
  },
  {
    code: 'INCOMPLETE_FORM',
    title: 'Incomplete Application',
    description: 'Some required fields in the application form were left blank.',
  },
  {
    code: 'INSUFFICIENT_FUNDS',
    title: 'Proof of Funds Missing',
    description: 'Bank statements or proof of sufficient funds were not provided.',
  },
]

export function mockGetRejectionReasons(): RejectionReason[] {
  console.info('[rejectionsMocks] mockGetRejectionReasons')
  return rejectionReasons
}

export function mockGetRejectionReasonByCode(code: string): RejectionReason | undefined {
  console.info('[rejectionsMocks] mockGetRejectionReasonByCode', { code })
  return rejectionReasons.find((r) => r.code === code)
}
