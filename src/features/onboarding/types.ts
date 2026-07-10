import type { OnboardingData, PassportType, VisaType } from '@/types'

export type { OnboardingData, VisaType, PassportType }

export const DESTINATION_OPTIONS = [
  'Turkey',
  'India',
  'Kenya',
  'Vietnam',
  'Egypt',
  'Thailand',
] as const

export const VISA_TYPE_OPTIONS: { value: VisaType; label: string }[] = [
  { value: 'e-visa', label: 'E-Visa' },
  { value: 'tourist', label: 'Tourist Visa' },
  { value: 'business', label: 'Business Visa' },
  { value: 'student', label: 'Student Visa' },
]

export const PASSPORT_TYPE_OPTIONS: { value: PassportType; label: string }[] = [
  { value: 'regular', label: 'Regular Passport' },
  { value: 'diplomatic', label: 'Diplomatic Passport' },
  { value: 'official', label: 'Official Passport' },
]
