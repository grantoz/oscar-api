import { test } from 'node:test'
import { assertEquals } from '@/util/assert.ts'
import { getActorId, runWithActor } from './actorContext.ts'
import { actorMixin } from './logger.ts'

test('actorContext::getActorId returns undefined outside a runWithActor scope', () => {
  assertEquals(getActorId(), undefined)
})

test('actorContext::runWithActor scopes the actor id', () => {
  assertEquals(getActorId(), undefined)
  runWithActor('actor-1', () => {
    assertEquals(getActorId(), 'actor-1')
  })
  assertEquals(getActorId(), undefined)
})

test('actorContext::runWithActor restores prior actor id when nested', () => {
  runWithActor('outer', () => {
    runWithActor('inner', () => {
      assertEquals(getActorId(), 'inner')
    })
    assertEquals(getActorId(), 'outer')
  })
  assertEquals(getActorId(), undefined)
})

test('logger::actorMixin is empty outside a runWithActor scope', () => {
  assertEquals(actorMixin(), {})
})

test('logger::actorMixin includes the actor id from scope', () => {
  runWithActor('actor-2', () => {
    assertEquals(actorMixin(), { actorId: 'actor-2' })
  })
})

test('logger::actorMixin tracks nested scopes', () => {
  runWithActor('outer', () => {
    runWithActor('inner', () => {
      assertEquals(actorMixin(), { actorId: 'inner' })
    })
    assertEquals(actorMixin(), { actorId: 'outer' })
  })
})
