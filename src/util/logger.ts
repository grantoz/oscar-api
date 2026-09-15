// logger.ts
// Requires --allow-env permission

import { getActorId } from './actorContext.ts'

// --- Configuration Constants ---
const LOG_LEVELS: { [key: string]: number } = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5,
}

// --- Environment Variables ---
const LOG_LEVEL = Deno.env.get('LOG_LEVEL')?.toUpperCase() ?? 'INFO'
const JSON_FORMAT = Deno.env.get('LOG_FORMAT')?.toUpperCase() === 'JSON'
const OTEL_DENO = Deno.env.get('OTEL_DENO') === 'true'
const LOG_COLORS = !OTEL_DENO && Deno.env.get('LOG_COLORS') === 'true'

// --- Configuration Resolution ---
const MIN_LEVEL = LOG_LEVELS[LOG_LEVEL] ?? LOG_LEVELS.INFO

function levelEnabled(targetLevel: number): boolean {
  return targetLevel >= MIN_LEVEL
}

const isLogObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const withActorId = <T>(args: T[]): T[] => {
  const actorId = getActorId()
  if (!actorId) {
    return args
  }
  return args.map((arg) =>
    isLogObject(arg) && !('actorId' in arg) ? { ...arg, actorId } : arg
  )
}

/**
 * Creates a structured log object, ensuring consistency.
 * @param levelName The string name of the log level (e.g., 'INFO')
 * @param message The primary log message (first argument)
 * @param args Remaining arguments (data objects)
 */
function createLogEntry(levelName: string, message: unknown, args: unknown[]) {
  const timestamp = new Date().toISOString()

  // Base log object
  const logEntry = {
    timestamp: timestamp,
    level: levelName,
    message: String(message),
  }

  // Attach any additional arguments as 'data'
  if (args.length > 0) {
    // You can customize how these extra args are attached, e.g., merging them
    Object.assign(logEntry, { data: args })
  }

  return logEntry
}

const consoleMethods: { [key: string]: typeof console.log } = {
  DEBUG: console.debug,
  INFO: console.log,
  WARN: console.warn,
  ERROR: console.error,
}

const colors: { [key: string]: string } = {
  DEBUG: 'color: gray',
  INFO: 'color: blue',
  WARN: 'color: orange',
  ERROR: 'color: red; font-weight: bold',
}

/**
 * Output function: Decides whether to use text or JSON output.
 * @param levelName The string name of the level.
 * @param message The primary log message.
 * @param args The rest of the arguments.
 */
function output(levelName: string, message: unknown, args: unknown[]) {
  args = withActorId(args)
  const consoleMethod = consoleMethods[levelName] || console.error
  const color = colors[levelName] || 'color: red; font-weight: bold'

  if (JSON_FORMAT) {
    const entry = createLogEntry(levelName, message, args)
    consoleMethod(JSON.stringify(entry))
  } else {
    if (OTEL_DENO) {
      consoleMethod(message, ...args)
    } else if (LOG_COLORS) {
      const prefix = `%c[${levelName}] ${new Date().toLocaleTimeString()} -`
      consoleMethod(prefix, color, message, ...args)
    } else {
      const prefix = `[${levelName}] ${new Date().toLocaleTimeString()} -`
      consoleMethod(prefix, message, ...args)
    }
  }
}

/**
 * The simple structured logger object.
 */
export const log = {
  debug: (message: unknown, ...args: unknown[]) => {
    if (levelEnabled(LOG_LEVELS.DEBUG)) {
      output('DEBUG', message, args)
    }
  },

  info: (message: unknown, ...args: unknown[]) => {
    if (levelEnabled(LOG_LEVELS.INFO)) {
      output('INFO', message, args)
    }
  },

  warn: (message: unknown, ...args: unknown[]) => {
    if (levelEnabled(LOG_LEVELS.WARN)) {
      output('WARN', message, args)
    }
  },

  error: (message: unknown, ...args: unknown[]) => {
    if (levelEnabled(LOG_LEVELS.ERROR)) {
      output('ERROR', message, args)
    }
  },

  // Useful for always logging context (e.g., in a middleware)
  context: (
    level: keyof typeof LOG_LEVELS,
    context: Record<string, unknown>,
  ) => {
    const [resolved] = withActorId([context])
    const levelName = level.toString().toUpperCase()
    const levelNum = LOG_LEVELS[levelName]
    if (levelNum && levelEnabled(levelNum)) {
      if (JSON_FORMAT) {
        // Log the full context object directly as the message
        console.log(
          JSON.stringify({
            ...resolved,
            level: levelName,
            timestamp: new Date().toISOString(),
          }),
        )
      } else {
        console.log(`[${levelName}] CONTEXT:`, resolved)
      }
    }
  },
}
