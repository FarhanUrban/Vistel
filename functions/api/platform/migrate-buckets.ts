import { json, requirePlatformActor, requireRole, type Env } from '../../_shared/auth'

const PREFIXES = ['applicants/', 'admin/']

function copyOptions(source: R2ObjectBody): R2PutOptions {
  return {
    httpMetadata: source.httpMetadata,
    customMetadata: source.customMetadata,
  }
}

async function migrateObject(
  sourceBucket: R2Bucket,
  destinationBucket: R2Bucket,
  key: string,
): Promise<'copied' | 'skipped'> {
  const source = await sourceBucket.get(key)
  if (!source) return 'skipped'
  const destination = await destinationBucket.head(key)
  if (destination) {
    if (destination.size !== source.size) {
      throw new Error(`Destination size differs for ${key}; refusing to overwrite`)
    }
    // ETags are preserved by the normal R2 single-part copy path. If either side
    // does not expose one, size is still sufficient for a resumable migration.
    if (source.httpEtag && destination.httpEtag && source.httpEtag !== destination.httpEtag) {
      throw new Error(`Destination ETag differs for ${key}; refusing to delete source`)
    }
    await sourceBucket.delete(key)
    return 'skipped'
  }

  await destinationBucket.put(key, source.body, copyOptions(source))
  const verified = await destinationBucket.head(key)
  if (!verified || verified.size !== source.size) {
    throw new Error(`Copy verification failed for ${key}`)
  }
  if (source.httpEtag && verified.httpEtag && source.httpEtag !== verified.httpEtag) {
    throw new Error(`Copy ETag verification failed for ${key}`)
  }
  await sourceBucket.delete(key)
  return 'copied'
}

/** Moves agency data to AGENCY_LOGINS. User-owned `users/` keys are never listed. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const suppliedSecret = context.request.headers.get('X-Migrate-Secret')
    const secretAuthorized = Boolean(
      context.env.MIGRATE_SECRET && suppliedSecret === context.env.MIGRATE_SECRET,
    )
    if (!secretAuthorized) {
      const actor = await requirePlatformActor(context.request, context.env)
      requireRole(actor, ['admin'])
    }
    if (!context.env.AGENCY_LOGINS) {
      return json({ error: 'R2 bucket AGENCY_LOGINS is not bound' }, 500)
    }

    let copied = 0
    let skipped = 0
    for (const prefix of PREFIXES) {
      let cursor: string | undefined
      do {
        const listed = await context.env.CLIENT_DATA.list({ prefix, cursor, limit: 1000 })
        for (const object of listed.objects) {
          const result = await migrateObject(context.env.CLIENT_DATA, context.env.AGENCY_LOGINS, object.key)
          if (result === 'copied') copied += 1
          else skipped += 1
        }
        cursor = listed.truncated ? listed.cursor : undefined
      } while (cursor)
    }
    return json({ ok: true, copied, skipped })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Migration failed' }, 500)
  }
}
