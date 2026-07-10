import type { RouteLocationRaw } from 'vue-router'
import { useOnboardingStore } from '@/features/onboarding/store'

export function getPostAuthRoute(redirect?: string | null): RouteLocationRaw {
  if (redirect) return redirect

  const onboarding = useOnboardingStore()
  if (!onboarding.isComplete()) {
    return { name: 'OnboardingVisaType' }
  }

  return { name: 'Dashboard' }
}
