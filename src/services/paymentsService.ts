import type { FeeBreakdown, VisaType } from '@/types'
import { useMockServices } from './config'
import { mockCalculateFee, mockProcessPayment } from './mocks/paymentsMocks'

export async function calculateFee(
  visaType: VisaType,
  destinationCountry: string,
): Promise<FeeBreakdown> {
  if (useMockServices()) {
    return mockCalculateFee(visaType, destinationCountry)
  }
  // Stripe or backend fee calculation would go here
  return mockCalculateFee(visaType, destinationCountry)
}

export async function processPayment(paymentMethod: string): Promise<{ transactionId: string }> {
  if (useMockServices()) {
    return mockProcessPayment(paymentMethod)
  }
  // Stripe integration would go here
  return mockProcessPayment(paymentMethod)
}
