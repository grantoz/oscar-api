import { encodeBase64 } from '@std/encoding/base64'
import { verifyAndDecodeJwt } from '@/middleware/jwt.ts'
import { assert } from '@std/assert'
import ky, { type KyInstance, KyResponse } from 'ky'
import { type SeededUser, seededUsers } from '../../prisma/seed/user.ts'

/**
 * Test utilities
 */

const port = Deno.env.get('PORT') || 8001 // test port

interface loginOutput {
  token: string
}

export interface TestUser extends SeededUser {
  id: string
  token: string
  refreshToken: string
}

export const testUsers: Record<string, TestUser> = {
  superUser: {
    ...seededUsers.superUser,
    id: '',
    token: '',
    refreshToken: '',
  },
  adminUser: {
    ...seededUsers.adminUser,
    id: '',
    token: '',
    refreshToken: '',
  },
  staffUser: {
    ...seededUsers.staffUser,
    id: '',
    token: '',
    refreshToken: '',
  },
  userUser: {
    ...seededUsers.userUser,
    id: '',
    token: '',
    refreshToken: '',
  },
}

// let superId: string
let superApi: KyInstance
let adminApi: KyInstance
let staffApi: KyInstance
let userApi: KyInstance

const apiUri = `http://localhost:${port}/api`
const authUri = `http://localhost:${port}/auth`

const api = ky.create({ prefix: apiUri })
const _auth = ky.create({ prefix: authUri })

const { superUser, adminUser, staffUser, userUser } = seededUsers

const loginApi = async (
  user: SeededUser,
  setTestUserId: (id: string) => void,
  setRefreshToken: (cookie: string) => void,
): Promise<KyInstance> => {
  const auth = encodeBase64(user.email + ':' + user.pass)
  const resp = await ky.post(`${authUri}/login`, {
    headers: {
      Authorization: 'Basic ' + auth,
    },
  })
  const respJson: loginOutput = await resp.json()
  assert(respJson)

  const decoded = await verifyAndDecodeJwt(respJson.token)
  assert(decoded.sub) // sub = id. Also, available: email, role, exp
  setTestUserId(decoded.sub)

  const cookie = resp.headers.get('set-cookie')
  assert(cookie)
  setRefreshToken(cookie.substring(8, cookie.indexOf(';')))

  return api.extend({
    headers: {
      Authorization: 'Bearer ' + respJson.token,
    },
  })
}

const asSuper = async (): Promise<KyInstance> => {
  if (superApi !== undefined) {
    return superApi
  }
  superApi = await loginApi(
    superUser,
    (id) => testUsers.superUser.id = id,
    (cookie) => testUsers.superUser.refreshToken = cookie,
  )
  return superApi
}

const asAdmin = async () => {
  if (adminApi !== undefined) {
    return adminApi
  }
  adminApi = await loginApi(
    adminUser,
    (id) => testUsers.adminUser.id = id,
    (cookie) => testUsers.adminUser.refreshToken = cookie,
  )
  return adminApi
}

const asStaff = async () => {
  if (staffApi !== undefined) {
    return staffApi
  }
  staffApi = await loginApi(
    staffUser,
    (id) => testUsers.staffUser.id = id,
    (cookie) => testUsers.staffUser.refreshToken = cookie,
  )
  return staffApi
}

const asUser = async () => {
  if (userApi !== undefined) {
    return userApi
  }
  userApi = await loginApi(
    userUser,
    (id) => testUsers.userUser.id = id,
    (cookie) => testUsers.userUser.refreshToken = cookie,
  )
  return userApi
}

const logHeaders = (resp: KyResponse<unknown>) => {
  Array.from(resp.headers.entries()).forEach(
    ([key, value]: [string, string]) => {
      console.log(key, value)
    },
  )
}

export { asAdmin, asStaff, asSuper, asUser, logHeaders }
