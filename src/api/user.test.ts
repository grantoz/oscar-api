// import { load } from "@std/dotenv";
import '@std/dotenv/load'
import { assert, assertEquals, assertExists } from '@std/assert'
import { before, describe, it } from 'node:test'
import { KyInstance } from 'ky'
import {
  asAdmin,
  asStaff,
  asSuper,
  asUser,
  logHeaders,
  type TestUser,
  testUsers,
} from '../util/test.ts'

interface loginOutput {
  token: string
}

interface ApiEnvelope<T> {
  data: T
  meta?: unknown
}

let superApi: KyInstance
let adminApi: KyInstance
let staffApi: KyInstance
let userApi: KyInstance
let superUser: TestUser
let staffUser: TestUser
let userUser: TestUser

const isUserView = (value: unknown) => {
  assert(typeof value === 'object' && value !== null)
  const u = value as Record<string, unknown>
  assert(typeof u.id === 'string')
  assert(typeof u.email === 'string')
  assert(typeof u.props === 'object' && u.props !== null)
  assert(u.hash === undefined)
}

describe('BDD-style tests', () => {
  before(async () => {
    superApi = await asSuper()
    adminApi = await asAdmin()
    ;({ superUser } = testUsers)
  })

  it('should return 400 for get requests with non-uuid :id path parameter', async () => {
    await superApi.get('user/xxxxxxx', {
      throwHttpErrors: false,
    }).then(async (resp) => {
      const text = await resp.text()
      console.log('raw error output:', text)
      assertEquals(400, resp.status)
      logHeaders(resp)
    })
  })

  it('GET /user should return 200 with an array of userView instances', async () => {
    const resp = await superApi.get('user', {
      throwHttpErrors: false,
    })
    const output = await resp.json() as ApiEnvelope<unknown[]>
    console.log(output)
    assertEquals(200, resp.status)
    assert(Array.isArray(output.data))
    output.data.forEach(isUserView)
    logHeaders(resp)
  })

  it('GET /user/:id should return 200 and a matching userView instance', async () => {
    console.log('superId', superUser.id)
    const resp = await superApi.get(`user/${superUser.id}`, {
      throwHttpErrors: false,
    })
    const output = await resp.json() as ApiEnvelope<Record<string, unknown>>
    console.log(output)
    assertEquals(200, resp.status)
    isUserView(output.data)
    assertEquals(output.data.id, superUser.id)
    assertEquals(output.data.email, superUser.email)
  })

  it('PATCH /user/:id should update unstructured props and return the updated user', async () => {
    const email = `patch-props-${crypto.randomUUID()}@example.com`
    const createResp = await superApi.post('user', {
      json: { email },
      throwHttpErrors: false,
    })
    assertEquals(createResp.status, 200)
    const created = await createResp.json() as ApiEnvelope<
      Record<string, unknown>
    >
    const id = created.data.id as string

    const props = { foo: 'bar', count: 42, nested: { arr: [1, 2, 3] } }
    const patchResp = await superApi.patch(`user/${id}`, {
      json: { props },
      throwHttpErrors: false,
    })
    assertEquals(patchResp.status, 200)
    const patched = await patchResp.json() as ApiEnvelope<
      Record<string, unknown>
    >
    assertEquals(patched.data.props, props)

    const getResp = await superApi.get(`user/${id}`, { throwHttpErrors: false })
    const fetched = await getResp.json() as ApiEnvelope<Record<string, unknown>>
    assertEquals(fetched.data.props, props)
  })

  it('PATCH /user/:id without props should preserve existing props', async () => {
    const email = `patch-preserve-${crypto.randomUUID()}@example.com`
    const props = { preserve: true }
    const createResp = await superApi.post('user', {
      json: { email },
      throwHttpErrors: false,
    })
    assertEquals(createResp.status, 200)
    const created = await createResp.json() as ApiEnvelope<
      Record<string, unknown>
    >
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
    const patched = await patchResp.json() as ApiEnvelope<
      Record<string, unknown>
    >
    assertEquals(patched.data.name, 'Updated Name')
    assertEquals(patched.data.props, props)
  })

  it('PATCH /user/:id should reject props larger than 2kb', async () => {
    const email = `patch-too-big-${crypto.randomUUID()}@example.com`
    const createResp = await superApi.post('user', {
      json: { email },
      throwHttpErrors: false,
    })
    assertEquals(createResp.status, 200)
    const created = await createResp.json() as ApiEnvelope<
      Record<string, unknown>
    >
    const id = created.data.id as string

    const tooBigProps = { data: 'x'.repeat(3000) }
    const patchResp = await superApi.patch(`user/${id}`, {
      json: { props: tooBigProps },
      throwHttpErrors: false,
    })
    assertEquals(patchResp.status, 400)
  })

  it('GET /user/:id should include an ETag header', async () => {
    const resp = await superApi.get(`user/${superUser.id}`, {
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 200)
    assertExists(resp.headers.get('etag'))
  })

  it('GET /user/:id with If-None-Match should return 304 Not Modified', async () => {
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

describe('user mutation authorization', () => {
  before(async () => {
    superApi = await asSuper()
    adminApi = await asAdmin()
    staffApi = await asStaff()
    userApi = await asUser()
    ;({ superUser, staffUser, userUser } = testUsers)
  })

  const uniqueEmail = () => `authz-${crypto.randomUUID()}@example.com`

  interface UserView {
    id: string
    role: string
  }

  const createUser = async (
    api: KyInstance,
    body: Record<string, unknown>,
  ) => {
    const resp = await api.post('user', {
      json: { email: uniqueEmail(), ...body },
      throwHttpErrors: false,
    })
    const output = await resp.json() as ApiEnvelope<UserView>
    return { resp, output }
  }

  it('staff can create a user record', async () => {
    const { resp, output } = await createUser(staffApi, {})
    assertEquals(resp.status, 200)
    assertEquals(output.data.role, 'user')
  })

  it('staff cannot create staff, admin or super records', async () => {
    for (const roleId of ['staff', 'admin', 'super']) {
      const { resp } = await createUser(staffApi, { roleId })
      assertEquals(resp.status, 403)
    }
  })

  it('admin can create admin, staff and user records', async () => {
    for (const roleId of ['admin', 'staff', 'user']) {
      const { resp, output } = await createUser(adminApi, { roleId })
      assertEquals(resp.status, 200)
      assertEquals(output.data.role, roleId)
    }
  })

  it('admin cannot create a super record', async () => {
    const { resp } = await createUser(adminApi, { roleId: 'super' })
    assertEquals(resp.status, 403)
  })

  it('super can create a super record', async () => {
    const { resp, output } = await createUser(superApi, { roleId: 'super' })
    assertEquals(resp.status, 200)
    assertEquals(output.data.role, 'super')
  })

  it('user cannot create records', async () => {
    for (const roleId of ['user', 'staff', 'admin', 'super']) {
      const { resp } = await createUser(userApi, { roleId })
      assertEquals(resp.status, 403)
    }
    const { resp } = await createUser(userApi, {})
    assertEquals(resp.status, 403)
  })

  it('user can edit their own record', async () => {
    const resp = await userApi.patch(`user/${userUser.id}`, {
      json: { name: 'Self Edited' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 200)
  })

  it('user cannot edit another record', async () => {
    const { output } = await createUser(superApi, {})
    const resp = await userApi.patch(`user/${output.data.id}`, {
      json: { name: 'Hacked' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 403)
  })

  it('user cannot elevate their own role', async () => {
    const resp = await userApi.patch(`user/${userUser.id}`, {
      json: { roleId: 'admin' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 403)
  })

  it('staff can edit their own record', async () => {
    const resp = await staffApi.patch(`user/${staffUser.id}`, {
      json: { name: 'Staff Self Edited' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 200)
  })

  it('staff cannot edit another record, even a user record', async () => {
    const { output } = await createUser(superApi, {})
    const resp = await staffApi.patch(`user/${output.data.id}`, {
      json: { name: 'Staff Edited' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 403)
  })

  it('staff cannot elevate their own role', async () => {
    const resp = await staffApi.patch(`user/${staffUser.id}`, {
      json: { roleId: 'admin' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 403)
  })

  it('admin cannot edit a super record', async () => {
    const resp = await adminApi.patch(`user/${superUser.id}`, {
      json: { name: 'Admin Edited Super' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 403)
  })

  it('admin can edit a staff record', async () => {
    const { output } = await createUser(superApi, { roleId: 'staff' })
    const resp = await adminApi.patch(`user/${output.data.id}`, {
      json: { name: 'Admin Edited Staff' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 200)
  })

  it('admin can promote a staff record to admin', async () => {
    const { output } = await createUser(superApi, { roleId: 'staff' })
    const resp = await adminApi.patch(`user/${output.data.id}`, {
      json: { roleId: 'admin' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 200)
    const patched = await resp.json() as ApiEnvelope<UserView>
    assertEquals(patched.data.role, 'admin')
  })

  it('admin cannot grant the super role', async () => {
    const { output } = await createUser(superApi, { roleId: 'staff' })
    const resp = await adminApi.patch(`user/${output.data.id}`, {
      json: { roleId: 'super' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 403)
  })

  it('super can grant the super role', async () => {
    const { output } = await createUser(superApi, {})
    const resp = await superApi.patch(`user/${output.data.id}`, {
      json: { roleId: 'super' },
      throwHttpErrors: false,
    })
    assertEquals(resp.status, 200)
    const patched = await resp.json() as ApiEnvelope<UserView>
    assertEquals(patched.data.role, 'super')
  })
})
