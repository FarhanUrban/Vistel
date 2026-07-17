export interface User {
  id: string
  email: string
  displayName?: string
  role?: 'user' | 'admin' | 'agency'
  orgId?: string
  orgKind?: AgencyOrgKind
  mustChangePassword?: boolean
}

export type AgencyOrgKind = 'travel' | 'government'

export interface AgencyOrgStats {
  submitted: number
  pending: number
  approved: number
  rejected: number
  awaitingPayment: number
  completed: number
}

export interface AgencyOrg {
  id: string
  name: string
  orgKind: AgencyOrgKind
  countries: string[]
  memberUids: string[]
  memberEmails: string[]
  /** Primary login email for the agency lead. */
  primaryMemberEmail?: string
  /** SHA-256 hex of the temporary invite password (never plaintext). */
  invitePasswordHash?: string
  /** When true, agency lead must set a new password after login. */
  mustChangePassword?: boolean
  /** Max pending applications before overflow to another org (default 25). */
  maxPendingApplications?: number
  active: boolean
  stats: AgencyOrgStats
  createdAt: string
}

export interface PaymentRecord {
  id: string
  userId: string
  applicationId: string
  destinationCountry: string
  visaType: VisaType
  amount: number
  currency: string
  transactionId: string
  paidAt: string
  status: 'success' | 'failed'
}

export interface CountryKeyRegistryEntry {
  iso2: string
  publicKeyJwk: JsonWebKey
  registeredByOrgId: string
  registeredAt: string
  live: boolean
  /** Per-agency key version id (rotation keeps older keyIds decryptable). */
  keyId?: string
  orgId?: string
  lastRotatedAt?: string
}

export interface ApplicantNotification {
  id: string
  userId: string
  type: 'decision'
  applicationId: string
  status: VisaApplicationStatus
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
  acceptanceNote?: string
  message: string
  createdAt: string
  read: boolean
}

export interface AdminAuditEntry {
  id: string
  actorUid: string
  orgId?: string
  action: string
  applicationId?: string
  timestamp: string
}

export interface EncryptedEnvelope {
  version: 1
  encryptedKey: string
  iv: string
  ciphertext: string
  orgId?: string
  keyId?: string
}

export type VisaType = 'e-visa' | 'tourist' | 'business' | 'student'

export type PassportType = 'regular' | 'diplomatic' | 'official'

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed'

export type VisaApplicationStatus =
  'submitted' | 'reviewing' | 'awaiting_payment' | 'payment_processing' | 'completed' | 'rejected'

export interface OnboardingData {
  visaType: VisaType | null
  passportType: PassportType | null
  passportCountry: string | null
  hasAdditionalDocs: boolean | null
  destinationCountry: string | null
}

export interface OnboardingDraft {
  id: string
  visaType: VisaType | null
  passportType: PassportType | null
  passportCountry: string | null
  hasAdditionalDocs: boolean | null
  destinationCountry: string | null
  updatedAt: string
}

export interface RequiredDocument {
  id: string
  name: string
  description: string
  required: boolean
}

export interface VisaQuestion {
  id: string
  label: string
  type: 'text' | 'select' | 'date' | 'textarea' | 'radio'
  required: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
  category?: string
}

export interface UploadedDocument {
  id: string
  name: string
  url: string
  uploadedAt: string
  documentTypeId?: string
  destinationCountry?: string
  visaType?: VisaType
}

export interface FeeBreakdown {
  visaFee: number
  serviceFee: number
  total: number
  currency: string
}

export type ApplicationStorageFormat = 'server-readable-v1' | 'legacy-encrypted-v1'

export interface VisaApplication {
  id: string
  userId: string
  status: VisaApplicationStatus
  destinationCountry: string
  visaType: VisaType
  submittedAt: string
  reviewedAt?: string
  paidAt?: string
  expiresAt?: string
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
  acceptanceNote?: string
  documents?: Pick<UploadedDocument, 'id' | 'name' | 'uploadedAt' | 'documentTypeId'>[]
  answers?: Record<string, string>
  agencyId?: string
  orgId?: string
  keyId?: string
  passportCountry?: string
  passportType?: PassportType
  hasAdditionalDocs?: boolean
  clientName?: string
  clientEmail?: string
  notes?: string
  encryptedPayloadRef?: string
  reviewedByUid?: string
  storageFormat?: ApplicationStorageFormat
  /** Legacy: when true, sensitive fields are stored only in encryptedPayloadRef. */
  encrypted?: boolean
  resubmissionOf?: string
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
