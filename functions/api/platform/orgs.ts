import { json, requirePlatformActor, requireRole, type Env } from '../../_shared/auth'
import { readOrgs, redactOrg, writeOrgs, type StoredOrg } from '../../_shared/orgs'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    const orgs = await readOrgs(context.env)

    if (actor.role === 'admin') {
      // Admins need hashes only for password-reset tooling; still omit in list GET.
      return json({ orgs: orgs.map(redactOrg) })
    }

    if (actor.role === 'agency') {
      const mine = orgs.filter(
        (org) =>
          org.active !== false &&
          (org.id === actor.orgId ||
            (actor.email &&
              (org.primaryMemberEmail?.toLowerCase() === actor.email.toLowerCase() ||
                org.memberEmails?.some(
                  (e) => e.toLowerCase() === actor.email!.toLowerCase(),
                )))),
      )
      return json({ orgs: mine.map(redactOrg) })
    }

    // Applicants do not need org membership details.
    return json({
      orgs: orgs
        .filter((o) => o.active !== false)
        .map((o) => ({
          id: o.id,
          name: o.name,
          orgKind: o.orgKind,
          countries: o.countries,
          active: o.active,
        })),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    requireRole(actor, ['admin'])

    const body = (await context.request.json()) as { orgs?: StoredOrg[] }
    if (!Array.isArray(body.orgs)) {
      return json({ error: 'orgs array is required' }, 400)
    }

    // Preserve invite password hashes if the client omitted them after redacted GET.
    const existing = await readOrgs(context.env)
    const byId = new Map(existing.map((o) => [o.id, o]))
    const merged = body.orgs.map((org) => {
      const prev = byId.get(org.id)
      if (!org.invitePasswordHash && prev?.invitePasswordHash) {
        return { ...org, invitePasswordHash: prev.invitePasswordHash }
      }
      return org
    })

    await writeOrgs(context.env, merged)
    return json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
