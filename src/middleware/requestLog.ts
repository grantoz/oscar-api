import { Context } from '@hono'
import { log } from '@/util/logger.ts'

const mutatingMethods = new Set(['POST', 'PATCH'])

export type EntityLogConfig = {
  redact?: readonly string[]
}

export const loggedEntities: Record<string, EntityLogConfig> = {
  user: { redact: ['password', 'passwordConfirm', 'confirmPassword'] },
  post: {},
}

export const entityFromPath = (path: string): string | undefined => {
  const segments = path.split('/').filter(Boolean)
  if (segments[0] === 'api') {
    segments.shift()
  }
  const entity = segments[0]
  if (!entity || !(entity in loggedEntities)) {
    return undefined
  }
  return entity
}

export const redactPayload = (
  payload: Record<string, unknown>,
  fields: readonly string[] | undefined,
): Record<string, unknown> => {
  const out = { ...payload }
  if (!fields?.length) {
    return out
  }
  for (const field of fields) {
    if (field in out) {
      out[field] = '[REDACTED]'
    }
  }
  return out
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const requestLogMiddleware = async (
  c: Context,
  next: () => Promise<void>,
) => {
  const method = c.req.method
  if (!mutatingMethods.has(method)) {
    await next()
    return
  }

  const entity = entityFromPath(c.req.path)
  if (!entity) {
    await next()
    return
  }

  let payload: unknown
  const contentType = c.req.header('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      payload = await c.req.json()
    } catch {
      payload = undefined
    }
  }

  const authUser = c.get('authUser') as { id?: string } | undefined
  const actorId = authUser?.id
  const config = loggedEntities[entity]
  const data = isPlainObject(payload)
    ? { ...redactPayload(payload, config.redact), actorId }
    : { payload, actorId }

  log.info(`${method} ${entity}`, data)
  await next()
}
