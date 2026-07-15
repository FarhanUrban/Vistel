import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { useOnboardingStore } from '@/features/onboarding/store'
import { useMockServices } from '@/services/config'
import * as visaService from '@/services/visaService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Landing',
      component: () => import('@/views/LandingView.vue'),
      meta: { title: 'Vislet - Simplified Visa Applications' },
    },
    {
      path: '/welcome',
      name: 'Welcome',
      component: () => import('@/views/WelcomeView.vue'),
      meta: { title: 'Welcome' },
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Log In' },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('@/views/SignupView.vue'),
      meta: { title: 'Sign Up' },
    },
    {
      path: '/onboarding/visa-type',
      name: 'OnboardingVisaType',
      component: () => import('@/views/VisaTypeView.vue'),
      meta: { title: 'Visa Type' },
    },
    {
      path: '/onboarding/passport-type',
      name: 'OnboardingPassportType',
      component: () => import('@/views/PassportTypeView.vue'),
      meta: { title: 'Passport Type' },
    },
    {
      path: '/onboarding/additional-docs',
      redirect: { name: 'OnboardingPassportCountry' },
    },
    {
      path: '/onboarding/passport-country',
      name: 'OnboardingPassportCountry',
      component: () => import('@/views/PassportCountryView.vue'),
      meta: { title: 'Passport Country' },
    },
    {
      path: '/onboarding/destination',
      name: 'OnboardingDestination',
      component: () => import('@/views/DestinationView.vue'),
      meta: { title: 'Destination' },
    },
    {
      path: '/documents/scan',
      redirect: { name: 'RequiredDocuments' },
    },
    {
      path: '/documents/required-list',
      name: 'RequiredDocuments',
      component: () => import('@/views/RequiredListView.vue'),
      meta: { title: 'Required Documents', requiresAuth: true },
    },
    {
      path: '/documents/confirmation',
      name: 'DocumentConfirmation',
      component: () => import('@/views/DocumentConfirmationView.vue'),
      meta: { title: 'Application Submitted', requiresAuth: true },
    },
    {
      path: '/payment',
      name: 'Payment',
      component: () => import('@/views/PaymentView.vue'),
      meta: { title: 'Payment' },
    },
    {
      path: '/payment/success',
      name: 'PaymentSuccess',
      component: () => import('@/views/PaymentSuccessView.vue'),
      meta: { title: 'Payment Successful' },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { title: 'Dashboard' },
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('@/views/AboutView.vue'),
      meta: { title: 'About Us' },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { title: 'Profile', requiresAuth: true },
    },
    {
      path: '/rejections/possible-reasons',
      name: 'PossibleRejectionReasons',
      component: () => import('@/views/PossibleRejectionReasonsView.vue'),
      meta: { title: 'Possible Rejection Reasons' },
    },
    {
      path: '/rejections/why-rejected',
      name: 'WhyRejected',
      component: () => import('@/views/WhyRejectedView.vue'),
      meta: { title: 'Why You Were Rejected' },
    },
    {
      path: '/rejections/waiting',
      name: 'WaitingForCheck',
      component: () => import('@/views/WaitingForCheckView.vue'),
      meta: { title: 'Waiting for E-Visa Check' },
    },
    {
      path: '/agency',
      name: 'AgencyLanding',
      component: () => import('@/views/AgencyLandingView.vue'),
      meta: { title: 'Vislet for Agencies' },
    },
    {
      path: '/agency/dashboard',
      name: 'AgencyDashboard',
      component: () => import('@/views/AgencyDashboardView.vue'),
      meta: { title: 'Agency Dashboard', requiresAuth: true, requiresAgency: true },
    },
    {
      path: '/admin',
      name: 'AdminDashboard',
      component: () => import('@/views/AdminDashboardView.vue'),
      meta: { title: 'System Admin Console', requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.hydrated) {
    authStore.hydratePortalSessionSync()
  }
  if (!authStore.user && !authStore.hydrated) {
    await authStore.loadCurrentUser()
  }

  const authScreenNames = new Set(['Welcome', 'Login', 'Signup'])
  if (authStore.user && authScreenNames.has(String(to.name))) {
    if (authStore.user.role === 'admin') {
      return { name: 'AdminDashboard' }
    }
    if (authStore.user.role === 'agency') {
      return { name: 'AgencyDashboard' }
    }
    return { name: 'Dashboard' }
  }

  if (to.meta.requiresAdmin) {
    if (!authStore.user || authStore.user.role !== 'admin') {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.requiresAgency) {
    if (!authStore.user || authStore.user.role !== 'agency') {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }
  }

  if (!to.meta.requiresAuth || useMockServices()) {
    if (!useMockServices() && to.name === 'Dashboard') {
      if (authStore.user) {
        const onboarding = useOnboardingStore()
        if (!onboarding.isComplete()) {
          const apps = await visaService.getApplications(authStore.user.id)
          if (apps.length === 0) {
            return { name: 'OnboardingVisaType' }
          }
        }
      }
    }
    return true
  }

  if (!authStore.user) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
