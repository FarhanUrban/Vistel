interface Env {
  CLIENT_DATA: R2Bucket
  AGENCY_LOGINS: R2Bucket
  OLD_CLIENT_DATA: R2Bucket
}

interface StoredApplication {
  id?: string
  submittedAt?: string
  [key: string]: unknown
}

const APPLICATIONS_KEY = 'admin/platform/applications.json'
const ARCHIVE_AGE_MS = 30 * 24 * 60 * 60 * 1000

function archiveKey(key: string): string {
  return `archive/${key}`
}

async function copyAndVerify(
  from: R2Bucket,
  to: R2Bucket,
  key: string,
): Promise<void> {
  const source = await from.get(key)
  if (!source) return
  const destinationKey = archiveKey(key)
  const destination = await to.head(destinationKey)
  if (destination) {
    if (destination.size !== source.size) {
      throw new Error(`Archive size differs for ${key}; refusing to overwrite`)
    }
    if (source.httpEtag && destination.httpEtag && source.httpEtag !== destination.httpEtag) {
      throw new Error(`Archive ETag differs for ${key}; refusing to reuse destination`)
    }
    return
  }
  await to.put(destinationKey, source.body, {
    httpMetadata: source.httpMetadata,
    customMetadata: source.customMetadata,
  })
  const verified = await to.head(destinationKey)
  if (!verified || verified.size !== source.size) {
    throw new Error(`Archive verification failed for ${key}`)
  }
  if (source.httpEtag && verified.httpEtag && source.httpEtag !== verified.httpEtag) {
    throw new Error(`Archive ETag verification failed for ${key}`)
  }
}

async function archiveApplicantFiles(env: Env, applicationId: string): Promise<string[]> {
  const moved: string[] = []
  let cursor: string | undefined
  do {
    const listed = await env.AGENCY_LOGINS.list({ prefix: 'applicants/', cursor, limit: 1000 })
    for (const object of listed.objects) {
      // Applicant keys are applicants/{iso2}/{applicationId}/...
      if (object.key.split('/')[2] !== applicationId) continue
      await copyAndVerify(env.AGENCY_LOGINS, env.OLD_CLIENT_DATA, object.key)
      moved.push(object.key)
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)
  return moved
}

async function putJsonVerified(bucket: R2Bucket, key: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value)
  const size = new TextEncoder().encode(body).byteLength
  const existing = await bucket.head(key)
  if (existing) {
    if (existing.size !== size) throw new Error(`Archive record size differs for ${key}`)
    return
  }
  await bucket.put(key, body, { httpMetadata: { contentType: 'application/json' } })
  const verified = await bucket.head(key)
  if (!verified || verified.size !== size) throw new Error(`Archive verification failed for ${key}`)
}

async function archiveApplications(env: Env): Promise<void> {
  const object = await env.AGENCY_LOGINS.get(APPLICATIONS_KEY)
  if (!object) return
  const data = (await object.json()) as { applications?: StoredApplication[] }
  const applications = Array.isArray(data.applications) ? data.applications : []
  const cutoff = Date.now() - ARCHIVE_AGE_MS
  const eligible = applications.filter((application) => {
    const submittedAt = application.submittedAt ? Date.parse(application.submittedAt) : NaN
    return typeof application.id === 'string' && Number.isFinite(submittedAt) && submittedAt <= cutoff
  })
  if (!eligible.length) return

  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`
  const manifest: {
    runId: string
    createdAt: string
    applications: { id: string; files: string[] }[]
  } = { runId, createdAt: new Date().toISOString(), applications: [] }

  for (const application of eligible) {
    const id = application.id as string
    const files: string[] = []
    const applicationRecordKey = `admin/platform/applications/${id}.json`
    await putJsonVerified(env.OLD_CLIENT_DATA, archiveKey(applicationRecordKey), application)
    files.push(applicationRecordKey)

    const envelopeKey = `admin/envelopes/${id}.json`
    if (await env.AGENCY_LOGINS.head(envelopeKey)) {
      await copyAndVerify(env.AGENCY_LOGINS, env.OLD_CLIENT_DATA, envelopeKey)
      files.push(envelopeKey)
    }
    files.push(...await archiveApplicantFiles(env, id))
    manifest.applications.push({ id, files })
  }

  await putJsonVerified(
    env.OLD_CLIENT_DATA,
    `archive/manifests/${runId}.json`,
    manifest,
  )
  const sourceKeys = manifest.applications.flatMap((entry) =>
    entry.files.filter((key) => key !== `admin/platform/applications/${entry.id}.json`),
  )
  if (sourceKeys.length) await env.AGENCY_LOGINS.delete(sourceKeys)
  const archivedIds = new Set(manifest.applications.map((entry) => entry.id))
  await env.AGENCY_LOGINS.put(
    APPLICATIONS_KEY,
    JSON.stringify({ applications: applications.filter((application) => !archivedIds.has(application.id)) }),
    { httpMetadata: { contentType: 'application/json' } },
  )
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(archiveApplications(env))
  },
}
