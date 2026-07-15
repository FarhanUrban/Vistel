import { json, requireFirebaseUid, type Env } from '../../_shared/auth'

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { uid } = await requireFirebaseUid(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }

    const deleted = await deletePrefix(context.env.CLIENT_DATA, `users/${uid}/`)
    return json({ ok: true, deleted })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Wipe failed' }, 500)
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  return onRequestPost(context)
}
