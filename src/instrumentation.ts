// instrumentation.ts
// OpenTelemetry bootstrap (Node).
//
// Deno exported telemetry natively when OTEL_DENO was set; on Node the SDK and
// instrumentations must be started explicitly, and started before the CJS
// dependencies they patch (pg, redis, pino) are loaded. That is why this module
// is imported first in src/main.ts. HTTP server spans are not covered by the
// node:http instrumentation (it cannot patch ESM imports, and @hono/node-server
// is ESM), so they come from the @hono/otel middleware registered in main.ts.
//
// Everything else (exporters, endpoints, protocol, service name, resource
// attributes) is configured through the standard OTEL_* environment variables,
// e.g. OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_PROTOCOL,
// OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES, OTEL_METRIC_EXPORT_INTERVAL.
// Set OTEL_TRACES_EXPORTER/OTEL_METRICS_EXPORTER=console for a local smoke test.
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

export const USE_OTEL = process.env['USE_OTEL'] === 'true'

let sdk: NodeSDK | undefined
if (USE_OTEL) {
  sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs spans are extremely noisy and not useful here.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  })
  sdk.start()
}

/**
 * Flush and stop the SDK on shutdown. Safe to call when OTEL is disabled.
 */
const shutdownOtel = async (): Promise<void> => {
  if (!sdk) return
  try {
    await sdk.shutdown()
  } catch (err) {
    console.error('shutdown: failed to stop opentelemetry sdk', err)
  }
}

export { shutdownOtel }
