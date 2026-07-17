import {
  json,
  requirePlatformActor,
  type Env,
  type PlatformActor,
} from '../../_shared/auth'
import { getAgencyBucket } from '../../_shared/buckets'
import {
  appendNotification,
  readApplications,
  upsertApplication,
  type StoredApplication,
} from '../../_shared/applications'

interface DecisionBody {
  applicationId?: string
  orgId?: string
  decision?: 'approve' | 'reject'
  acceptanceNote?: string
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
}

async function actorOrgIds(env: Env, actor: PlatformActor): Promise<string[]> {
  if (actor.orgId) return [actor.orgId]
  if (!actor.email) return []
  const bucket = getAgencyBucket(env)
  const object = await bucket.get('admin/platform/orgs.json')
  if (!object) return []
  const data = (await object.json()) as {
    orgs?: Array<{
      id?: string
      memberEmails?: string[]
      primaryMemberEmail?: string
      active?: boolean
    }>
  }
  const email = actor.email.trim().toLowerCase()
  return (data.orgs ?? [])
    .filter((org) => {
      if (!org.id || org.active === false) return false
      const members = (org.memberEmails ?? []).map((e) => e.toLowerCase())
      const primary = org.primaryMemberEmail?.toLowerCase()
      return members.includes(email) || primary === email
    })
    .map((org) => org.id as string)
}

/** Agency decision: approve (optional note) or reject (required reason). */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    if (actor.role === 'admin') {
      return json({ error: 'Admins cannot review applications' }, 403)
    }

    const body = (await context.request.json()) as DecisionBody
    const applicationId = body.applicationId?.trim()
    const orgId = body.orgId?.trim()
    const decision = body.decision
    if (!applicationId || !orgId || (decision !== 'approve' && decision !== 'reject')) {
      return json({ error: 'applicationId, orgId, and decision are required' }, 400)
    }

    const allowedOrgs = await actorOrgIds(context.env, actor)
    const isAgencyRole = actor.role === 'agency'
    const isMemberOfOrg = allowedOrgs.includes(orgId) || actor.orgId === orgId
    if (!isAgencyRole && !isMemberOfOrg) {
      return json({ error: 'Forbidden: not an agency reviewer for this organization' }, 403)
    }
    if (allowedOrgs.length > 0 && !allowedOrgs.includes(orgId) && actor.orgId !== orgId) {
      // Portal demo agency tokens may not be listed on an org; allow role=agency only then.
      if (!isAgencyRole) {
        return json({ error: 'Forbidden: application org is outside your membership' }, 403)
      }
    }

    const apps = await readApplications(context.env)
    const existing = apps.find((a) => a.id === applicationId)
    if (!existing) return json({ error: 'Application not found' }, 404)
    if (existing.orgId && existing.orgId !== orgId) {
      return json({ error: 'Application is assigned to a different agency' }, 403)
    }
    if (existing.status !== 'submitted' && existing.status !== 'reviewing') {
      return json({ error: 'Application is not pending review' }, 400)
    }

    const acceptanceNote = body.acceptanceNote?.trim() || undefined
    const rejectionCode = body.rejectionCode?.trim() || undefined
    const rejectionOther = body.rejectionOther?.trim() || undefined
    const rejectionDetails = body.rejectionDetails?.trim() || undefined

    if (decision === 'reject') {
      if (!rejectionCode && !rejectionOther) {
        return json({ error: 'Rejection requires a code or custom reason' }, 400)
      }
      if (rejectionCode === 'OTHER' && !rejectionOther) {
        return json({ error: 'Custom reason is required when rejection code is OTHER' }, 400)
      }
    }

    const updated: StoredApplication = {
      ...existing,
      orgId,
      reviewedAt: new Date().toISOString(),
      reviewedByUid: actor.uid,
      status: decision === 'approve' ? 'awaiting_payment' : 'rejected',
      acceptanceNote: decision === 'approve' ? acceptanceNote : undefined,
      rejectionCode: decision === 'reject' ? rejectionCode || 'OTHER' : undefined,
      rejectionOther: decision === 'reject' ? rejectionOther : undefined,
      rejectionDetails: decision === 'reject' ? rejectionDetails : undefined,
    }

    await upsertApplication(context.env, updated)

    const message =
      decision === 'approve'
        ? acceptanceNote
          ? `Your visa application was approved. Note from reviewer: ${acceptanceNote}`
          : 'Your visa application was approved. Proceed to payment when ready.'
        : 'Your visa application was not approved. See details in your dashboard.'

    await appendNotification(context.env, {
      id: `notif-${crypto.randomUUID()}`,
      userId: existing.userId,
      type: 'decision',
      applicationId,
      status: updated.status,
      rejectionCode: updated.rejectionCode,
      rejectionOther: updated.rejectionOther,
      rejectionDetails: updated.rejectionDetails,
      acceptanceNote: updated.acceptanceNote,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    })

    return json({ ok: true, application: updated })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Decision failed' }, 500)
  }
}
