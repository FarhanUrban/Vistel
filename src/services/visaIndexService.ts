import csvText from './data/passport-index-tidy-iso2.csv?raw'
import officialVisaLinks from './data/officialVisaLinks.json'

export type VisaRequirementCategory =
  | 'visa-free'
  | 'e-visa'
  | 'eta'
  | 'visa-required'
  | 'no-admission'

export interface NormalizedVisaRequirement {
  category: VisaRequirementCategory
  label: string
  days?: number
  raw: string
}

export interface CountryOption {
  iso2: string
  name: string
  flag: string
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

let requirementMatrix: Map<string, Map<string, string>> | null = null
let allCountryCodes: string[] | null = null

function parseCsv(): Map<string, Map<string, string>> {
  const matrix = new Map<string, Map<string, string>>()
  const lines = csvText.trim().split('\n')

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const [passport, destination, requirement] = line.split(',')
    if (!passport || !destination || !requirement) continue

    if (!matrix.has(passport)) {
      matrix.set(passport, new Map())
    }
    matrix.get(passport)!.set(destination, requirement)
  }

  return matrix
}

function getMatrix(): Map<string, Map<string, string>> {
  if (!requirementMatrix) {
    requirementMatrix = parseCsv()
  }
  return requirementMatrix
}

export function iso2ToFlag(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

export function getCountryName(iso2: string): string {
  if (iso2.length !== 2) return iso2
  try {
    return regionNames.of(iso2.toUpperCase()) ?? iso2
  } catch {
    return iso2
  }
}

export function getAllCountries(): CountryOption[] {
  if (!allCountryCodes) {
    const codes = new Set<string>()
    for (const row of getMatrix().values()) {
      for (const dest of row.keys()) {
        codes.add(dest)
      }
    }
    for (const passport of getMatrix().keys()) {
      codes.add(passport)
    }
    allCountryCodes = [...codes].sort((a, b) => getCountryName(a).localeCompare(getCountryName(b)))
  }

  return allCountryCodes.map((iso2) => ({
    iso2,
    name: getCountryName(iso2),
    flag: iso2ToFlag(iso2),
  }))
}

export function searchCountries(query: string, passportIso2?: string): CountryOption[] {
  const normalized = query.trim().toLowerCase()
  let countries = getAllCountries()

  if (passportIso2) {
    countries = countries.filter((country) => country.iso2 !== passportIso2.toUpperCase())
  }

  if (!normalized) return countries

  return countries.filter(
    (country) =>
      country.name.toLowerCase().includes(normalized) ||
      country.iso2.toLowerCase().includes(normalized),
  )
}

export function getVisaRequirement(passportIso2: string, destinationIso2: string): string | null {
  if (passportIso2.toUpperCase() === destinationIso2.toUpperCase()) {
    return '-1'
  }
  return getMatrix().get(passportIso2.toUpperCase())?.get(destinationIso2.toUpperCase()) ?? null
}

export function normalizeRequirement(raw: string | null): NormalizedVisaRequirement | null {
  if (!raw || raw === '-1') return null

  const value = raw.trim().toLowerCase()

  if (value === 'visa free' || value === 'visa on arrival') {
    return { category: 'visa-free', label: 'Visa-free', raw }
  }

  const days = Number.parseInt(value, 10)
  if (!Number.isNaN(days) && days > 0) {
    return { category: 'visa-free', label: `Visa-free (${days} days)`, days, raw }
  }

  if (value === 'e-visa') {
    return { category: 'e-visa', label: 'E-Visa', raw }
  }

  if (value === 'eta') {
    return { category: 'eta', label: 'ETA required', raw }
  }

  if (value === 'visa required') {
    return { category: 'visa-required', label: 'Visa required', raw }
  }

  if (value === 'no admission') {
    return { category: 'no-admission', label: 'No admission', raw }
  }

  return { category: 'visa-required', label: raw, raw }
}

export function getOfficialVisaLink(destinationIso2: string): string {
  const links = officialVisaLinks as Record<string, string>
  return links[destinationIso2.toUpperCase()] ?? links.DEFAULT
}

/** Map legacy country names from older onboarding data to ISO2 codes. */
const LEGACY_NAME_TO_ISO2: Record<string, string> = {
  turkey: 'TR',
  india: 'IN',
  kenya: 'KE',
  vietnam: 'VN',
  egypt: 'EG',
  thailand: 'TH',
}

export function normalizeCountryCode(value: string | null): string | null {
  if (!value) return null
  if (value.length === 2) return value.toUpperCase()
  return LEGACY_NAME_TO_ISO2[value.toLowerCase()] ?? null
}

/** Map ISO2 to legacy slug used in requiredDocuments.json keys. */
export function iso2ToLegacySlug(iso2: string): string {
  const entry = Object.entries(LEGACY_NAME_TO_ISO2).find(([, code]) => code === iso2.toUpperCase())
  return entry?.[0] ?? iso2.toLowerCase()
}
