import { readFile, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'

const args = process.argv.slice(2)
const test = args.includes('--test')
const outFileName = test ? '.env.test' : '.env'
const jwtSecret = Buffer.from(crypto.getRandomValues(new Uint8Array(64)))
  .toString('base64')

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
    DATABASE_URL: suffixDbUrl,
    LOG_COLORS: () => 'false',
    LOG_DB_QUERIES: () => 'false',
    LOG_DB_INFO: () => 'false',
    OTEL_DENO: () => 'false',
    OTEL_RESOURCE_ATTRIBUTES: () => 'env=test',
    OTEL_SERVICE_NAME: (v) => `${v}_test`,
    PORT: () => '8001',
    REFRESH_COOKIE_OPTIONS: () => '"SameSite=Strict"',
  }),
}

function rewriteLine(line) {
  const m = LINE.exec(line)
  if (!m) return line
  const [, key, value] = m
  const override = overrides[key]
  return override ? `${key}=${override(value)}` : line
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
const confirmed = await rl.question(
  `Please confirm creating a new copy of ${outFileName} [y/N] `,
)
rl.close()

if (/^y(es)?$/i.test(confirmed.trim())) {
  console.log(`Creating new copy of ${outFileName}`)
  const src = await readFile('env/.env.dev', 'utf8')
  const out = src.split(/\r?\n/).map(rewriteLine).join('\n')
  await writeFile(outFileName, out.endsWith('\n') ? out : `${out}\n`)
} else {
  console.log(`Will not create new ${outFileName}`)
}
