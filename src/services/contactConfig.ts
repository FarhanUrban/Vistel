/** Centralized public contact for Vislet / Urban Arts. */
export const SUPPORT_EMAIL = 'amoreno@urbanarts.org'
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`
export const SUPPORT_GMAIL_COMPOSE = (to: string, subject?: string, body?: string): string => {
  const params = new URLSearchParams()
  params.set('view', 'cm')
  params.set('fs', '1')
  params.set('to', to)
  if (subject) params.set('su', subject)
  if (body) params.set('body', body)
  return `https://mail.google.com/mail/?${params.toString()}`
}
