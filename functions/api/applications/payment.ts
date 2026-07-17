import { json, requirePlatformActor, type Env } from '../../_shared/auth'
import { readApplications, upsertApplication } from '../../_shared/applications'

interface PaymentBody {
  applicationId?: string
  status?: 'awaiting_payment' | 'payment_processing' | 'completed'
  paidAt?: string
  expiresAt?: string
}

/** Updates the payment lifecycle for the signed-in applicant's own application. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    if (actor.role === 'admin' || actor.role === 'agency') {
      return json({ error: 'Only applicants can pay for applications' }, 403)
    }

    const body = (await context.request.json()) as PaymentBody
    if (!body.applicationId || !body.status) {
      return json({ error: 'applicationId and status are required' }, 400)
    }

    const applications = await readApplications(context.env)
    const existing = applications.find((app) => app.id === body.applicationId)
    if (!existing || existing.userId !== actor.uid) {
      return json({ error: 'Application not found' }, 404)
    }

    const current = existing.status
    const next = body.status
    const allowed =
      (next === 'payment_processing' && current === 'awaiting_payment') ||
      (next === 'awaiting_payment' && current === 'payment_processing') ||
      (next === 'completed' && (current === 'awaiting_payment' || current === 'payment_processing'))
    if (!allowed) {
      return json({ error: 'This application is not ready for payment' }, 400)
    }

    const application = {
      ...existing,
      status: next,
      ...(next === 'completed'
        ? { paidAt: body.paidAt || new Date().toISOString(), expiresAt: body.expiresAt }
        : {}),
    }
    await upsertApplication(context.env, application)
    return json({ ok: true, application })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Payment update failed' }, 500)
  }
}
