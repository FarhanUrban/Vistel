import { getCountryName } from '@/services/visaIndexService'

export function flagImageUrl(iso2: string, width = 80): string {
  const code = iso2.toLowerCase()
  return `https://flagcdn.com/w${width}/${code}.png`
}

export function flagImageUrl2x(iso2: string, width = 80): string {
  const code = iso2.toLowerCase()
  return `https://flagcdn.com/w${width * 2}/${code}.png 2x`
}

/** Soft scenic banner for a destination; fallbacks handled by the consuming component. */
export function countryBannerUrl(iso2: string, name?: string): string {
  const country = encodeURIComponent(name ?? getCountryName(iso2))
  return `https://images.unsplash.com/featured/1200x400/?${country},landmark,travel`
}

export function countryBannerFallbackUrl(iso2: string): string {
  const code = iso2.toLowerCase()
  return `https://flagcdn.com/w640/${code}.png`
}
