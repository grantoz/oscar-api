// logger.ts
// pino-backed structured logger (Node).
//
// `log` is the pino logger instance; use the standard pino call convention:
//   log.info({ field: value }, 'message')
//   log.error({ err }, 'message')
//   log.info('message')

import { pino } from 'pino'
import { getActorId } from './actorContext.ts'

// --- Environment Variables ---
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info'
const JSON_FORMAT = process.env['LOG_FORMAT']?.toUpperCase() === 'JSON'
const LOG_COLORS = process.env['LOG_COLORS'] === 'true'

const PINO_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
]
const LEVEL = PINO_LEVELS.includes(LOG_LEVEL.toLowerCase())
  ? LOG_LEVEL.toLowerCase()
  : 'info'

const REDACT_PATHS = [
  'password',
  'passwordConfirm',
  'confirmPassword',
  '*.password',
  '*.passwordConfirm',
  '*.confirmPassword',
  'token',
  '*.token',
  'authorization',
  '*.authorization',
]

/**
 * pino mixin: attaches the request-scoped actor id (AsyncLocalStorage) to every
 * record. An explicit `actorId` on the record still wins (pino merges the log
 * object over the mixin result).
 */
export const actorMixin = (): Record<string, unknown> => {
  const actorId = getActorId()
  return actorId ? { actorId } : {}
}

export const pinoLogger = pino({
  level: LEVEL,
  mixin: actorMixin,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  ...(JSON_FORMAT
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: LOG_COLORS,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
})

export const log = pinoLogger
