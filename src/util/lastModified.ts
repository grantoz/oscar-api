import { kv, log } from '@util'

const port = parseInt(Deno.env.get('PORT') ?? '8000')

const formatLastModified = (date: Date): string => {
  return date.toUTCString()
}

const setLastModified = async (
  entity: string,
  date?: Date,
): Promise<string> => {
  // store the logged-in user in the kv store with an expiry matching the token
  const updatedAt = date ?? new Date()
  const key = ['lastModified', port, entity]
  await kv.set(key, updatedAt)
  const lastModified = formatLastModified(updatedAt)
  log.debug(`new lastModified date for ${entity}: ${lastModified}`)
  return lastModified
}

const getLastModified = async (entity: string): Promise<string> => {
  const key = ['lastModified', port, entity]
  const result = await kv.get<Date>(key)
  if (result.value instanceof Date) {
    log.debug(`typeof lastModified from `, result.value)
    return formatLastModified(result.value)
  }
  return formatLastModified(new Date())
}

export { formatLastModified, getLastModified, setLastModified }
