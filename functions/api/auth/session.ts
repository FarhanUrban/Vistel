import {
  authenticateFromHeaders,
  json,
  type Env,
} from '../../_shared/auth'
import {
  createSession,
  readSessionId,
  revokeSession,
  sessionClearCookie,
  sessionSetCookie,
  touchAndResolveSession,
} from '../../_shared/sessions'
import { findOrgByMemberEmail, readOrgs } from '../../_shared/orgs'

/** Create a D1-backed session from a verified Firebase/portal actor. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // Bootstrap from Authorization only (ignore existing cookie).
    const actor = await authenticateFromHeaders(context.request, context.env)
    if (!actor) {
      return json({ error: 'Missing Authorization bearer or portal token' }, 401)
    }
    if (!context.env.DB) {
      return json({ error: 'D1 database is not bound' }, 500)
    }

    // Never trust client-supplied orgId. Resolve membership server-side.
    let orgId: string | undefined
    if (actor.role === 'agency' && actor.email) {
      const orgs = await readOrgs(context.env)
      const org = findOrgByMemberEmail(orgs, actor.email)
      orgId = org?.id
    } else if (actor.orgId && actor.role === 'agency') {
      // Only keep an already-verified actor orgId (e.g. from agency-login header path).
      orgId = actor.orgId
    }

    const { sessionId, expiresAt } = await createSession(context.env, {
      ...actor,
      orgId,
    })
    return new Response(JSON.stringify({ ok: true, expiresAt, orgId: orgId ?? null }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionSetCookie(sessionId),
      },
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Session create failed' }, 500)
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = await touchAndResolveSession(context.request, context.env)
    if (!actor) return json({ authenticated: false }, 401)
    return json({
      authenticated: true,
      uid: actor.uid,
      email: actor.email,
      role: actor.role,
      orgId: actor.orgId,
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Session check failed' }, 500)
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const sessionId = readSessionId(context.request)
    if (sessionId) {
      await revokeSession(context.env, sessionId)
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionClearCookie(),
      },
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Logout failed' }, 500)
  }
}
