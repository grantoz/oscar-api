// Minimal `@std/assert`-compatible helpers backed by `node:assert`.
// Keeps the assertion call-sites from the Deno test suite unchanged.
import nodeAssert from 'node:assert/strict'

type Msg = string | Error | undefined

const text = (msg: Msg): string =>
  msg instanceof Error ? msg.message : String(msg ?? '')

const ok = (value: unknown, msg?: Msg): void => {
  if (msg === undefined) nodeAssert.ok(value)
  else nodeAssert.ok(value, text(msg))
}

const fail = (msg?: Msg): never => {
  if (msg === undefined) nodeAssert.fail()
  else nodeAssert.fail(text(msg))
}

const deepEqual = (actual: unknown, expected: unknown, msg?: Msg): void => {
  if (msg === undefined) nodeAssert.deepStrictEqual(actual, expected)
  else nodeAssert.deepStrictEqual(actual, expected, text(msg))
}

export function assert(expression: unknown, msg?: Msg): asserts expression {
  ok(expression, msg)
}

export function assertEquals<T>(actual: T, expected: T, msg?: Msg): void {
  deepEqual(actual, expected, msg)
}

export function assertNotEquals<T>(actual: T, expected: T, msg?: Msg): void {
  if (msg === undefined) nodeAssert.notDeepStrictEqual(actual, expected)
  else nodeAssert.notDeepStrictEqual(actual, expected, text(msg))
}

export function assertExists<T>(
  actual: T,
  msg?: Msg,
): asserts actual is NonNullable<T> {
  ok(actual !== null && actual !== undefined, msg)
}

export function assertGreater<T>(actual: T, expected: T, msg?: Msg): void {
  ok(actual > expected, msg)
}

export function assertStringIncludes(
  actual: string,
  expected: string,
  msg?: Msg,
): void {
  ok(actual.includes(expected), msg)
}

export async function assertRejects(
  fn: () => Promise<unknown>,
  ErrorClass?: new (...args: never[]) => Error,
  msgIncludes?: string,
  msg?: Msg,
): Promise<Error> {
  let thrown: unknown
  try {
    await fn()
  } catch (error) {
    thrown = error
  }
  if (thrown === undefined) {
    fail(msg ?? 'Expected function to reject')
  }
  if (ErrorClass) {
    ok(
      thrown instanceof ErrorClass,
      `Expected rejection to be an instance of ${ErrorClass.name}`,
    )
  }
  if (msgIncludes) {
    ok(
      String((thrown as Error).message).includes(msgIncludes),
      `Expected rejection message to include "${msgIncludes}"`,
    )
  }
  return thrown as Error
}
