import type { RequiredDocument, UploadedDocument, VisaType } from '@/types'

export async function mockGetRequiredDocuments(
  destinationCountry: string,
  visaType: VisaType,
): Promise<RequiredDocument[]> {
  console.info('[documentsMocks] mockGetRequiredDocuments', { destinationCountry, visaType })
  await delay(300)
  return [
    {
      id: 'passport',
      name: 'Passport',
      description: 'Valid passport with at least 6 months validity',
      required: true,
    },
    {
      id: 'photo',
      name: 'Passport Photo',
      description: 'Recent passport-sized photo on white background',
      required: true,
    },
    {
      id: 'itinerary',
      name: 'Travel Itinerary',
      description: 'Flight bookings and accommodation details',
      required: visaType === 'tourist',
    },
    {
      id: 'invitation',
      name: 'Invitation Letter',
      description: 'Letter from host or business partner',
      required: visaType === 'business',
    },
  ]
}

export async function mockUploadDocument(file: File): Promise<UploadedDocument> {
  console.info('[documentsMocks] mockUploadDocument', { name: file.name })
  await delay(800)
  return {
    id: `doc-${Date.now()}`,
    name: file.name,
    url: `https://mock-storage.vislet.app/${file.name}`,
    uploadedAt: new Date().toISOString(),
  }
}

export async function mockSubmitApplication(applicationId: string): Promise<void> {
  console.info('[documentsMocks] mockSubmitApplication', { applicationId })
  await delay(500)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
