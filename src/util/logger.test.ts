import { assertEquals } from '@std/assert'
import { getActorId, runWithActor } from './actorContext.ts'
import { withActorId } from './logger.ts'

Deno.test('actorContext::getActorId returns undefined outside a runWithActor scope', () => {
  assertEquals(getActorId(), undefined)
})

Deno.test('actorContext::runWithActor scopes the actor id', () => {
  assertEquals(getActorId(), undefined)
  runWithActor('actor-1', () => {
    assertEquals(getActorId(), 'actor-1')
  })
  assertEquals(getActorId(), undefined)
})

Deno.test('actorContext::runWithActor restores prior actor id when nested', () => {
  runWithActor('outer', () => {
    runWithActor('inner', () => {
      assertEquals(getActorId(), 'inner')
    })
    assertEquals(getActorId(), 'outer')
  })
  assertEquals(getActorId(), undefined)
})

Deno.test('logger::withActorId adds actorId to object log args', () => {
  const args = runWithActor(
    'actor-2',
    () => withActorId<Record<string, unknown>>([{ email: 'a@b.c' }]),
  )
  assertEquals(args, [{ email: 'a@b.c', actorId: 'actor-2' }])
})

Deno.test('logger::withActorId leaves existing actorId untouched', () => {
  const args = runWithActor(
    'actor-2',
    () =>
      withActorId<Record<string, unknown>>([{ actorId: 'explicit', foo: 1 }]),
  )
  assertEquals(args, [{ actorId: 'explicit', foo: 1 }])
})

Deno.test('logger::withActorId leaves non-object args untouched', () => {
  const args = runWithActor('actor-2', () => withActorId(['str', 42, [1, 2]]))
  assertEquals(args, ['str', 42, [1, 2]])
})

Deno.test('logger::withActorId returns args unchanged with no actor in scope', () => {
  const args = [{ foo: 'bar' }]
  assertEquals(withActorId(args), args)
})
