import { json, requireFirebaseUid, type Env } from '../../_shared/auth'
import { getAgencyBucket, getClientBucket } from '../../_shared/buckets'
import { revokeUserSessions } from '../../_shared/sessions'

const APPS_KEY = 'admin/platform/applications.json'

async function deletePrefix(bucket: R2Bucket, prefix: string): Promise<number> {
  let deleted = 0
  let cursor: string | undefined

  do {
    const listed = await bucket.list({ prefix, cursor, limit: 1000 })
    if (listed.objects.length === 0) break

    await Promise.all(listed.objects.map((obj) => bucket.delete(obj.key)))
    deleted += listed.objects.length
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  return deleted
}

async function deleteApplicantObjectsForUser(bucket: R2Bucket, uid: string): Promise<number> {
  let deleted = 0
  let cursor: string | undefined

  do {
    const listed = await bucket.list({ prefix: 'applicants/', cursor, limit: 1000 })
    for (const obj of listed.objects) {
      const head = await bucket.head(obj.key)
      if (head?.customMetadata?.userId === uid) {
        await bucket.delete(obj.key)
        deleted += 1
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  return deleted
}

async function removeUserApplicationsAndEnvelopes(
  bucket: R2Bucket,
  uid: string,
): Promise<{ appsRemoved: number; envelopesRemoved: number }> {
  const object = await bucket.get(APPS_KEY)
  let appsRemoved = 0
  let envelopesRemoved = 0
  if (!object) return { appsRemoved, envelopesRemoved }

  const data = (await object.json()) as { applications?: Array<Record<string, unknown>> }
  const applications = Array.isArray(data.applications) ? data.applications : []
  const kept: Array<Record<string, unknown>> = []
  const removedIds: string[] = []

  for (const app of applications) {
    if (app.userId === uid && typeof app.id === 'string') {
      removedIds.push(app.id)
      appsRemoved += 1
    } else {
      kept.push(app)
    }
  }

  if (appsRemoved > 0) {
    await bucket.put(APPS_KEY, JSON.stringify({ applications: kept }), {
      httpMetadata: { contentType: 'application/json' },
    })
  }

  for (const id of removedIds) {
    const key = `admin/envelopes/${id}.json`
    const existing = await bucket.head(key)
    if (existing) {
      await bucket.delete(key)
      envelopesRemoved += 1
    }
  }

  return { appsRemoved, envelopesRemoved }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { uid } = await requireFirebaseUid(context.request, context.env)
    const client = getClientBucket(context.env)
    const agency = getAgencyBucket(context.env)

    const deletedUsers = await deletePrefix(client, `users/${uid}/`)
    // Clean both buckets during cutover (applicants may still live on CLIENT_DATA).
    const deletedApplicants =
      (await deleteApplicantObjectsForUser(agency, uid)) +
      (agency !== client ? await deleteApplicantObjectsForUser(client, uid) : 0)
    const { appsRemoved, envelopesRemoved } = await removeUserApplicationsAndEnvelopes(
      agency,
      uid,
    )

    await revokeUserSessions(context.env, uid)

    return json({
      ok: true,
      deleted: deletedUsers + deletedApplicants + appsRemoved + envelopesRemoved,
      deletedUsers,
      deletedApplicants,
      appsRemoved,
      envelopesRemoved,
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Wipe failed' }, 500)
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  return onRequestPost(context)
}
