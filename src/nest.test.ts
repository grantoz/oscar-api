import { assertEquals } from '@std/assert'
// import { add, testArgon2 } from './foo.ts'

Deno.test("testing nesting", function() {
  console.log('test 1')
  // deno test runner does not run these tests
  Deno.test("nested test 1", function() {
    console.log('test 2')
    assertEquals(true, true)
  })
  Deno.test("nested test 2", function() {
    console.log('test 3')
    assertEquals(true, true)
  })
  assertEquals(true, true)
})
