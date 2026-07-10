import type { FeeBreakdown, VisaType } from '@/types'

export async function mockCalculateFee(
  visaType: VisaType,
  destinationCountry: string,
): Promise<FeeBreakdown> {
  console.info('[paymentsMocks] mockCalculateFee', { visaType, destinationCountry })
  await delay(300)
  const visaFees: Record<VisaType, number> = {
    'e-visa': 45,
    tourist: 80,
    business: 120,
    student: 60,
  }
  const visaFee = visaFees[visaType] ?? 50
  const serviceFee = 20
  return {
    visaFee,
    serviceFee,
    total: visaFee + serviceFee,
    currency: 'USD',
  }
}

export async function mockProcessPayment(_method: string): Promise<{ transactionId: string }> {
  console.info('[paymentsMocks] mockProcessPayment', { method: _method })
  await delay(1500)
  return { transactionId: `txn-mock-${Date.now()}` }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
