// logger.ts
// pino-backed structured logger (Node).
//
// `log` is the pino logger instance; use the standard pino call convention:
//   log.info({ field: value }, 'message')
//   log.error({ err }, 'message')
//   log.info('message')
//
// When USE_OTEL=true the records are also forwarded to an OTLP logs collector
// via `pino-opentelemetry-transport` (see `logTransport` / `flushLogs`).

import { pino } from 'pino'
import { getActorId } from './actorContext.ts'

// --- Environment Variables ---
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info'
const JSON_FORMAT = process.env['LOG_FORMAT']?.toUpperCase() === 'JSON'
const LOG_COLORS = process.env['LOG_COLORS'] === 'true'
const USE_OTEL = process.env['USE_OTEL'] === 'true'

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

/**
 * Human-readable output for local development; newline-delimited JSON
 * (`pino/file`) everywhere else. Pretty printing runs in a pino transport
 * worker, so it is only ever used outside of `JSON_FORMAT` (deployed) runs.
 */
const prettyTarget: pino.TransportTargetOptions = {
  target: 'pino-pretty',
  options: {
    colorize: LOG_COLORS,
    translateTime: 'SYS:HH:MM:ss',
    ignore: 'pid,hostname',
  },
}

const stdioTarget: pino.TransportTargetOptions = JSON_FORMAT
  ? { target: 'pino/file', options: { destination: 1 } }
  : prettyTarget

/**
 * OTLP log forwarding runs in a pino transport worker so it stays independent
 * of the main-thread SDK (and works with ESM, unlike
 * `@opentelemetry/instrumentation-pino`, which only patches the CJS require
 * path). The OTLP transport is the only destination, so stdout is added
 * explicitly as a second target to preserve normal console/JSON logging.
 */
export const logTransport = USE_OTEL
  ? pino.transport({
      targets: [
        stdioTarget,
        { target: 'pino-opentelemetry-transport', options: {} },
      ],
    })
  : undefined

export const pinoLogger = pino(
  {
    level: LEVEL,
    mixin: actorMixin,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    // No explicit transport when the OTLP transport already owns the stream; in
    // plain JSON mode pino writes straight to stdout.
    ...(USE_OTEL || JSON_FORMAT ? {} : { transport: prettyTarget }),
  },
  logTransport,
)

export const log = pinoLogger

/**
 * Flush buffered records and, when the OTLP transport is active, wait for the
 * transport worker to shut down (which flushes its OTLP batch processor) so no
 * log records are lost on exit.
 */
export const flushLogs = (): Promise<void> => {
  if (!logTransport) {
    pinoLogger.flush()
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    logTransport.once('close', () => resolve())
    logTransport.end()
  })
}
