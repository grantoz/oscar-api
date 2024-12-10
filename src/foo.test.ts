import { assertEquals } from '@std/assert'
import { add } from './foo.ts'

Deno.test(function addTest() {
  const args: [number, number] = [112, 3]
  const expected = 115
  console.log('Running test with args:', args)
  assertEquals(add(...args), expected)
})
