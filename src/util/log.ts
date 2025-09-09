import { configure, getConsoleSink, getLogger, jsonLinesFormatter } from "@logtape/logtape";
import { type LogLevel } from "@logtape/logtape";

const logLevel = (Deno.env.get('LOG_LEVEL') as LogLevel) || 'info'

await configure({
  sinks: { console: getConsoleSink({
      formatter: jsonLinesFormatter
    })
  },
  loggers: [
    // { category: "oscar", lowestLevel: logLevel, sinks: ["console"] }
    { category: [], lowestLevel: logLevel, sinks: ["console"] }
  ]
});

// export const log = getLogger(["oscar", "my-module"]);
export const log = getLogger(["oscar"]);
