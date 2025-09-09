// TODO @std/log is deprecated, use logtape or similar
import * as logger from '@std/log'
const logLevel = Deno.env.get('LOG_LEVEL') as logger.LevelName || 'INFO'
logger.setup({
  handlers: {
    default: new logger.ConsoleHandler(logLevel, {
      formatter: logger.formatters.jsonFormatter,
      useColors: true,
    }),
  },
})

export const log = logger.getLogger();

