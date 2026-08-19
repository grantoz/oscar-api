import { kv, log } from '@util'

const port = parseInt(Deno.env.get('PORT') ?? '8000')

// todo move these to util/locale
const locale = new Intl.Locale('UTC', { hourCycle: 'h23' })
const lastModified = new Intl.DateTimeFormat(locale, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  weekday: 'short',
  // hour: '2-digit', // seems to not work for h23 hourCycle now that TZ is set, alas!
  // minute: '2-digit',
  // second: '2-digit',
  // timeZoneName: 'short',
  // timeZone: 'GMT'
});

// const formatLastModified = (date: Temporal.Instant) => {
const formatLastModified = (date: Date): string => {
  const fmtDat = lastModified.format(date) // e.g. "Sat, 06 Dec 2025"
  const time = date.toISOString().substring(11, 19) // as we can't reliable 24 hour formatting, it seems
  const ret = `${fmtDat} ${time} GMT`
  return ret
}

const setLastModified = async (entity: string, date?: Date): Promise<string> => {
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
    log.debug(`typeof lastModified from `, result.value);
    return formatLastModified(result.value)
  }
  return formatLastModified(new Date())
}

export { setLastModified, getLastModified, formatLastModified }