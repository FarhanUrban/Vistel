export type { FeeBreakdown, PaymentStatus } from '@/types'

export const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'apple_pay', label: 'Apple Pay', icon: '🍎' },
  { id: 'google_pay', label: 'Google Pay', icon: '📱' },
  { id: 'paypal', label: 'PayPal', icon: '🅿️' },
] as const
