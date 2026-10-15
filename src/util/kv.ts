import { createClient } from 'redis'
import { log } from './logger.ts'

// Deno KV is being replaced by Redis (node-redis) as part of the Deno -> Node
// migration. This module keeps the small Deno KV surface used across the app
// (`get`/`set`/`delete`/`close` over array keys) so callers do not change, but
// every key/value now lives in Redis.
const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379'
const keyPrefix = process.env['REDIS_KEY_PREFIX'] || 'oscar'

type KvKeyPart = string | number | bigint | boolean
type KvKey = readonly KvKeyPart[]

const client = createClient({ url: redisUrl })
client.on('error', (err) => log.error('redis client error', { err }))

await client.connect()

// Deno KV keys are arrays compared element-wise. Redis keys are strings, so
// encode the array unambiguously by escaping the separator inside each part.
const escapePart = (part: string) =>
  part.replace(/\\/g, '\\\\').replace(/:/g, '\\:')

const encodeKey = (key: KvKey): string =>
  `${keyPrefix}:${key.map((part) => escapePart(String(part))).join(':')}`

// Redis stores strings, so tag Date/BigInt values explicitly rather than
// relying on the surrounding string shape (which could otherwise revive plain
// fields). We transform the value ourselves because JSON.stringify calls
// Date.prototype.toJSON before any replacer runs.
type Tagged = { __type: 'Date' | 'BigInt'; value: string }

const encode = (value: unknown): unknown => {
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() } satisfies Tagged
  }
  if (typeof value === 'bigint') {
    return { __type: 'BigInt', value: value.toString() } satisfies Tagged
  }
  if (Array.isArray(value)) return value.map(encode)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) out[key] = encode(val)
    return out
  }
  return value
}

const decode = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(decode)
  if (value && typeof value === 'object') {
    const tagged = value as Partial<Tagged>
    if (tagged.__type === 'Date') return new Date(tagged.value as string)
    if (tagged.__type === 'BigInt') return BigInt(tagged.value as string)
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) out[key] = decode(val)
    return out
  }
  return value
}

const serialize = (value: unknown): string => JSON.stringify(encode(value))

const deserialize = <T>(raw: string): T => decode(JSON.parse(raw)) as T

const get = async <T = unknown>(key: KvKey): Promise<{ value: T | null }> => {
  const raw = await client.get(encodeKey(key))
  return { value: raw === null ? null : deserialize<T>(raw) }
}

const set = async (
  key: KvKey,
  value: unknown,
  options?: { expireIn?: number },
): Promise<void> => {
  const encoded = encodeKey(key)
  const payload = serialize(value)
  if (options?.expireIn !== undefined) {
    await client.set(encoded, payload, {
      expiration: {
        type: 'PX',
        value: Math.max(1, Math.round(options.expireIn)),
      },
    })
  } else {
    await client.set(encoded, payload)
  }
}

const del = async (key: KvKey): Promise<void> => {
  await client.del(encodeKey(key))
}

const close = async (): Promise<void> => {
  await client.quit()
}

const kv = { get, set, delete: del, close }

async function getUser(id: string) {
  const res = await kv.get(['users', id])
  return res.value
}

export { getUser, kv }
