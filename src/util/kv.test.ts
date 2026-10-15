import { test } from 'node:test'
import { assertEquals } from '@/util/assert.ts'
import { kv } from './kv.ts'

const suffix = crypto.randomUUID()

test('kv adapter: object roundtrip', async () => {
  const key = ['verify', 8000, suffix]
  await kv.set(key, { id: suffix, nested: { ok: true } })
  const res = await kv.get<{ id: string; nested: { ok: boolean } }>(key)
  assertEquals(res.value?.id, suffix)
  assertEquals(res.value?.nested.ok, true)
  await kv.delete(key)
})

test('kv adapter: missing key returns null', async () => {
  const res = await kv.get(['verify', 8000, 'does-not-exist'])
  assertEquals(res.value, null)
})

test('kv adapter: delete removes value', async () => {
  const key = ['verify', 8000, suffix]
  await kv.set(key, { id: suffix })
  await kv.delete(key)
  const res = await kv.get(key)
  assertEquals(res.value, null)
})

test('kv adapter: Date values survive roundtrip', async () => {
  const key = ['verify', 8000, suffix]
  const now = new Date()
  await kv.set(key, { nested: { at: now }, plain: 'not-a-date' })
  const res = await kv.get<{ nested: { at: Date }; plain: string }>(key)
  assertEquals(res.value?.nested.at instanceof Date, true)
  assertEquals(res.value?.nested.at.toISOString(), now.toISOString())
  assertEquals(res.value?.plain, 'not-a-date')
  await kv.delete(key)
})

test('kv adapter: BigInt values survive roundtrip', async () => {
  const key = ['verify', 8000, suffix]
  await kv.set(key, { n: 42n })
  const res = await kv.get<{ n: bigint }>(key)
  assertEquals(typeof res.value?.n, 'bigint')
  assertEquals(res.value?.n, 42n)
  await kv.delete(key)
})

test('kv adapter: expireIn sets a TTL', async () => {
  const key = ['verify', 8000, suffix]
  await kv.set(key, { id: suffix }, { expireIn: 300 })
  const present = await kv.get(key)
  assertEquals(present.value !== null, true)
  await new Promise((r) => setTimeout(r, 600))
  const gone = await kv.get(key)
  assertEquals(gone.value, null)
})

test('kv adapter: array keys are distinct', async () => {
  const a = ['verify', 8000, suffix, 'a']
  const b = ['verify', 8000, suffix, 'b']
  await kv.set(a, { v: 1 })
  await kv.set(b, { v: 2 })
  assertEquals((await kv.get<{ v: number }>(a)).value?.v, 1)
  assertEquals((await kv.get<{ v: number }>(b)).value?.v, 2)
  await kv.delete(a)
  await kv.delete(b)
})
