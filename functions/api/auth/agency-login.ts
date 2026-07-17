import { json, type Env } from '../../_shared/auth'
import { findOrgByMemberEmail, readOrgs } from '../../_shared/orgs'
import { createSession, sessionSetCookie } from '../../_shared/sessions'

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Server-verified agency login against R2 orgs.json + invite password hash.
 * Creates a D1 session so subsequent platform calls work without Firebase.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as {
      email?: string
      password?: string
    }
    const email = body.email?.trim().toLowerCase()
    const password = body.password ?? ''
    if (!email || !password) {
      return json({ error: 'Email and password are required' }, 400)
    }

    const orgs = await readOrgs(context.env)
    const org = findOrgByMemberEmail(orgs, email)
    if (!org?.invitePasswordHash) {
      return json({ matched: false }, 404)
    }

    const computed = await sha256Hex(password)
    if (computed !== org.invitePasswordHash) {
      return json({ error: 'Incorrect password for this agency account' }, 401)
    }

    const uid = `agency-${org.id}-${email}`
    const { sessionId, expiresAt } = await createSession(context.env, {
      uid,
      email,
      role: 'agency',
      orgId: org.id,
      kind: 'portal',
    })

    return new Response(
      JSON.stringify({
        matched: true,
        expiresAt,
        user: {
          id: uid,
          email,
          displayName: org.name,
          role: 'agency',
          orgId: org.id,
          orgKind: org.orgKind ?? 'travel',
          mustChangePassword: Boolean(org.mustChangePassword),
        },
        org: {
          id: org.id,
          name: org.name,
          orgKind: org.orgKind ?? 'travel',
          mustChangePassword: Boolean(org.mustChangePassword),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': sessionSetCookie(sessionId),
        },
      },
    )
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Agency login failed' }, 500)
  }
}
