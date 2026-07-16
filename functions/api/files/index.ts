import { json, requireFirebaseUid, type Env } from '../../_shared/auth'

function userCanAccessKey(uid: string, key: string): boolean {
  if (key.startsWith(`users/${uid}/`)) return true
  if (key.startsWith('applicants/')) {
    // Applicant ciphertext under country partition; auth uid must match object metadata userId.
    return true
  }
  if (key.startsWith(`agency/`)) return true
  if (key.startsWith('admin/')) return false
  return false
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { uid } = await requireFirebaseUid(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }

    const url = new URL(context.request.url)
    const key = url.searchParams.get('key')?.trim()
    if (!key) {
      return json({ error: 'key is required' }, 400)
    }
    if (!userCanAccessKey(uid, key)) {
      return json({ error: 'Forbidden' }, 403)
    }

    const object = await context.env.CLIENT_DATA.get(key)
    if (!object) {
      return json({ error: 'Not found' }, 404)
    }

    const ownerId = object.customMetadata?.userId
    if (key.startsWith('applicants/') && ownerId && ownerId !== uid) {
      return json({ error: 'Forbidden' }, 403)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('Cache-Control', 'private, max-age=60')

    return new Response(object.body, { headers })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Download failed' }, 500)
  }
}
