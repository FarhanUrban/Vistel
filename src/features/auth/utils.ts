import type { RouteLocationRaw } from 'vue-router'

/** After login/signup always prefer Dashboard; the router sends incomplete first-time users into onboarding. */
export function getPostAuthRoute(redirect?: string | null): RouteLocationRaw {
  if (redirect) return redirect
  return { name: 'Dashboard' }
}
