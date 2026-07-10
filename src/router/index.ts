import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/welcome',
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
      name: 'OnboardingAdditionalDocs',
      component: () => import('@/views/AdditionalDocsView.vue'),
      meta: { title: 'Additional Documents' },
    },
    {
      path: '/onboarding/destination',
      name: 'OnboardingDestination',
      component: () => import('@/views/DestinationView.vue'),
      meta: { title: 'Destination' },
    },
    {
      path: '/documents/scan',
      name: 'DocumentScan',
      component: () => import('@/views/DocumentScanView.vue'),
      meta: { title: 'Scan Documents' },
    },
    {
      path: '/documents/required-list',
      name: 'RequiredDocuments',
      component: () => import('@/views/RequiredListView.vue'),
      meta: { title: 'Required Documents' },
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
  ],
})

export default router
