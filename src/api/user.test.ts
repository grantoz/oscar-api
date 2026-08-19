// import { load } from "@std/dotenv";
import "@std/dotenv/load";
import { assert, assertEquals, assertExists } from '@std/assert'
import { describe, it, before } from 'node:test'
import { KyInstance } from 'ky'
import { asSuper, asAdmin, logHeaders, testUsers, type TestUser } from '../util/test.ts';

interface loginOutput {
  token: string
}

interface ApiEnvelope<T> {
  data: T
  meta?: unknown
}

let superApi: KyInstance
let _adminApi: KyInstance
let superUser: TestUser
let _adminUser: TestUser

const isUserView = (value: unknown) => {
  assert(typeof value === 'object' && value !== null)
  const u = value as Record<string, unknown>
  assert(typeof u.id === 'string')
  assert(typeof u.email === 'string')
  assert(typeof u.props === 'object' && u.props !== null)
  assert(u.hash === undefined)
  assert(u.salt === undefined)
}

describe("BDD-style tests", () => {
  before(async () => {
    superApi = await asSuper();
    _adminApi = await asAdmin();
    ({ superUser, adminUser: _adminUser } = testUsers)
  })

  it("should return 400 for get requests with non-uuid :id path parameter", async () => {
    await superApi.get('user/xxxxxxx', {
      throwHttpErrors: false
    }).then(async (resp) => {
      const text = await resp.text()
      console.log('raw error output:', text)
      assertEquals(400, resp.status)
      logHeaders(resp)
    })
  })

  it("GET /user should return 200 with an array of userView instances", async () => {
    const resp = await superApi.get('user', {
      throwHttpErrors: false
    })
    const output = await resp.json() as ApiEnvelope<unknown[]>
    console.log(output)
    assertEquals(200, resp.status)
    assert(Array.isArray(output.data))
    output.data.forEach(isUserView)
    logHeaders(resp)
  })

  it("GET /user/:id should return 200 and a matching userView instance", async () => {
    console.log('superId', superUser.id)
    const resp = await superApi.get(`user/${superUser.id}`, {
      throwHttpErrors: false
    })
    const output = await resp.json() as ApiEnvelope<Record<string, unknown>>
    console.log(output)
    assertEquals(200, resp.status)
    isUserView(output.data)
    assertEquals(output.data.id, superUser.id)
    assertEquals(output.data.email, superUser.email)
  })

  it("PATCH /user/:id should update unstructured props and return the updated user", async () => {
    const email = `patch-props-${crypto.randomUUID()}@example.com`
    const createResp = await superApi.post('user', {
      json: { email },
      throwHttpErrors: false,
    })
    assertEquals(createResp.status, 200)
    const created = await createResp.json() as ApiEnvelope<Record<string, unknown>>
    const id = created.data.id as string

    const props = { foo: 'bar', count: 42, nested: { arr: [1, 2, 3] } }
    const patchResp = await superApi.patch(`user/${id}`, {
      json: { props },
      throwHttpErrors: false,
    })
    assertEquals(patchResp.status, 200)
    const patched = await patchResp.json() as ApiEnvelope<Record<string, unknown>>
    assertEquals(patched.data.props, props)

    const getResp = await superApi.get(`user/${id}`, { throwHttpErrors: false })
    const fetched = await getResp.json() as ApiEnvelope<Record<string, unknown>>
    assertEquals(fetched.data.props, props)
  })

  it("PATCH /user/:id without props should preserve existing props", async () => {
    const email = `patch-preserve-${crypto.randomUUID()}@example.com`
    const props = { preserve: true }
    const createResp = await superApi.post('user', {
      json: { email },
      throwHttpErrors: false,
    })
    assertEquals(createResp.status, 200)
    const created = await createResp.json() as ApiEnvelope<Record<string, unknown>>
    const id = created.data.id as string

    const propsResp = await superApi.patch(`user/${id}`, {
      json: { props },
      throwHttpErrors: false,
    })
    assertEquals(propsResp.status, 200)

    const patchResp = await superApi.patch(`user/${id}`, {
      json: { name: 'Updated Name' },
      throwHttpErrors: false,
    })
    assertEquals(patchResp.status, 200)
    const patched = await patchResp.json() as ApiEnvelope<Record<string, unknown>>
    assertEquals(patched.data.name, 'Updated Name')
    assertEquals(patched.data.props, props)
  })

  it("PATCH /user/:id should reject props larger than 2kb", async () => {
    const email = `patch-too-big-${crypto.randomUUID()}@example.com`
    const createResp = await superApi.post('user', {
      json: { email },
      throwHttpErrors: false,
    })
    assertEquals(createResp.status, 200)
    const created = await createResp.json() as ApiEnvelope<Record<string, unknown>>
    const id = created.data.id as string

    const tooBigProps = { data: 'x'.repeat(3000) }
    const patchResp = await superApi.patch(`user/${id}`, {
      json: { props: tooBigProps },
      throwHttpErrors: false,
    })
    assertEquals(patchResp.status, 400)
  })

  it("GET /user/:id should include an ETag header", async () => {
    const resp = await superApi.get(`user/${superUser.id}`, {
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 200)
    assertExists(resp.headers.get('etag'))
  })

  it("GET /user/:id with If-None-Match should return 304 Not Modified", async () => {
    const first = await superApi.get(`user/${superUser.id}`, {
      throwHttpErrors: false,
    })
    assertEquals(first.status, 200)
    const etag = first.headers.get('etag')
    assertExists(etag)

    const second = await superApi.get(`user/${superUser.id}`, {
      headers: { 'If-None-Match': etag },
      throwHttpErrors: false,
    })
    assertEquals(second.status, 304)
  })
})
