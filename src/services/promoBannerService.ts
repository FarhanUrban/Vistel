import { getCachedPromoBanner, setCachedPromoBanner } from './platformStorage'
import { syncPromoBannerToR2 } from './platformSync'

export interface PromoBannerConfig {
  enabled: boolean
  message: string
  ctaLabel: string
  ctaHref: string
  dismissible: boolean
}

const DEFAULT_PROMO: PromoBannerConfig = {
  enabled: true,
  message: 'Sign up and get 45% off as a new user!',
  ctaLabel: 'Learn More',
  ctaHref: '/signup',
  dismissible: true,
}

/** Session-only dismiss flag — cleared when the tab closes. */
const DISMISS_KEY = 'vislet_promo_banner_dismissed'

export function getPromoBannerConfig(): PromoBannerConfig {
  const stored = getCachedPromoBanner() as Partial<PromoBannerConfig> | null
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_PROMO }
  return {
    ...DEFAULT_PROMO,
    ...stored,
    enabled: stored.enabled ?? DEFAULT_PROMO.enabled,
    message: stored.message?.trim() || DEFAULT_PROMO.message,
    ctaLabel: stored.ctaLabel?.trim() || DEFAULT_PROMO.ctaLabel,
    ctaHref: stored.ctaHref?.trim() || DEFAULT_PROMO.ctaHref,
    dismissible: stored.dismissible ?? DEFAULT_PROMO.dismissible,
  }
}

export function savePromoBannerConfig(config: PromoBannerConfig): void {
  setCachedPromoBanner(config)
  try {
    sessionStorage.removeItem(DISMISS_KEY)
  } catch {
    // ignore
  }
  void syncPromoBannerToR2(config)
}

export function isPromoBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissPromoBanner(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // ignore
  }
}

export function shouldShowPromoBanner(): boolean {
  const config = getPromoBannerConfig()
  if (!config.enabled) return false
  if (config.dismissible && isPromoBannerDismissed()) return false
  return true
}
