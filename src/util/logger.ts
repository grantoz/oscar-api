// logger.ts
// Requires --allow-env permission

// --- Configuration Constants ---
const LOG_LEVELS: { [key: string]: number } = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5,
};

// --- Environment Variables ---
const LOG_LEVEL = Deno.env.get("LOG_LEVEL")?.toUpperCase() ?? "INFO";
const JSON_FORMAT = Deno.env.get("LOG_FORMAT")?.toUpperCase() === "JSON";
const LOG_COLORS = true

// --- Configuration Resolution ---
const MIN_LEVEL = LOG_LEVELS[LOG_LEVEL] ?? LOG_LEVELS.INFO;

function levelEnabled(targetLevel: number): boolean {
  return targetLevel >= MIN_LEVEL;
}

/**
 * Creates a structured log object, ensuring consistency.
 * @param levelName The string name of the log level (e.g., 'INFO')
 * @param message The primary log message (first argument)
 * @param args Remaining arguments (data objects)
 */
function createLogEntry(levelName: string, message: unknown, args: unknown[]) {
  const timestamp = new Date().toISOString();

  // Base log object
  const logEntry = {
    timestamp: timestamp,
    level: levelName,
    message: String(message),
  };

  // Attach any additional arguments as 'data'
  if (args.length > 0) {
    // You can customize how these extra args are attached, e.g., merging them
    Object.assign(logEntry, { data: args });
  }

  return logEntry;
}

const consoleMethods: { [key: string]: typeof console.log } = {
  DEBUG: console.debug,
  INFO: console.log,
  WARN: console.warn,
  ERROR: console.error,
};

const colors: { [key: string]: string } = {
  DEBUG: 'color: gray',
  INFO: 'color: blue',
  WARN: 'color: orange',
  ERROR: 'color: red; font-weight: bold',
};

  /**
 * Output function: Decides whether to use text or JSON output.
 * @param levelName The string name of the level.
 * @param message The primary log message.
 * @param args The rest of the arguments.
 */
function output(levelName: string, message: unknown, args: unknown[]) {

  const consoleMethod = consoleMethods[levelName] || console.error;
  const color = colors[levelName] || 'color: red; font-weight: bold';

  if (JSON_FORMAT) {
    const entry = createLogEntry(levelName, message, args);
    consoleMethod(JSON.stringify(entry));
  } else {
    if (LOG_COLORS) {
      const prefix = `%c[${levelName}] ${new Date().toLocaleTimeString()} -`;
      consoleMethod(prefix, color, message, ...args);
    } else {
      const prefix = `[${levelName}] ${new Date().toLocaleTimeString()} -`;
      consoleMethod(prefix, message, ...args);
    }
  }
}

/**
 * The simple structured logger object.
 */
export const log = {
  debug: (message: unknown, ...args: unknown[]) => {
    if (levelEnabled(LOG_LEVELS.DEBUG)) {
      output("DEBUG", message, args);
    }
  },

  info: (message: unknown, ...args: unknown[]) => {
    if (levelEnabled(LOG_LEVELS.INFO)) {
      output("INFO", message, args);
    }
  },

  warn: (message: unknown, ...args: unknown[]) => {
    if (levelEnabled(LOG_LEVELS.WARN)) {
      output("WARN", message, args);
    }
  },

  error: (message: unknown, ...args: unknown[]) => {
    if (levelEnabled(LOG_LEVELS.ERROR)) {
      output("ERROR", message, args);
    }
  },

  // Useful for always logging context (e.g., in a middleware)
  context: (level: keyof typeof LOG_LEVELS, context: Record<string, unknown>) => {
    const levelName = level.toString().toUpperCase()
    const levelNum = LOG_LEVELS[levelName]
    if (levelNum && levelEnabled(levelNum)) {
        if (JSON_FORMAT) {
            // Log the full context object directly as the message
            console.log(JSON.stringify({ ...context, level: levelName, timestamp: new Date().toISOString() }));
        } else {
            console.log(`[${levelName}] CONTEXT:`, context);
        }
    }
  }
};