import { encodeBase64 } from '@std/encoding/base64'

const test = Deno.args.includes('--test')
const outFileName = test ? '.env.test' : '.env'
const jwtSecret = encodeBase64(crypto.getRandomValues(new Uint8Array(64)))

const LINE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/

function suffixDbUrl(value) {
  const q = value.indexOf('?')
  return q === -1
    ? `${value}_test`
    : `${value.slice(0, q)}_test${value.slice(q)}`
}

const overrides = {
  JWT_SECRET: () => jwtSecret,
  ...(test && {
    APP_ENV: () => 'test',
    PORT: () => '8001',
    LOG_COLORS: () => 'false',
    LOG_DB_QUERY: () => 'false',
    LOG_DB_INFO: () => 'false',
    REFRESH_COOKIE_OPTIONS: () => '"SameSite=Strict"',
    DB_DB: (v) => `${v}_test`,
    DB_URL: suffixDbUrl,
  }),
}

function rewriteLine(line) {
  const m = LINE.exec(line)
  if (!m) return line
  const [, key, value] = m
  const override = overrides[key]
  return override ? `${key}=${override(value)}` : line
}

if (confirm(`Please confirm creating a new copy of ${outFileName}`)) {
  console.log(`Creating new copy of ${outFileName}`)
  const src = await Deno.readTextFile('env/.env.dev')
  const out = src.split(/\r?\n/).map(rewriteLine).join('\n')
  await Deno.writeTextFile(outFileName, out.endsWith('\n') ? out : `${out}\n`)
} else {
  console.log(`Will not create new ${outFileName}`)
}
