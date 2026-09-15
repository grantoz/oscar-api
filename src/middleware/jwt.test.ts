import '@std/dotenv/load'
import { Hono } from '@hono'
import { sign } from '@hono/jwt'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { kv } from '@util'
import { validateJwtMiddleware } from './jwt.ts'

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const issuer = Deno.env.get('JWT_ISSUER') || 'oscar'
const port = parseInt(Deno.env.get('PORT') || '8000')

const makeToken = (sub: string) => {
  return sign(
    {
      sub,
      email: `${sub}@example.com`,
      role: 'user',
      exp: Date.now() + 3600 * 1000,
      iss: issuer,
    },
    jwtSecret,
    jwtAlgo,
  )
}

const protectedApp = () => {
  const app = new Hono<{ Variables: { authUser: unknown } }>()
  app.use(validateJwtMiddleware)
  app.get(
    '/protected',
    (c) => c.json({ ok: true, authUser: c.get('authUser') }),
  )
  return app
}

const setKv = async (
  sub: string,
  { login, refresh }: { login: boolean; refresh: boolean },
) => {
  if (login) await kv.set(['login', port, sub], { id: sub })
  if (refresh) await kv.set(['refresh', port, sub], { id: sub })
}

const clearKv = async (sub: string) => {
  await kv.delete(['login', port, sub])
  await kv.delete(['refresh', port, sub])
}

Deno.test('jwt middleware allows request when login token is in KV', async () => {
  const sub = crypto.randomUUID()
  await setKv(sub, { login: true, refresh: true })
  try {
    const token = await makeToken(sub)
    const res = await protectedApp().request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assertEquals(res.status, 200)
    const body = await res.json() as { ok: boolean; authUser: { id: string } }
    assertEquals(body.ok, true)
    assertEquals(body.authUser.id, sub)
  } finally {
    await clearKv(sub)
  }
})

Deno.test('jwt middleware allows request when login present but refresh missing', async () => {
  const sub = crypto.randomUUID()
  await setKv(sub, { login: true, refresh: false })
  try {
    const token = await makeToken(sub)
    const res = await protectedApp().request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assertEquals(res.status, 200)
    await res.body?.cancel()
  } finally {
    await clearKv(sub)
  }
})

Deno.test('jwt middleware returns token_invalidated when login missing but refresh present', async () => {
  const sub = crypto.randomUUID()
  await clearKv(sub)
  await setKv(sub, { login: false, refresh: true })
  try {
    const token = await makeToken(sub)
    const res = await protectedApp().request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assertEquals(res.status, 401)
    const body = await res.json() as Record<string, string>
    assertEquals(body.error, 'token_invalidated')
    assertEquals(body.refresh_url, '/auth/refresh')
    assertStringIncludes(body.message, 'refresh your token')
    assertStringIncludes(
      res.headers.get('www-authenticate') ?? '',
      'error="invalid_token"',
    )
  } finally {
    await clearKv(sub)
  }
})

Deno.test('jwt middleware returns unauthorized with login_url when both tokens missing', async () => {
  const sub = crypto.randomUUID()
  await clearKv(sub)
  try {
    const token = await makeToken(sub)
    const res = await protectedApp().request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assertEquals(res.status, 401)
    const body = await res.json() as Record<string, string>
    assertEquals(body.error, 'unauthorized')
    assertEquals(body.login_url, '/auth/login')
    assertStringIncludes(body.message, 'Please log in')
    const wwwAuth = res.headers.get('www-authenticate') ?? ''
    assertStringIncludes(wwwAuth, 'realm="api"')
    assertStringIncludes(wwwAuth, '/auth/login')
  } finally {
    await clearKv(sub)
  }
})
