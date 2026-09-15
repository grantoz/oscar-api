import { Hono } from '@hono'
import { assertEquals } from '@std/assert'
import { log } from '@/util/logger.ts'
import {
  entityFromPath,
  redactPayload,
  requestLogMiddleware,
} from './requestLog.ts'

Deno.test('entityFromPath maps /api resource paths to allow-listed entities', () => {
  assertEquals(entityFromPath('/api/user'), 'user')
  assertEquals(
    entityFromPath('/api/user/019af282-f8ac-75b9-b193-fd4827821889'),
    'user',
  )
  assertEquals(entityFromPath('/user'), 'user')
  assertEquals(entityFromPath('/api/post'), 'post')
  assertEquals(entityFromPath('/api/post/'), 'post')
})

Deno.test('entityFromPath ignores entities not on the allow-list', () => {
  assertEquals(entityFromPath('/api/country'), undefined)
  assertEquals(entityFromPath('/api/auth/login'), undefined)
  assertEquals(entityFromPath('/'), undefined)
  assertEquals(entityFromPath('/api'), undefined)
})

Deno.test('redactPayload replaces listed fields without mutating the original', () => {
  const payload = {
    email: 'a@b.c',
    password: 'secret',
    passwordConfirm: 'secret',
  }
  const redacted = redactPayload(payload, ['password', 'passwordConfirm'])
  assertEquals(redacted, {
    email: 'a@b.c',
    password: '[REDACTED]',
    passwordConfirm: '[REDACTED]',
  })
  assertEquals(payload.password, 'secret')
  assertEquals(payload.passwordConfirm, 'secret')
})

Deno.test('redactPayload clones payload when there is nothing to redact', () => {
  const payload = { title: 'hello' }
  const redacted = redactPayload(payload, undefined)
  assertEquals(redacted, { title: 'hello' })
  assertEquals(redacted !== payload, true)
})

const withLogSpy = async (fn: (calls: unknown[][]) => Promise<void>) => {
  const calls: unknown[][] = []
  const original = log.info
  log.info = (message: unknown, ...args: unknown[]) => {
    calls.push([message, ...args])
  }
  try {
    await fn(calls)
  } finally {
    log.info = original
  }
}

const logApp = () => {
  const app = new Hono()
  app.use(requestLogMiddleware)
  return app
}

Deno.test('requestLogMiddleware logs POST user with redacted secrets', async () => {
  await withLogSpy(async (calls) => {
    const app = logApp()
    let received: Record<string, unknown> | undefined
    app.post('/api/user', async (c) => {
      received = await c.req.json()
      return c.json({ ok: true })
    })

    const payload = {
      email: 'a@b.c',
      password: 'secret',
      passwordConfirm: 'secret',
      confirmPassword: 'secret',
    }
    const res = await app.request('/api/user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assertEquals(res.status, 200)
    assertEquals(received, payload)
    assertEquals(calls, [
      [
        'POST user',
        {
          email: 'a@b.c',
          password: '[REDACTED]',
          passwordConfirm: '[REDACTED]',
          confirmPassword: '[REDACTED]',
        },
      ],
    ])
  })
})

Deno.test('requestLogMiddleware logs PATCH post payload without redaction', async () => {
  await withLogSpy(async (calls) => {
    const app = logApp()
    app.patch('/api/post', (c) => c.json({ ok: true }))

    const payload = { id: 'post-1', title: 't', content: 'c' }
    await app.request('/api/post', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assertEquals(calls, [
      ['PATCH post', { id: 'post-1', title: 't', content: 'c' }],
    ])
  })
})

Deno.test('requestLogMiddleware does not log GET or allow-listed-excluded entities', async () => {
  await withLogSpy(async (calls) => {
    const app = logApp()
    app.get('/api/user', (c) => c.json({ ok: true }))
    app.post('/api/country', (c) => c.json({ ok: true }))

    await app.request('/api/user')
    await app.request('/api/country', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Australia' }),
    })

    assertEquals(calls, [])
  })
})
