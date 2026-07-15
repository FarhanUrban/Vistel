import type { RouteLocationRaw } from 'vue-router'

/** After login/signup always prefer Dashboard; the router sends incomplete first-time users into onboarding. */
export function getPostAuthRoute(redirect?: string | null, role?: string): RouteLocationRaw {
  if (redirect) return redirect
  if (role === 'admin') return { name: 'AdminDashboard' }
  if (role === 'agency') return { name: 'AgencyDashboard' }
  return { name: 'Dashboard' }
}
