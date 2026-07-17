import { json, requirePlatformActor, type Env } from '../../_shared/auth'
import {
  readNotifications,
  writeNotifications,
  type StoredNotification,
} from '../../_shared/applications'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    const all = await readNotifications(context.env)
    if (actor.role === 'admin') {
      return json({ notifications: all })
    }
    return json({
      notifications: all.filter((n) => n.userId === actor.uid),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    const body = (await context.request.json()) as { notifications?: StoredNotification[] }
    if (!Array.isArray(body.notifications)) {
      return json({ error: 'notifications array is required' }, 400)
    }

    const existing = await readNotifications(context.env)
    // Applicants may only update their own notification read state / list.
    if (actor.role !== 'admin' && actor.role !== 'agency') {
      const others = existing.filter((n) => n.userId !== actor.uid)
      const mine = body.notifications.filter((n) => n.userId === actor.uid)
      await writeNotifications(context.env, [...mine, ...others].slice(0, 500))
      return json({ ok: true })
    }

    await writeNotifications(context.env, body.notifications.slice(0, 500))
    return json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Save failed' }, 500)
  }
}
