import { formatLastModified, getLastModified, setLastModified } from './lastModified.ts'
import { assertEquals } from '@std/assert'
import process from "node:process"

process.env.TZ = Deno.env.get("TZ")

Deno.test("lastModified::formatLastModified", function() {
  const d = new Date('2025-12-07 09:01:02');
  // const d = Temporal.ZonedDateTime.from('2025-12-07 T 15:01:02.000000000 Z')
  const s = formatLastModified(d)
  assertEquals(s, 'Sun, 07 Dec 2025 09:01:02 GMT')
})

Deno.test("lastModified::setLastModified with no date arg returns string and can be found", async function() {
  const s = await setLastModified('test-entity')
  const d = new Date(s)
  assertEquals(formatLastModified(d), s)
})

Deno.test("lastModified::setLastModified with date arg", async function() {
  const d = new Date('2025-12-07 09:01:02');
  const s = await setLastModified('test-entity', d)
  assertEquals(s, 'Sun, 07 Dec 2025 09:01:02 GMT')
})

Deno.test("lastModified::getLastModified returns same date as set with setLastModified", async function() {
  const s = await setLastModified('test-entity')
  const g = await getLastModified('test-entity')
  assertEquals(s, g)
})
