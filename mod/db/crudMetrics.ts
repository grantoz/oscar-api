import { Prisma } from '../../prisma/generated/client.ts'
import type { PrismaClient } from '../../prisma/generated/client.ts'
import { metrics } from '@opentelemetry/api'

const serviceName = Deno.env.get('OTEL_SERVICE_NAME') || 'app'

const meter = metrics.getMeter(serviceName, '1.0.0')

const dbQueriesCounter = meter.createCounter('db_queries_total', {
  description: 'Total number of DB queries',
})

const dbQueryDuration = meter.createHistogram('db_query_duration_seconds', {
  description: 'Duration of DB queries in seconds',
  unit: 's',
  advice: {
    explicitBucketBoundaries: [
      0.001,
      0.0025,
      0.005,
      0.01,
      0.025,
      0.05,
      0.1,
      0.25,
      0.5,
      1,
      2.5,
      5,
    ],
  },
})

const ACTION_TO_CRUD: Record<string, string> = {
  create: 'CREATE',
  createMany: 'CREATE',
  findUnique: 'READ',
  findUniqueOrThrow: 'READ',
  findMany: 'READ',
  findFirst: 'READ',
  findFirstOrThrow: 'READ',
  count: 'READ',
  aggregate: 'READ',
  groupBy: 'READ',
  update: 'UPDATE',
  updateMany: 'UPDATE',
  upsert: 'UPDATE',
  delete: 'DELETE',
  deleteMany: 'DELETE',
}

const actionToCrud = (action: string): string =>
  ACTION_TO_CRUD[action] ?? 'UNKNOWN'

const crudMetricsExtension = Prisma.defineExtension({
  name: 'crudMetrics',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const crudOp = actionToCrud(operation)
        const attributes: Record<string, string> = {
          model,
          operation: crudOp,
        }
        const startTime = performance.now()

        try {
          return await query(args)
        } catch (error) {
          attributes['error.type'] = error instanceof Error
            ? error.name
            : typeof error
          throw error
        } finally {
          const duration = performance.now() - startTime
          dbQueriesCounter.add(1, attributes)
          dbQueryDuration.record(duration / 1000, attributes)
        }
      },
    },
  },
})

const withCrudMetrics = (client: PrismaClient): PrismaClient =>
  client.$extends(crudMetricsExtension) as PrismaClient

export { withCrudMetrics }
