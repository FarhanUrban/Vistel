export interface User {
  id: string
  email: string
  displayName?: string
}

export type VisaType = 'e-visa' | 'tourist' | 'business' | 'student'

export type PassportType = 'regular' | 'diplomatic' | 'official'

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed'

export type VisaApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'awaiting_payment'
  | 'payment_processing'
  | 'completed'
  | 'rejected'

export interface OnboardingData {
  visaType: VisaType | null
  passportType: PassportType | null
  passportCountry: string | null
  hasAdditionalDocs: boolean | null
  destinationCountry: string | null
}

export interface RequiredDocument {
  id: string
  name: string
  description: string
  required: boolean
}

export interface UploadedDocument {
  id: string
  name: string
  url: string
  uploadedAt: string
  documentTypeId?: string
}

export interface FeeBreakdown {
  visaFee: number
  serviceFee: number
  total: number
  currency: string
}

export interface VisaApplication {
  id: string
  userId: string
  status: VisaApplicationStatus
  destinationCountry: string
  visaType: VisaType
  submittedAt: string
  reviewedAt?: string
  paidAt?: string
  rejectionCode?: string
  documents?: Pick<UploadedDocument, 'id' | 'name' | 'uploadedAt' | 'documentTypeId'>[]
}

export interface Interview {
  id: string
  userId?: string
  applicationId: string
  scheduledAt: string
  location: string
  scheduledBy: 'user' | 'consulate'
  notes?: string
}

export interface RejectionReason {
  code: string
  title: string
  description: string
}
