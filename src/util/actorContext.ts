import { AsyncLocalStorage } from 'node:async_hooks'

const actorStorage = new AsyncLocalStorage<string>()

const runWithActor = <T>(actorId: string, fn: () => T): T =>
  actorStorage.run(actorId, fn)

const getActorId = (): string | undefined => actorStorage.getStore()

export { actorStorage, getActorId, runWithActor }
